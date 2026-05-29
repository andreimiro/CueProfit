"""Live Google Ads API client wrapper (requires the `ads` extra: google-ads).

Thin layer over GoogleAdsService.SearchStream that yields flat {field_path: value}
dicts (via row_to_flat) ready for the mappers. Lazy-imports google-ads so the
package and its pure tests don't require it.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from google_clients.mappers import row_to_flat


class GoogleAdsClient:
    def __init__(
        self,
        *,
        developer_token: str,
        client_id: str,
        client_secret: str,
        refresh_token: str,
        login_customer_id: str | None = None,
    ):
        from google.ads.googleads.client import GoogleAdsClient as _Sdk  # lazy

        config: dict[str, Any] = {
            "developer_token": developer_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "use_proto_plus": True,
        }
        if login_customer_id:
            config["login_customer_id"] = str(login_customer_id).replace("-", "")
        self._sdk = _Sdk.load_from_dict(config)

    def search(
        self, customer_id: int | str, query: str, field_paths: list[str]
    ) -> Iterator[dict[str, Any]]:
        """Stream a GAQL query, yielding one flat dict per row."""
        service = self._sdk.get_service("GoogleAdsService")
        cid = str(customer_id).replace("-", "")
        for batch in service.search_stream(customer_id=cid, query=query):
            for row in batch.results:
                yield row_to_flat(row, field_paths)
