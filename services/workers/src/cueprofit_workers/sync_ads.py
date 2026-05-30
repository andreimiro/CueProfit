"""Google Ads sync: pull campaign + product daily stats for one customer and
upsert them, wrapped in a sync_runs lifecycle record."""

from __future__ import annotations

from datetime import date
from typing import Any

from google_clients import gaql
from google_clients.mappers import map_campaign_row, map_product_row

from cueprofit_workers.dates import plan_date_range


def sync_google_ads(
    *,
    store,
    ads_client,
    workspace_id: str,
    customer_id: int | str,
    kind: str,
    today: date,
    connection_id: str | None = None,
) -> dict[str, Any]:
    """Run one customer's sync. `ads_client.search(customer_id, query, fields)`
    yields flat field-path dicts (see packages/google-clients)."""
    run_id = store.start_sync_run(
        workspace_id=workspace_id, provider="google_ads", kind=kind, connection_id=connection_id
    )
    try:
        start, end = plan_date_range(kind, today)

        campaigns = [
            map_campaign_row(row)
            for row in ads_client.search(
                customer_id, gaql.campaign_daily_query(start, end), gaql.CAMPAIGN_DAILY_FIELDS
            )
        ]
        n_campaign = store.upsert_campaign_stats(workspace_id=workspace_id, rows=campaigns)

        products = [
            map_product_row(row)
            for row in ads_client.search(
                customer_id, gaql.product_daily_query(start, end), gaql.PRODUCT_DAILY_FIELDS
            )
        ]
        n_product = store.upsert_product_stats(workspace_id=workspace_id, rows=products)

        store.finish_sync_run(
            run_id=run_id, status="success", rows_written=n_campaign + n_product,
            cursor={"start": start, "end": end, "customer_id": str(customer_id)}, error=None,
        )
        if connection_id:
            store.mark_connection_synced(connection_id=connection_id, workspace_id=workspace_id)
        return {"campaign_rows": n_campaign, "product_rows": n_product, "range": [start, end]}
    except Exception as exc:
        store.finish_sync_run(
            run_id=run_id, status="failed", rows_written=0, cursor=None, error=str(exc)
        )
        raise
