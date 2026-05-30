import time
import uuid

import pytest
from fastapi.testclient import TestClient

from cueprofit_api import connect_api
from cueprofit_api.connections import FakeConnectionStore, FakeExchanger
from cueprofit_api.main import app
from cueprofit_api.oauth import TokenSet, sign_state
from cueprofit_api.settings import get_settings
from cueprofit_security import FakeCipher

STATE_SECRET = "statesecret"
WS = str(uuid.uuid4())
USER = str(uuid.uuid4())
AUTH = {"Authorization": "Bearer sekret"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("PYTHON_API_INTERNAL_TOKEN", "sekret")
    monkeypatch.setenv("OAUTH_STATE_SECRET", STATE_SECRET)
    monkeypatch.setenv("GOOGLE_ADS_OAUTH_CLIENT_ID", "cid")
    monkeypatch.setenv("GOOGLE_ADS_OAUTH_REDIRECT_URI", "https://app/cb")
    get_settings.cache_clear()
    yield TestClient(app)
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def _state(*, workspace_id=WS, user_id=USER, nonce="n1", provider="google_ads"):
    return sign_state(
        {"workspace_id": workspace_id, "user_id": user_id, "provider": provider, "nonce": nonce},
        STATE_SECRET,
        now=int(time.time()),
    )


# ── auth gate + start ──────────────────────────────────────────────────────
def test_start_requires_internal_token(client):
    r = client.post("/connect/google/start", json={"workspace_id": WS, "user_id": USER, "nonce": "n"})
    assert r.status_code == 401


def test_start_returns_offline_consent_url(client):
    r = client.post(
        "/connect/google/start",
        headers=AUTH,
        json={"workspace_id": WS, "user_id": USER, "nonce": "n1"},
    )
    assert r.status_code == 200
    url = r.json()["auth_url"]
    assert "access_type=offline" in url and "prompt=consent" in url


def test_start_rejects_non_uuid_ids(client):
    r = client.post(
        "/connect/google/start", headers=AUTH,
        json={"workspace_id": "not-a-uuid", "user_id": USER, "nonce": "n1"},
    )
    assert r.status_code == 422


# ── callback security (connection-CSRF protections) ────────────────────────
def test_callback_rejects_forged_state(client):
    r = client.post(
        "/connect/google/callback", headers=AUTH,
        json={"code": "x", "state": "garbage.sig", "caller_user_id": USER, "nonce": "n1"},
    )
    assert r.status_code == 400


def test_callback_rejects_nonce_mismatch(client):
    r = client.post(
        "/connect/google/callback", headers=AUTH,
        json={"code": "x", "state": _state(nonce="real"), "caller_user_id": USER, "nonce": "WRONG"},
    )
    assert r.status_code == 400


def test_callback_rejects_user_mismatch(client):
    r = client.post(
        "/connect/google/callback", headers=AUTH,
        json={"code": "x", "state": _state(user_id=USER), "caller_user_id": str(uuid.uuid4()), "nonce": "n1"},
    )
    assert r.status_code == 400


def test_callback_happy_path_persists_encrypted(client):
    store, cipher = FakeConnectionStore(), FakeCipher()
    exchanger = FakeExchanger(TokenSet(refresh_token="1//rt-secret", access_token="at", expires_at=1))
    app.dependency_overrides[connect_api.get_store] = lambda: store
    app.dependency_overrides[connect_api.get_cipher_factory] = lambda: (lambda: cipher)
    app.dependency_overrides[connect_api.get_exchanger] = lambda: exchanger
    app.dependency_overrides[connect_api.get_discoverer] = lambda: (
        lambda *, access_token, developer_token, **kw: ["123-456"]
    )

    r = client.post(
        "/connect/google/callback", headers=AUTH,
        json={"code": "authcode", "state": _state(nonce="n1"), "caller_user_id": USER, "nonce": "n1"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["connected"] == 1
    conns = store.list_connections(WS)
    assert len(conns) == 1 and conns[0]["external_account_id"] == "123-456"
    secret = store.secrets[conns[0]["id"]]
    assert b"1//rt-secret" not in secret["encrypted_refresh_token"]  # encrypted at rest


# ── list / delete authorization (IDOR fix) ─────────────────────────────────
def test_list_requires_membership(client):
    store = FakeConnectionStore()
    app.dependency_overrides[connect_api.get_store] = lambda: store
    assert client.get(f"/connect/connections?workspace_id={WS}&user_id={USER}", headers=AUTH).status_code == 403
    store.add_member(WS, USER)
    assert client.get(f"/connect/connections?workspace_id={WS}&user_id={USER}", headers=AUTH).status_code == 200


def test_delete_revokes_grant_then_deletes(client):
    store, cipher = FakeConnectionStore(), FakeCipher()
    store.add_member(WS, USER)
    cid = store.upsert_connection(
        workspace_id=WS, provider="google_ads", external_account_id="1",
        scopes=[], status="active", connected_by=USER,
    )
    enc = cipher.encrypt("1//rt-secret")
    store.store_secret(connection_id=cid, workspace_id=WS, encrypted_refresh_token=enc.ciphertext, kms_key_version=enc.key_version)
    revoked: list[str] = []
    app.dependency_overrides[connect_api.get_store] = lambda: store
    app.dependency_overrides[connect_api.get_cipher_factory] = lambda: (lambda: cipher)
    app.dependency_overrides[connect_api.get_revoker] = lambda: (lambda token, **kw: revoked.append(token) or True)

    r = client.delete(f"/connect/connections/{cid}?workspace_id={WS}&user_id={USER}", headers=AUTH)
    assert r.status_code == 200, r.text
    assert revoked == ["1//rt-secret"]  # revoked with the DECRYPTED token, before delete
    assert store.list_connections(WS) == []


def test_delete_requires_membership(client):
    store = FakeConnectionStore()
    app.dependency_overrides[connect_api.get_store] = lambda: store
    cid = str(uuid.uuid4())
    r = client.delete(f"/connect/connections/{cid}?workspace_id={WS}&user_id={USER}", headers=AUTH)
    assert r.status_code == 403
