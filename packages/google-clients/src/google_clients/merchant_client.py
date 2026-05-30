"""Merchant API client — lists processed catalog products via REST.

Uses OAuth bearer tokens (refreshed by the worker). Lazy-imports httpx so pure
mapper tests do not require it.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

PRODUCTS_BASE = "https://merchantapi.googleapis.com/products/v1"


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
        """Yield raw Product resources for one Merchant Center account."""
        parent = f"accounts/{str(merchant_id).replace('-', '')}"
        page_token: str | None = None
        client = self._client()
        own_client = self._http is None
        try:
            while True:
                params: dict[str, str | int] = {"pageSize": 250}
                if page_token:
                    params["pageToken"] = page_token
                resp = client.get(f"{PRODUCTS_BASE}/{parent}/products", params=params)
                resp.raise_for_status()
                data = resp.json()
                yield from data.get("products", [])
                page_token = data.get("nextPageToken")
                if not page_token:
                    break
        finally:
            if own_client:
                client.close()
