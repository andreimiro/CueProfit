from urllib.parse import parse_qs, urlparse

import pytest

from cueprofit_api.oauth import (
    GOOGLE_AUTH_ENDPOINT,
    TokenSet,
    build_authorization_url,
    build_token_exchange_body,
    parse_token_response,
    sign_state,
    verify_state,
)

ADWORDS = "https://www.googleapis.com/auth/adwords"
CONTENT = "https://www.googleapis.com/auth/content"


def test_authorization_url_forces_offline_consent_and_scopes():
    url = build_authorization_url(
        client_id="cid.apps.googleusercontent.com",
        redirect_uri="https://app.example.com/api/connect/google/callback",
        scopes=[ADWORDS, CONTENT],
        state="STATE123",
    )
    assert url.startswith(GOOGLE_AUTH_ENDPOINT)
    q = parse_qs(urlparse(url).query)
    assert q["response_type"] == ["code"]
    assert q["access_type"] == ["offline"]      # required for a refresh token
    assert q["prompt"] == ["consent"]           # forces a refresh token every time
    assert q["client_id"] == ["cid.apps.googleusercontent.com"]
    assert q["redirect_uri"] == ["https://app.example.com/api/connect/google/callback"]
    assert q["state"] == ["STATE123"]
    assert q["scope"] == [f"{ADWORDS} {CONTENT}"]


def test_state_round_trip():
    tok = sign_state({"workspace_id": "ws1", "user_id": "u1", "provider": "google_ads"}, "secret", now=1000, ttl=600)
    payload = verify_state(tok, "secret", now=1100)
    assert payload["workspace_id"] == "ws1"
    assert payload["user_id"] == "u1"
    assert payload["provider"] == "google_ads"


def test_state_rejects_tampering():
    tok = sign_state({"workspace_id": "ws1"}, "secret", now=1000)
    bad = ("A" if tok[0] != "A" else "B") + tok[1:]
    with pytest.raises(ValueError):
        verify_state(bad, "secret", now=1000)


def test_state_rejects_wrong_secret():
    tok = sign_state({"workspace_id": "ws1"}, "secretA", now=1000)
    with pytest.raises(ValueError):
        verify_state(tok, "secretB", now=1000)


def test_state_rejects_expired():
    tok = sign_state({"workspace_id": "ws1"}, "s", now=1000, ttl=600)
    with pytest.raises(ValueError):
        verify_state(tok, "s", now=1601)  # past 1000 + 600


def test_token_exchange_body():
    body = build_token_exchange_body(
        code="abc", client_id="cid", client_secret="sec", redirect_uri="https://r/cb"
    )
    assert body["grant_type"] == "authorization_code"
    assert body["code"] == "abc"
    assert body["client_id"] == "cid"
    assert body["client_secret"] == "sec"
    assert body["redirect_uri"] == "https://r/cb"


def test_parse_token_response_ok():
    ts = parse_token_response(
        {"access_token": "at", "refresh_token": "rt", "expires_in": 3599, "token_type": "Bearer"},
        now=1000,
    )
    assert isinstance(ts, TokenSet)
    assert ts.refresh_token == "rt"
    assert ts.access_token == "at"
    assert ts.expires_at == 1000 + 3599


def test_parse_token_response_error_raises():
    with pytest.raises(ValueError):
        parse_token_response({"error": "invalid_grant", "error_description": "bad"}, now=1000)


def test_parse_token_response_missing_refresh_raises():
    # We force prompt=consent, so a missing refresh_token means offline access failed.
    with pytest.raises(ValueError):
        parse_token_response({"access_token": "at", "expires_in": 3599}, now=1000)
