from unittest.mock import MagicMock, patch

from cueprofit_api.connections import (
    FakeConnectionStore,
    FakeExchanger,
    discover_merchant_accounts,
    persist_connection,
    store_google_connection,
)
from cueprofit_api.oauth import TokenSet
from cueprofit_security import EncryptedToken, FakeCipher


def test_persist_connection_encrypts_refresh_token_at_rest():
    store = FakeConnectionStore()
    cipher = FakeCipher()
    ts = TokenSet(refresh_token="1//super-secret-refresh", access_token="at", expires_at=123)

    res = persist_connection(
        store=store,
        cipher=cipher,
        token_set=ts,
        workspace_id="ws1",
        user_id="u1",
        provider="google_ads",
        external_account_id="123-456-7890",
        scopes=["https://www.googleapis.com/auth/adwords"],
    )

    saved = store.connections[res.connection_id]
    assert saved["external_account_id"] == "123-456-7890"
    assert saved["status"] == "active"
    assert saved["connected_by"] == "u1"
    assert saved["provider"] == "google_ads"

    secret = store.secrets[res.connection_id]
    # The refresh token must NEVER be stored verbatim.
    assert b"1//super-secret-refresh" not in secret["encrypted_refresh_token"]
    # ...but must round-trip via the cipher.
    decrypted = cipher.decrypt(
        EncryptedToken(secret["encrypted_refresh_token"], secret["kms_key_version"])
    )
    assert decrypted == "1//super-secret-refresh"


def test_store_google_connection_orchestrates_exchange_then_persist():
    store = FakeConnectionStore()
    cipher = FakeCipher()
    exchanger = FakeExchanger(TokenSet(refresh_token="rt", access_token="at", expires_at=999))

    res = store_google_connection(
        store=store,
        cipher=cipher,
        exchanger=exchanger,
        code="authcode",
        redirect_uri="https://app/cb",
        client_id="cid",
        client_secret="sec",
        workspace_id="ws1",
        user_id="u1",
        provider="google_ads",
        external_account_id="111",
        scopes=["https://www.googleapis.com/auth/adwords"],
    )

    assert exchanger.last["code"] == "authcode"
    assert exchanger.last["redirect_uri"] == "https://app/cb"
    assert res.connection_id in store.connections


def test_list_and_delete_connection():
    store = FakeConnectionStore()
    cid = store.upsert_connection(
        workspace_id="ws1", provider="google_ads", external_account_id="1",
        scopes=[], status="active", connected_by="u1",
    )
    assert any(c["id"] == cid for c in store.list_connections("ws1"))
    assert store.delete_connection(connection_id=cid, workspace_id="ws1") is True
    assert store.list_connections("ws1") == []
    # deleting someone else's / unknown returns False
    assert store.delete_connection(connection_id="nope", workspace_id="ws1") is False


def test_discover_merchant_accounts_falls_back_to_content_authinfo():
    merchant_resp = MagicMock(status_code=401)
    merchant_resp.raise_for_status.side_effect = __import__("httpx").HTTPStatusError(
        "401", request=MagicMock(), response=merchant_resp
    )
    authinfo_resp = MagicMock()
    authinfo_resp.raise_for_status.return_value = None
    authinfo_resp.json.return_value = {
        "accountIdentifiers": [{"merchantId": "123456789"}, {"aggregatorId": "999"}],
    }

    with patch("httpx.get", side_effect=[merchant_resp, authinfo_resp]) as get:
        ids = discover_merchant_accounts(access_token="at")

    assert ids == ["123456789", "999"]
    assert get.call_count == 2
    assert "accounts/authinfo" in get.call_args_list[1].args[0]
