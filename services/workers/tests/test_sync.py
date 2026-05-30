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
SEARCH = {
    "customer.id": 111, "customer.currency_code": "RON", "campaign.id": 222,
    "ad_group.id": 333, "search_term_view.search_term": "running shoes",
    "segments.date": "2026-05-29", "segments.device": "MOBILE",
    "metrics.impressions": 100, "metrics.clicks": 12, "metrics.cost_micros": 3_400_000,
    "metrics.conversions": 2.0, "metrics.conversions_value": 140.0,
}
KEYWORD = {
    "customer.id": 111, "customer.currency_code": "RON", "campaign.id": 222,
    "ad_group.id": 333, "ad_group_criterion.criterion_id": 444,
    "ad_group_criterion.keyword.text": "brand shoes",
    "ad_group_criterion.keyword.match_type": "PHRASE",
    "segments.date": "2026-05-29", "segments.device": "DESKTOP",
    "metrics.impressions": 80, "metrics.clicks": 8, "metrics.cost_micros": 2_500_000,
    "metrics.conversions": 1.0, "metrics.conversions_value": 90.0,
}
GEO = {
    "customer.id": 111, "customer.currency_code": "RON", "campaign.id": 222,
    "geographic_view.country_criterion_id": 2642,
    "segments.date": "2026-05-29", "segments.device": "MOBILE",
    "metrics.impressions": 120, "metrics.clicks": 9, "metrics.cost_micros": 4_500_000,
    "metrics.conversions": 1.0, "metrics.conversions_value": 110.0,
}
REC = {
    "customer.id": 111,
    "recommendation.resource_name": "customers/111/recommendations/abc",
    "recommendation.type": "CAMPAIGN_BUDGET",
    "recommendation.campaign": "customers/111/campaigns/222",
    "recommendation.impact.base_metrics.cost_micros": 10_000_000,
    "recommendation.impact.potential_metrics.cost_micros": 12_000_000,
    "recommendation.impact.base_metrics.conversions": 3.0,
    "recommendation.impact.potential_metrics.conversions": 4.0,
    "recommendation.impact.base_metrics.conversions_value": 300.0,
    "recommendation.impact.potential_metrics.conversions_value": 420.0,
}
CHANGE = {
    "customer.id": 111,
    "change_event.resource_name": "customers/111/changeEvents/1",
    "change_event.change_date_time": "2026-05-29 10:00:00.000000",
    "change_event.change_resource_type": "CAMPAIGN",
    "change_event.changed_fields": "status",
    "change_event.client_type": "GOOGLE_ADS_WEB_CLIENT",
    "change_event.user_email": "user@example.com",
    "change_event.old_resource": {},
    "change_event.new_resource": {},
}
CUSTOMER = {
    "customer.id": 111,
    "customer.descriptive_name": "Demo Account",
    "customer.currency_code": "RON",
    "customer.time_zone": "Europe/Bucharest",
    "customer.status": "ENABLED",
    "customer.manager": False,
    "customer.test_account": False,
    "customer.optimization_score": 0.72,
}
CONVERSION = {
    "customer.id": 111,
    "conversion_action.id": 999,
    "conversion_action.name": "Purchase",
    "conversion_action.category": "PURCHASE",
    "conversion_action.type": "WEBPAGE",
    "conversion_action.status": "ENABLED",
    "conversion_action.primary_for_goal": True,
}


class FakeAdsClient:
    def __init__(
        self,
        campaign_rows,
        product_rows,
        search_rows=None,
        keyword_rows=None,
        geo_rows=None,
        rec_rows=None,
        change_rows=None,
        customer_rows=None,
        conversion_rows=None,
    ):
        self.campaign_rows, self.product_rows = campaign_rows, product_rows
        self.search_rows = search_rows or []
        self.keyword_rows = keyword_rows or []
        self.geo_rows = geo_rows or []
        self.rec_rows = rec_rows or []
        self.change_rows = change_rows or []
        self.customer_rows = customer_rows or []
        self.conversion_rows = conversion_rows or []
        self.queries: list[str] = []

    def search(self, customer_id, query, field_paths):
        self.queries.append(query)
        if "shopping_performance_view" in query:
            yield from self.product_rows
        elif "search_term_view" in query:
            yield from self.search_rows
        elif "keyword_view" in query:
            yield from self.keyword_rows
        elif "geographic_view" in query:
            yield from self.geo_rows
        elif "FROM recommendation" in query:
            yield from self.rec_rows
        elif "FROM change_event" in query:
            yield from self.change_rows
        elif "FROM customer" in query:
            yield from self.customer_rows
        elif "FROM conversion_action" in query:
            yield from self.conversion_rows
        elif "FROM campaign" in query:
            yield from self.campaign_rows


def test_sync_google_ads_maps_upserts_and_records_run():
    store = FakeStatsStore()
    ads = FakeAdsClient(
        [CAMP, {**CAMP, "campaign.id": 333}],
        [PROD],
        [SEARCH],
        [KEYWORD],
        [GEO],
        [REC],
        [CHANGE],
        [CUSTOMER],
        [CONVERSION],
    )

    out = sync_google_ads(
        store=store, ads_client=ads, workspace_id="ws1",
        customer_id=111, kind="daily", today=TODAY,
    )
    assert out["campaign_rows"] == 2 and out["product_rows"] == 1
    assert out["search_term_rows"] == 1
    assert out["keyword_rows"] == 1
    assert out["geographic_rows"] == 1
    assert out["recommendation_rows"] == 1
    assert out["change_event_rows"] == 1
    assert out["customer_rows"] == 1
    assert out["conversion_action_rows"] == 1
    assert len(store.campaign) == 2 and len(store.product) == 1
    assert len(store.google_ads_customers) == 1
    assert len(store.conversion_actions) == 1
    assert len(store.search_terms) == 1
    assert len(store.keywords) == 1
    assert len(store.geographic) == 1
    assert len(store.google_ads_recommendations) == 1
    assert len(store.change_events) == 1

    ws, rec = store.campaign[0]
    assert ws == "ws1" and rec.campaign_id == 222 and str(rec.spend) == "12.50"

    run = store.runs[-1]
    assert run["status"] == "success" and run["rows_written"] == 10
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
