"""Connection persistence: exchange a code, encrypt the refresh token, store it.

The pure orchestration (`persist_connection` / `store_google_connection`) is
injected with a store, a cipher, and an exchanger so it can be unit-tested with
fakes. Real adapters (httpx token exchange, Supabase REST store, Google Ads
customer discovery) live at the bottom and are exercised in integration.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Protocol

from cueprofit_api.oauth import (
    GOOGLE_TOKEN_ENDPOINT,
    TokenSet,
    build_token_exchange_body,
    parse_token_response,
)


@dataclass(frozen=True)
class ConnectionResult:
    connection_id: str
    provider: str
    external_account_id: str


class ConnectionStore(Protocol):
    def is_member(self, *, workspace_id: str, user_id: str) -> bool: ...
    def upsert_connection(
        self, *, workspace_id: str, provider: str, external_account_id: str,
        scopes: list[str], status: str, connected_by: str,
    ) -> str: ...
    def store_secret(
        self, *, connection_id: str, workspace_id: str,
        encrypted_refresh_token: bytes, kms_key_version: str,
    ) -> None: ...
    def get_secret(
        self, *, connection_id: str, workspace_id: str
    ) -> tuple[bytes, str] | None: ...
    def list_connections(self, workspace_id: str) -> list[dict]: ...
    def delete_connection(self, *, connection_id: str, workspace_id: str) -> bool: ...


class OAuthExchanger(Protocol):
    def exchange(
        self, *, code: str, client_id: str, client_secret: str, redirect_uri: str
    ) -> TokenSet: ...


def persist_connection(
    *, store: ConnectionStore, cipher, token_set: TokenSet, workspace_id: str,
    user_id: str, provider: str, external_account_id: str, scopes: list[str],
) -> ConnectionResult:
    """Encrypt the refresh token and write the connection + secret rows."""
    enc = cipher.encrypt(token_set.refresh_token)
    connection_id = store.upsert_connection(
        workspace_id=workspace_id,
        provider=provider,
        external_account_id=external_account_id,
        scopes=scopes,
        status="active",
        connected_by=user_id,
    )
    store.store_secret(
        connection_id=connection_id,
        workspace_id=workspace_id,
        encrypted_refresh_token=enc.ciphertext,
        kms_key_version=enc.key_version,
    )
    return ConnectionResult(connection_id, provider, external_account_id)


def store_google_connection(
    *, store: ConnectionStore, cipher, exchanger: OAuthExchanger, code: str,
    redirect_uri: str, client_id: str, client_secret: str, workspace_id: str,
    user_id: str, provider: str, external_account_id: str, scopes: list[str],
) -> ConnectionResult:
    token_set = exchanger.exchange(
        code=code, client_id=client_id, client_secret=client_secret, redirect_uri=redirect_uri
    )
    return persist_connection(
        store=store, cipher=cipher, token_set=token_set, workspace_id=workspace_id,
        user_id=user_id, provider=provider, external_account_id=external_account_id, scopes=scopes,
    )


# ── Test/dev fakes ─────────────────────────────────────────────────────────
class FakeConnectionStore:
    def __init__(self) -> None:
        self.connections: dict[str, dict] = {}
        self.secrets: dict[str, dict] = {}
        self.members: set[tuple[str, str]] = set()
        self._n = 0

    def add_member(self, workspace_id: str, user_id: str) -> None:
        self.members.add((workspace_id, user_id))

    def is_member(self, *, workspace_id, user_id) -> bool:
        return (workspace_id, user_id) in self.members

    def get_secret(self, *, connection_id, workspace_id):
        s = self.secrets.get(connection_id)
        if not s or s["workspace_id"] != workspace_id:
            return None
        return s["encrypted_refresh_token"], s["kms_key_version"]

    def upsert_connection(self, *, workspace_id, provider, external_account_id, scopes, status, connected_by) -> str:
        for cid, c in self.connections.items():
            if (c["workspace_id"], c["provider"], c["external_account_id"]) == (
                workspace_id, provider, external_account_id
            ):
                c.update(scopes=list(scopes), status=status, connected_by=connected_by)
                return cid
        cid = str(uuid.uuid4())
        self.connections[cid] = {
            "id": cid, "workspace_id": workspace_id, "provider": provider,
            "external_account_id": external_account_id, "scopes": list(scopes),
            "status": status, "connected_by": connected_by,
        }
        return cid

    def store_secret(self, *, connection_id, workspace_id, encrypted_refresh_token, kms_key_version) -> None:
        self.secrets[connection_id] = {
            "workspace_id": workspace_id,
            "encrypted_refresh_token": encrypted_refresh_token,
            "kms_key_version": kms_key_version,
        }

    def list_connections(self, workspace_id) -> list[dict]:
        return [c for c in self.connections.values() if c["workspace_id"] == workspace_id]

    def delete_connection(self, *, connection_id, workspace_id) -> bool:
        c = self.connections.get(connection_id)
        if not c or c["workspace_id"] != workspace_id:
            return False
        del self.connections[connection_id]
        self.secrets.pop(connection_id, None)
        return True


class FakeExchanger:
    def __init__(self, token_set: TokenSet) -> None:
        self._ts = token_set
        self.last: dict | None = None

    def exchange(self, *, code, client_id, client_secret, redirect_uri) -> TokenSet:
        self.last = {
            "code": code, "client_id": client_id,
            "client_secret": client_secret, "redirect_uri": redirect_uri,
        }
        return self._ts


# ── Real adapters (integration; need live credentials) ─────────────────────
class HttpxExchanger:
    """Exchanges an auth code at Google's token endpoint."""

    def __init__(self, http=None):
        self._http = http  # an httpx.Client; lazily created if None

    def exchange(self, *, code, client_id, client_secret, redirect_uri) -> TokenSet:
        import httpx

        client = self._http or httpx.Client(timeout=20)
        try:
            resp = client.post(
                GOOGLE_TOKEN_ENDPOINT,
                data=build_token_exchange_body(
                    code=code, client_id=client_id, client_secret=client_secret, redirect_uri=redirect_uri
                ),
            )
            return parse_token_response(resp.json(), now=int(time.time()))
        finally:
            if self._http is None:
                client.close()


def discover_google_ads_customers(*, access_token: str, developer_token: str, api_version: str = "v18") -> list[str]:
    """List the Google Ads customer IDs the granted token can access.

    NOTE: verify `api_version` against the pinned google-ads release.
    """
    import httpx

    url = f"https://googleads.googleapis.com/{api_version}/customers:listAccessibleCustomers"
    resp = httpx.get(
        url,
        headers={"Authorization": f"Bearer {access_token}", "developer-token": developer_token},
        timeout=20,
    )
    resp.raise_for_status()
    names = resp.json().get("resourceNames", [])
    return [n.split("/", 1)[1] for n in names if "/" in n]


def revoke_google_token(refresh_token: str, *, http=None) -> bool:
    """Best-effort revoke of a Google grant. Returns True if revoked or already
    invalid; False on a transient failure (caller still proceeds with deletion)."""
    import httpx

    from cueprofit_api.oauth import GOOGLE_REVOKE_ENDPOINT

    client = http or httpx.Client(timeout=15)
    try:
        resp = client.post(GOOGLE_REVOKE_ENDPOINT, data={"token": refresh_token})
        # 200 = revoked; 400 = already-invalid/expired token (effectively revoked).
        return resp.status_code in (200, 400)
    except Exception:  # noqa: BLE001 - transient network error
        return False
    finally:
        if http is None:
            client.close()


class SupabaseConnectionStore:
    """ConnectionStore backed by Supabase REST (PostgREST) with the service-role key.

    Bypasses RLS — callers MUST scope every operation by workspace_id, which the
    methods here do.
    """

    def __init__(self, *, base_url: str, service_role_key: str, http=None):
        self._rest = f"{base_url.rstrip('/')}/rest/v1"
        self._key = service_role_key
        self._http = http

    def _client(self):
        import httpx

        return self._http or httpx.Client(
            timeout=20,
            headers={
                "apikey": self._key,
                "Authorization": f"Bearer {self._key}",
                "Content-Type": "application/json",
            },
        )

    def is_member(self, *, workspace_id, user_id) -> bool:
        client = self._client()
        try:
            resp = client.get(
                f"{self._rest}/workspace_members",
                params={
                    "workspace_id": f"eq.{workspace_id}",
                    "user_id": f"eq.{user_id}",
                    "select": "workspace_id",
                    "limit": "1",
                },
            )
            resp.raise_for_status()
            return len(resp.json()) > 0
        finally:
            if self._http is None:
                client.close()

    def get_secret(self, *, connection_id, workspace_id):
        client = self._client()
        try:
            resp = client.get(
                f"{self._rest}/oauth_secrets",
                params={
                    "connection_id": f"eq.{connection_id}",
                    "workspace_id": f"eq.{workspace_id}",
                    "select": "encrypted_refresh_token,kms_key_version",
                },
            )
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                return None
            hex_str = rows[0]["encrypted_refresh_token"]
            raw = bytes.fromhex(hex_str[2:]) if hex_str.startswith("\\x") else bytes.fromhex(hex_str)
            return raw, rows[0]["kms_key_version"]
        finally:
            if self._http is None:
                client.close()

    def upsert_connection(self, *, workspace_id, provider, external_account_id, scopes, status, connected_by) -> str:
        client = self._client()
        try:
            resp = client.post(
                f"{self._rest}/oauth_connections",
                params={"on_conflict": "workspace_id,provider,external_account_id"},
                headers={"Prefer": "resolution=merge-duplicates,return=representation"},
                json={
                    "workspace_id": workspace_id, "provider": provider,
                    "external_account_id": external_account_id, "scopes": list(scopes),
                    "status": status, "connected_by": connected_by,
                },
            )
            resp.raise_for_status()
            return resp.json()[0]["id"]
        finally:
            if self._http is None:
                client.close()

    def store_secret(self, *, connection_id, workspace_id, encrypted_refresh_token, kms_key_version) -> None:
        client = self._client()
        try:
            client.post(
                f"{self._rest}/oauth_secrets",
                params={"on_conflict": "connection_id"},
                headers={"Prefer": "resolution=merge-duplicates"},
                json={
                    "connection_id": connection_id, "workspace_id": workspace_id,
                    # bytea over PostgREST: hex-escaped string
                    "encrypted_refresh_token": "\\x" + encrypted_refresh_token.hex(),
                    "kms_key_version": kms_key_version,
                },
            ).raise_for_status()
        finally:
            if self._http is None:
                client.close()

    def list_connections(self, workspace_id) -> list[dict]:
        client = self._client()
        try:
            resp = client.get(
                f"{self._rest}/oauth_connections",
                params={
                    "workspace_id": f"eq.{workspace_id}",
                    "select": "id,provider,external_account_id,status,scopes,last_synced_at,created_at",
                },
            )
            resp.raise_for_status()
            return resp.json()
        finally:
            if self._http is None:
                client.close()

    def delete_connection(self, *, connection_id, workspace_id) -> bool:
        client = self._client()
        try:
            resp = client.delete(
                f"{self._rest}/oauth_connections",
                params={"id": f"eq.{connection_id}", "workspace_id": f"eq.{workspace_id}"},
                headers={"Prefer": "return=representation"},
            )
            resp.raise_for_status()
            return len(resp.json()) > 0
        finally:
            if self._http is None:
                client.close()
