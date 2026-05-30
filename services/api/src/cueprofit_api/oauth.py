"""Google OAuth helpers — pure, deterministic, easily testable.

The data-connection flow is a *confidential* server-side flow (client secret is
held by this API). State is a stateless, HMAC-signed token carrying the workspace
/ user / provider + an expiry, so the callback can be verified without a session.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
from urllib.parse import urlencode

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke"

ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords"
CONTENT_SCOPE = "https://www.googleapis.com/auth/content"


@dataclass(frozen=True)
class TokenSet:
    refresh_token: str
    access_token: str
    expires_at: int  # unix seconds


def build_authorization_url(
    *,
    client_id: str,
    redirect_uri: str,
    scopes: list[str],
    state: str,
    login_hint: str | None = None,
) -> str:
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",   # required to receive a refresh token
        "prompt": "consent",        # force a refresh token on every grant
        "include_granted_scopes": "true",
        "state": state,
    }
    if login_hint:
        params["login_hint"] = login_hint
    return f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}"


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign_state(payload: dict, secret: str, *, now: int, ttl: int = 600) -> str:
    """HMAC-SHA256 signed `<payload>.<sig>` token with an embedded expiry."""
    body = {**payload, "exp": now + ttl}
    encoded = _b64url(json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    sig = hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded}.{_b64url(sig)}"


def verify_state(token: str, secret: str, *, now: int) -> dict:
    parts = token.split(".")
    if len(parts) != 2:
        raise ValueError("malformed state")
    encoded, sig = parts
    expected = hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    try:
        provided = _b64url_decode(sig)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("malformed state signature") from exc
    if not hmac.compare_digest(expected, provided):
        raise ValueError("invalid state signature")
    try:
        payload = json.loads(_b64url_decode(encoded))
    except Exception as exc:  # noqa: BLE001
        raise ValueError("malformed state payload") from exc
    exp = payload.get("exp")
    if not isinstance(exp, int) or now > exp:
        raise ValueError("state expired")
    return payload


def build_token_exchange_body(
    *, code: str, client_id: str, client_secret: str, redirect_uri: str
) -> dict:
    return {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }


def parse_token_response(data: dict, *, now: int) -> TokenSet:
    if "error" in data:
        raise ValueError(
            f"token endpoint error: {data.get('error')}: {data.get('error_description')}"
        )
    refresh = data.get("refresh_token")
    access = data.get("access_token")
    if not refresh:
        raise ValueError("no refresh_token returned (offline access not granted)")
    if not access:
        raise ValueError("no access_token returned")
    return TokenSet(
        refresh_token=refresh,
        access_token=access,
        expires_at=now + int(data.get("expires_in", 0)),
    )
