"""Google Ads sync: pull campaign + product daily stats for one customer and
upsert them, wrapped in a sync_runs lifecycle record."""

from __future__ import annotations

from datetime import date
from typing import Any

from google_clients import gaql
from google_clients.mappers import (
    map_campaign_row,
    map_change_event,
    map_conversion_action_row,
    map_customer_row,
    map_geographic_row,
    map_keyword_row,
    map_product_row,
    map_recommendation_row,
    map_search_term_row,
)

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

        customers = [
            map_customer_row(row)
            for row in ads_client.search(customer_id, gaql.customer_query(), gaql.CUSTOMER_FIELDS)
        ]
        n_customer = store.upsert_google_ads_customers(workspace_id=workspace_id, rows=customers)

        conversion_actions = [
            map_conversion_action_row(row)
            for row in ads_client.search(
                customer_id, gaql.conversion_actions_query(), gaql.CONVERSION_ACTION_FIELDS
            )
        ]
        n_conversion_action = store.upsert_conversion_actions(
            workspace_id=workspace_id, rows=conversion_actions
        )

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

        search_terms = [
            map_search_term_row(row)
            for row in ads_client.search(
                customer_id,
                gaql.search_term_daily_query(start, end),
                gaql.SEARCH_TERM_DAILY_FIELDS,
            )
        ]
        n_search = store.upsert_search_term_stats(workspace_id=workspace_id, rows=search_terms)

        keywords = [
            map_keyword_row(row)
            for row in ads_client.search(
                customer_id, gaql.keyword_daily_query(start, end), gaql.KEYWORD_DAILY_FIELDS
            )
        ]
        n_keyword = store.upsert_keyword_stats(workspace_id=workspace_id, rows=keywords)

        geographic = [
            map_geographic_row(row)
            for row in ads_client.search(
                customer_id,
                gaql.geographic_daily_query(start, end),
                gaql.GEOGRAPHIC_DAILY_FIELDS,
            )
        ]
        n_geo = store.upsert_geographic_stats(workspace_id=workspace_id, rows=geographic)

        recommendations = [
            map_recommendation_row(row)
            for row in ads_client.search(customer_id, gaql.recommendation_query(), gaql.RECOMMENDATION_FIELDS)
        ]
        n_recommendation = store.upsert_google_ads_recommendations(
            workspace_id=workspace_id, rows=recommendations
        )

        change_events = [
            map_change_event(row)
            for row in ads_client.search(
                customer_id, gaql.change_events_query(start, end), gaql.CHANGE_EVENT_FIELDS
            )
        ]
        n_change = store.upsert_google_ads_change_events(workspace_id=workspace_id, rows=change_events)

        rows_written = (
            n_campaign
            + n_product
            + n_customer
            + n_conversion_action
            + n_search
            + n_keyword
            + n_geo
            + n_recommendation
            + n_change
        )

        store.finish_sync_run(
            run_id=run_id, status="success", rows_written=rows_written,
            cursor={"start": start, "end": end, "customer_id": str(customer_id)}, error=None,
        )
        if connection_id:
            store.mark_connection_synced(connection_id=connection_id, workspace_id=workspace_id)
        return {
            "campaign_rows": n_campaign,
            "product_rows": n_product,
            "customer_rows": n_customer,
            "conversion_action_rows": n_conversion_action,
            "search_term_rows": n_search,
            "keyword_rows": n_keyword,
            "geographic_rows": n_geo,
            "recommendation_rows": n_recommendation,
            "change_event_rows": n_change,
            "range": [start, end],
        }
    except Exception as exc:
        store.finish_sync_run(
            run_id=run_id, status="failed", rows_written=0, cursor=None, error=str(exc)
        )
        raise
