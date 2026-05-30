"""OAuth refresh-token → access-token. Pure builders/parsers + a thin adapter."""

from __future__ import annotations

import time
from dataclasses import dataclass

GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"


@dataclass(frozen=True)
class AccessToken:
    access_token: str
    expires_at: int


def build_refresh_body(*, refresh_token: str, client_id: str, client_secret: str) -> dict:
    return {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
    }


def parse_refresh_response(data: dict, *, now: int) -> AccessToken:
    if "error" in data:
        raise ValueError(f"refresh error: {data.get('error')}: {data.get('error_description')}")
    access = data.get("access_token")
    if not access:
        raise ValueError("no access_token in refresh response")
    return AccessToken(access_token=access, expires_at=now + int(data.get("expires_in", 0)))


def refresh_access_token(*, refresh_token: str, client_id: str, client_secret: str, http=None) -> AccessToken:
    import httpx

    client = http or httpx.Client(timeout=20)
    try:
        resp = client.post(
            GOOGLE_TOKEN_ENDPOINT,
            data=build_refresh_body(
                refresh_token=refresh_token, client_id=client_id, client_secret=client_secret
            ),
        )
        return parse_refresh_response(resp.json(), now=int(time.time()))
    finally:
        if http is None:
            client.close()
