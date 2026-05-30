"""Merchant Center sync: pull processed catalog products and upsert them."""

from __future__ import annotations

from typing import Any

from google_clients.merchant_mappers import map_merchant_product


def sync_merchant(
    *,
    store,
    merchant_client,
    workspace_id: str,
    merchant_id: int | str,
    kind: str = "catalog",
    connection_id: str | None = None,
) -> dict[str, Any]:
    run_id = store.start_sync_run(
        workspace_id=workspace_id,
        provider="merchant_center",
        kind=kind,
        connection_id=connection_id,
    )
    try:
        rows = [
            map_merchant_product(product)
            for product in merchant_client.list_products(merchant_id)
        ]
        n_written = store.upsert_catalog_products(workspace_id=workspace_id, rows=rows)
        store.finish_sync_run(
            run_id=run_id,
            status="success",
            rows_written=n_written,
            cursor={"merchant_id": str(merchant_id), "products": n_written},
            error=None,
        )
        if connection_id:
            store.mark_connection_synced(connection_id=connection_id, workspace_id=workspace_id)
        return {"product_rows": n_written, "merchant_id": str(merchant_id)}
    except Exception as exc:
        store.finish_sync_run(
            run_id=run_id, status="failed", rows_written=0, cursor=None, error=str(exc)
        )
        raise
