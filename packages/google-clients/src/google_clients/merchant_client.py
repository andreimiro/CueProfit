"""Merchant API client — lists processed catalog products via REST.

Uses OAuth bearer tokens (refreshed by the worker). Lazy-imports httpx so pure
mapper tests do not require it.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

PRODUCTS_BASE = "https://merchantapi.googleapis.com/products/v1"
CONTENT_BASE = "https://shoppingcontent.googleapis.com/content/v2.1"


class MerchantClient:
    def __init__(self, *, access_token: str, http=None):
        self._access_token = access_token
        self._http = http

    def _client(self):
        import httpx

        return self._http or httpx.Client(
            timeout=60,
            headers={"Authorization": f"Bearer {self._access_token}"},
        )

    def list_products(self, merchant_id: str | int) -> Iterator[dict[str, Any]]:
        """Yield raw product JSON for one Merchant Center account.

        Prefers Merchant API; falls back to Content API when the project is not
        yet registered for Merchant API (401/403 on the first page).
        """
        try:
            yield from self._list_products_merchant_api(merchant_id)
        except _MerchantApiUnavailable:
            yield from self._list_products_content_api(merchant_id)

    def _list_products_merchant_api(self, merchant_id: str | int) -> Iterator[dict[str, Any]]:
        parent = f"accounts/{str(merchant_id).replace('-', '')}"
        page_token: str | None = None
        client = self._client()
        own_client = self._http is None
        first_page = True
        try:
            while True:
                params: dict[str, str | int] = {"pageSize": 250}
                if page_token:
                    params["pageToken"] = page_token
                resp = client.get(f"{PRODUCTS_BASE}/{parent}/products", params=params)
                if first_page and resp.status_code in (401, 403):
                    raise _MerchantApiUnavailable
                resp.raise_for_status()
                first_page = False
                data = resp.json()
                yield from data.get("products", [])
                page_token = data.get("nextPageToken")
                if not page_token:
                    break
        finally:
            if own_client:
                client.close()

    def _list_products_content_api(self, merchant_id: str | int) -> Iterator[dict[str, Any]]:
        mid = str(merchant_id).replace("-", "")
        page_token: str | None = None
        client = self._client()
        own_client = self._http is None
        try:
            while True:
                params: dict[str, str | int] = {"maxResults": 250}
                if page_token:
                    params["pageToken"] = page_token
                resp = client.get(f"{CONTENT_BASE}/{mid}/products", params=params)
                resp.raise_for_status()
                data = resp.json()
                yield from data.get("resources", [])
                page_token = data.get("nextPageToken")
                if not page_token:
                    break
        finally:
            if own_client:
                client.close()


class _MerchantApiUnavailable(Exception):
    """Merchant API rejected the token — use Content API instead."""
