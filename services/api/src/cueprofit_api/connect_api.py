"""Data-connection endpoints. Internal-only: the Next.js BFF authenticates the
user (Supabase), then calls these with the shared internal token, the verified
caller user id, and a per-flow nonce (bound into the signed OAuth state)."""

from __future__ import annotations

import hmac
import time
import uuid
from collections.abc import Callable
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from cueprofit_api.connections import (
    ConnectionStore,
    HttpxExchanger,
    OAuthExchanger,
    SupabaseConnectionStore,
    discover_google_ads_customers,
    discover_merchant_accounts,
    persist_connection,
    revoke_google_token,
)
from cueprofit_api.oauth import (
    ADWORDS_SCOPE,
    CONTENT_SCOPE,
    build_authorization_url,
    sign_state,
    verify_state,
)
from cueprofit_api.settings import Settings, get_settings
from cueprofit_api.worker_trigger import enqueue_workspace_sync
from cueprofit_security import EncryptedToken

ADS_SCOPES = [ADWORDS_SCOPE]
MERCHANT_SCOPES = [CONTENT_SCOPE]


def require_internal(authorization: str | None = Header(default=None)) -> None:
    token = get_settings().python_api_internal_token
    if not token or not authorization or not hmac.compare_digest(authorization, f"Bearer {token}"):
        raise HTTPException(status_code=401, detail="unauthorized")


def _build_cipher(settings: Settings):
    if settings.kms_key_name:
        from cueprofit_security import get_kms_cipher

        return get_kms_cipher(settings.kms_key_name)
    if settings.app_env == "development":
        from cueprofit_security import FakeCipher

        return FakeCipher()
    raise RuntimeError("KMS_KEY_NAME is required outside development")


# ── Injectable dependencies (overridden with fakes in tests) ───────────────
def get_store(settings: Settings = Depends(get_settings)) -> ConnectionStore:
    return SupabaseConnectionStore(
        base_url=settings.supabase_url, service_role_key=settings.supabase_service_role_key
    )


def get_cipher_factory(settings: Settings = Depends(get_settings)) -> Callable[[], Any]:
    return lambda: _build_cipher(settings)


def get_exchanger() -> OAuthExchanger:
    return HttpxExchanger()


def get_ads_discoverer() -> Callable[..., list[str]]:
    return discover_google_ads_customers


def get_merchant_discoverer() -> Callable[..., list[str]]:
    return discover_merchant_accounts


def get_revoker() -> Callable[..., bool]:
    return revoke_google_token


router = APIRouter(prefix="/connect", dependencies=[Depends(require_internal)])


class StartReq(BaseModel):
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    nonce: str
    provider: Literal["google_ads", "merchant_center"] = "google_ads"
    login_hint: str | None = None


class CallbackReq(BaseModel):
    code: str
    state: str
    caller_user_id: uuid.UUID
    nonce: str


def _oauth_start(
    *,
    req: StartReq,
    settings: Settings,
    scopes: list[str],
    redirect_uri: str,
) -> dict:
    state = sign_state(
        {
            "workspace_id": str(req.workspace_id),
            "user_id": str(req.user_id),
            "provider": req.provider,
            "nonce": req.nonce,
        },
        settings.state_secret,
        now=int(time.time()),
    )
    return {
        "auth_url": build_authorization_url(
            client_id=settings.google_ads_oauth_client_id,
            redirect_uri=redirect_uri,
            scopes=scopes,
            state=state,
            login_hint=req.login_hint,
        )
    }


def _oauth_callback(
    *,
    req: CallbackReq,
    settings: Settings,
    expected_provider: str,
    redirect_uri: str,
    store: ConnectionStore,
    cipher_factory: Callable[[], Any],
    exchanger: OAuthExchanger,
    discoverer: Callable[..., list[str]],
    scopes: list[str],
    discover_kwargs: dict | None = None,
) -> dict:
    try:
        payload = verify_state(req.state, settings.state_secret, now=int(time.time()))
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid state") from None

    if payload.get("nonce") != req.nonce or payload.get("user_id") != str(req.caller_user_id):
        raise HTTPException(status_code=400, detail="state/session mismatch")

    try:
        workspace_id = str(uuid.UUID(payload["workspace_id"]))
        user_id = str(uuid.UUID(payload["user_id"]))
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="invalid state payload") from None
    if payload.get("provider") != expected_provider:
        raise HTTPException(status_code=400, detail="unsupported provider")

    try:
        token_set = exchanger.exchange(
            code=req.code,
            client_id=settings.google_ads_oauth_client_id,
            client_secret=settings.google_ads_oauth_client_secret,
            redirect_uri=redirect_uri,
        )
        kwargs = {"access_token": token_set.access_token, **(discover_kwargs or {})}
        accounts = discoverer(**kwargs)
    except Exception:  # noqa: BLE001 - never surface token/error internals
        raise HTTPException(status_code=502, detail="failed to complete Google connection") from None

    if not accounts:
        raise HTTPException(status_code=502, detail="no accessible accounts found")

    cipher = cipher_factory()
    results = [
        persist_connection(
            store=store,
            cipher=cipher,
            token_set=token_set,
            workspace_id=workspace_id,
            user_id=user_id,
            provider=expected_provider,
            external_account_id=acct,
            scopes=scopes,
        )
        for acct in accounts
    ]
    sync_mode = "initial" if expected_provider == "google_ads" else "daily"
    try:
        enqueue_workspace_sync(workspace_id, mode=sync_mode)
    except Exception:  # noqa: BLE001 - never fail OAuth on queue errors
        pass
    return {"connected": len(results), "connection_ids": [r.connection_id for r in results]}


@router.post("/google/start")
def google_start(req: StartReq, settings: Settings = Depends(get_settings)) -> dict:
    if req.provider != "google_ads":
        raise HTTPException(status_code=400, detail="unsupported provider")
    return _oauth_start(
        req=req,
        settings=settings,
        scopes=ADS_SCOPES,
        redirect_uri=settings.google_ads_oauth_redirect_uri,
    )


@router.post("/google/callback")
def google_callback(
    req: CallbackReq,
    settings: Settings = Depends(get_settings),
    store: ConnectionStore = Depends(get_store),
    cipher_factory: Callable[[], Any] = Depends(get_cipher_factory),
    exchanger: OAuthExchanger = Depends(get_exchanger),
    discoverer: Callable[..., list[str]] = Depends(get_ads_discoverer),
) -> dict:
    return _oauth_callback(
        req=req,
        settings=settings,
        expected_provider="google_ads",
        redirect_uri=settings.google_ads_oauth_redirect_uri,
        store=store,
        cipher_factory=cipher_factory,
        exchanger=exchanger,
        discoverer=discoverer,
        scopes=ADS_SCOPES,
        discover_kwargs={"developer_token": settings.google_ads_developer_token},
    )


@router.post("/merchant/start")
def merchant_start(req: StartReq, settings: Settings = Depends(get_settings)) -> dict:
    if req.provider != "merchant_center":
        raise HTTPException(status_code=400, detail="unsupported provider")
    redirect_uri = settings.merchant_oauth_redirect_uri
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="merchant redirect uri not configured")
    return _oauth_start(
        req=req,
        settings=settings,
        scopes=MERCHANT_SCOPES,
        redirect_uri=redirect_uri,
    )


@router.post("/merchant/callback")
def merchant_callback(
    req: CallbackReq,
    settings: Settings = Depends(get_settings),
    store: ConnectionStore = Depends(get_store),
    cipher_factory: Callable[[], Any] = Depends(get_cipher_factory),
    exchanger: OAuthExchanger = Depends(get_exchanger),
    discoverer: Callable[..., list[str]] = Depends(get_merchant_discoverer),
) -> dict:
    redirect_uri = settings.merchant_oauth_redirect_uri
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="merchant redirect uri not configured")
    return _oauth_callback(
        req=req,
        settings=settings,
        expected_provider="merchant_center",
        redirect_uri=redirect_uri,
        store=store,
        cipher_factory=cipher_factory,
        exchanger=exchanger,
        discoverer=discoverer,
        scopes=MERCHANT_SCOPES,
    )


@router.get("/connections")
def list_connections(
    workspace_id: uuid.UUID, user_id: uuid.UUID, store: ConnectionStore = Depends(get_store)
) -> dict:
    if not store.is_member(workspace_id=str(workspace_id), user_id=str(user_id)):
        raise HTTPException(status_code=403, detail="forbidden")
    return {"connections": store.list_connections(str(workspace_id))}


@router.delete("/connections/{connection_id}")
def delete_connection(
    connection_id: uuid.UUID,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    store: ConnectionStore = Depends(get_store),
    cipher_factory: Callable[[], Any] = Depends(get_cipher_factory),
    revoker: Callable[..., bool] = Depends(get_revoker),
) -> dict:
    ws, uid, cid = str(workspace_id), str(user_id), str(connection_id)
    if not store.is_member(workspace_id=ws, user_id=uid):
        raise HTTPException(status_code=403, detail="forbidden")

    secret = store.get_secret(connection_id=cid, workspace_id=ws)
    if secret is not None:
        ciphertext, key_version = secret
        try:
            revoker(cipher_factory().decrypt(EncryptedToken(ciphertext, key_version)))
        except Exception:  # noqa: BLE001 - never block deletion on revoke failure
            pass

    if not store.delete_connection(connection_id=cid, workspace_id=ws):
        raise HTTPException(status_code=404, detail="connection not found")
    return {"deleted": True}
