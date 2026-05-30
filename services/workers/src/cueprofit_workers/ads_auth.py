"""Google Ads login-customer-id resolution and resilient sync helpers."""

from __future__ import annotations

import logging
from typing import Any

from google_clients.ads_client import GoogleAdsClient

from cueprofit_workers.settings import Settings
from cueprofit_workers.sync_ads import sync_google_ads

log = logging.getLogger("cueprofit.workers.ads_auth")


def resolve_login_customer_id(
    *,
    external_account_id: str,
    connection_login: str | None,
    global_login: str | None,
) -> str | None:
    """Pick login-customer-id for a target customer."""
    if connection_login:
        return str(connection_login).replace("-", "")
    mcc = (global_login or "").replace("-", "")
    if not mcc:
        return None
    return mcc


def is_manager_only_account(*, external_account_id: str, global_login: str | None) -> bool:
    """Manager (MCC) IDs cannot return performance metrics — skip them."""
    mcc = (global_login or "").replace("-", "")
    cid = str(external_account_id).replace("-", "")
    return bool(mcc and cid == mcc)


def sync_google_ads_connection(
    *,
    store,
    settings: Settings,
    cipher,
    workspace_id: str,
    conn: dict[str, Any],
    kind: str,
    today,
) -> dict[str, Any]:
    """Sync one Ads connection, retrying without MCC header on permission errors."""
    from cueprofit_security import EncryptedToken

    secret = store.get_connection_secret(connection_id=conn["id"], workspace_id=workspace_id)
    if not secret:
        raise RuntimeError(f"missing oauth secret for connection {conn['id']}")

    refresh_token = cipher.decrypt(EncryptedToken(*secret))
    customer_id = conn["external_account_id"]
    if is_manager_only_account(
        external_account_id=customer_id,
        global_login=settings.google_ads_login_customer_id or None,
    ):
        log.info("skipping manager account %s (metrics live on client accounts)", customer_id)
        return {"skipped": True, "reason": "manager_account", "customer_id": customer_id}

    login_id = resolve_login_customer_id(
        external_account_id=customer_id,
        connection_login=conn.get("login_customer_id"),
        global_login=settings.google_ads_login_customer_id or None,
    )

    attempts: list[str | None] = [login_id]
    if login_id is not None:
        attempts.append(None)

    last_exc: Exception | None = None
    for attempt_login in attempts:
        try:
            ads = GoogleAdsClient(
                developer_token=settings.google_ads_developer_token,
                client_id=settings.google_ads_oauth_client_id,
                client_secret=settings.google_ads_oauth_client_secret,
                refresh_token=refresh_token,
                login_customer_id=attempt_login,
            )
            return sync_google_ads(
                store=store,
                ads_client=ads,
                workspace_id=workspace_id,
                customer_id=customer_id,
                kind=kind,
                connection_id=conn["id"],
                today=today,
            )
        except Exception as exc:  # noqa: BLE001 — try fallback login header
            last_exc = exc
            if attempt_login is None:
                break
            if "USER_PERMISSION_DENIED" not in str(exc) and "PERMISSION_DENIED" not in str(exc):
                break
            log.warning(
                "ads sync permission denied customer=%s login=%s; retrying without MCC header",
                customer_id,
                attempt_login,
            )

    assert last_exc is not None
    raise last_exc
