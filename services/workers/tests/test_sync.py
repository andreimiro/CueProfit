from datetime import date

import pytest

from cueprofit_workers.resolve import resolve_workspace_identities
from cueprofit_workers.stores import FakeStatsStore
from cueprofit_workers.sync_ads import sync_google_ads

TODAY = date(2026, 5, 30)

CAMP = {
    "customer.id": 111, "customer.currency_code": "RON",
    "campaign.id": 222, "campaign.name": "Brand",
    "campaign.advertising_channel_type": "SEARCH", "campaign.status": "ENABLED",
    "campaign.bidding_strategy_type": "MAX_CONV_VALUE",
    "campaign_budget.amount_micros": 50_000_000, "segments.date": "2026-05-29",
    "metrics.impressions": 100, "metrics.clicks": 5, "metrics.cost_micros": 12_500_000,
    "metrics.conversions": 2.0, "metrics.conversions_value": 300.0,
}
PROD = {
    "customer.id": 111, "customer.currency_code": "RON", "campaign.id": 222,
    "segments.product_item_id": "sku1", "segments.date": "2026-05-29",
    "metrics.impressions": 10, "metrics.clicks": 1, "metrics.cost_micros": 1_990_000,
    "metrics.conversions": 1.0, "metrics.conversions_value": 49.9,
}


class FakeAdsClient:
    def __init__(self, campaign_rows, product_rows):
        self.campaign_rows, self.product_rows = campaign_rows, product_rows
        self.queries: list[str] = []

    def search(self, customer_id, query, field_paths):
        self.queries.append(query)
        if "shopping_performance_view" in query:
            yield from self.product_rows
        elif "FROM campaign" in query:
            yield from self.campaign_rows


def test_sync_google_ads_maps_upserts_and_records_run():
    store = FakeStatsStore()
    ads = FakeAdsClient([CAMP, {**CAMP, "campaign.id": 333}], [PROD])

    out = sync_google_ads(
        store=store, ads_client=ads, workspace_id="ws1",
        customer_id=111, kind="daily", today=TODAY,
    )
    assert out["campaign_rows"] == 2 and out["product_rows"] == 1
    assert len(store.campaign) == 2 and len(store.product) == 1

    ws, rec = store.campaign[0]
    assert ws == "ws1" and rec.campaign_id == 222 and str(rec.spend) == "12.50"

    run = store.runs[-1]
    assert run["status"] == "success" and run["rows_written"] == 3
    assert run["cursor"]["end"] == "2026-05-29"


def test_sync_google_ads_records_failure_and_reraises():
    class Boom:
        def search(self, *a, **k):
            raise RuntimeError("api down")

    store = FakeStatsStore()
    with pytest.raises(RuntimeError):
        sync_google_ads(
            store=store, ads_client=Boom(), workspace_id="ws1",
            customer_id=1, kind="daily", today=TODAY,
        )
    assert store.runs[-1]["status"] == "failed"


def test_resolve_links_matched_items_only():
    store = FakeStatsStore()
    store.products = [{"workspace_id": "ws1", "product_id": "A", "offer_id": "sku1"}]
    store.unresolved = [
        {"workspace_id": "ws1", "ads_item_id": "sku1"},
        {"workspace_id": "ws1", "ads_item_id": "zzz"},
    ]

    out = resolve_workspace_identities(store=store, workspace_id="ws1")
    assert out["mapped"] == 2  # both items recorded in the identity map
    assert out["linked"] == 1  # only sku1 matched a product
    assert ("ws1", "sku1", "A") in store.links
