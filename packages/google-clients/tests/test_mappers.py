from decimal import Decimal
from types import SimpleNamespace

from google_clients.mappers import (
    CampaignDailyStat,
    ChangeEvent,
    ConversionAction,
    CustomerSnapshot,
    KeywordDailyStat,
    ProductDailyStat,
    RecommendationSnapshot,
    SearchTermDailyStat,
    map_change_event,
    map_campaign_row,
    map_conversion_action_row,
    map_customer_row,
    map_keyword_row,
    map_product_row,
    map_recommendation_row,
    map_search_term_row,
    row_to_flat,
)


def test_map_campaign_row_converts_micros_and_types():
    flat = {
        "customer.id": 111,
        "customer.currency_code": "RON",
        "campaign.id": 222,
        "campaign.name": "Brand",
        "campaign.advertising_channel_type": "SEARCH",
        "campaign.status": "ENABLED",
        "campaign.bidding_strategy_type": "MAXIMIZE_CONVERSION_VALUE",
        "campaign_budget.amount_micros": 50_000_000,
        "segments.date": "2026-04-01",
        "metrics.impressions": 1000,
        "metrics.clicks": 50,
        "metrics.cost_micros": 12_500_000,
        "metrics.conversions": 5.0,
        "metrics.conversions_value": 750.0,
    }
    s = map_campaign_row(flat)
    assert isinstance(s, CampaignDailyStat)
    assert s.customer_id == 111
    assert s.campaign_id == 222
    assert s.campaign_type == "SEARCH"
    assert s.bidding_strategy == "MAXIMIZE_CONVERSION_VALUE"
    assert s.budget_amount == Decimal("50.00")
    assert s.spend == Decimal("12.50")
    assert s.conversions == Decimal("5.00")
    assert s.conversion_value == Decimal("750.00")
    assert s.impressions == 1000
    assert s.clicks == 50
    assert s.currency == "RON"
    assert s.date == "2026-04-01"


def test_map_campaign_row_defaults_missing_metrics_to_zero():
    flat = {"customer.id": 1, "campaign.id": 2, "segments.date": "2026-04-01"}
    s = map_campaign_row(flat)
    assert s.spend == Decimal("0.00")
    assert s.conversions == Decimal("0.00")
    assert s.impressions == 0
    assert s.budget_amount is None


def test_map_product_row():
    flat = {
        "customer.id": 111,
        "customer.currency_code": "RON",
        "campaign.id": 222,
        "segments.product_item_id": "sku123",
        "segments.date": "2026-04-02",
        "metrics.impressions": 10,
        "metrics.clicks": 3,
        "metrics.cost_micros": 1_990_000,
        "metrics.conversions": 1.0,
        "metrics.conversions_value": 49.9,
    }
    s = map_product_row(flat)
    assert isinstance(s, ProductDailyStat)
    assert s.ads_item_id == "sku123"
    assert s.campaign_id == 222
    assert s.spend == Decimal("1.99")
    assert s.conversion_value == Decimal("49.90")
    assert s.date == "2026-04-02"


def test_map_customer_row():
    flat = {
        "customer.id": 111,
        "customer.descriptive_name": "Demo Account",
        "customer.currency_code": "RON",
        "customer.time_zone": "Europe/Bucharest",
        "customer.status": "ENABLED",
        "customer.manager": False,
        "customer.test_account": False,
        "customer.optimization_score": 0.72,
    }
    c = map_customer_row(flat)
    assert isinstance(c, CustomerSnapshot)
    assert c.customer_id == 111
    assert c.descriptive_name == "Demo Account"
    assert c.optimization_score == Decimal("0.7200")


def test_map_conversion_action_row():
    flat = {
        "customer.id": 111,
        "conversion_action.id": 999,
        "conversion_action.name": "Purchase",
        "conversion_action.category": "PURCHASE",
        "conversion_action.type": "WEBPAGE",
        "conversion_action.status": "ENABLED",
        "conversion_action.primary_for_goal": True,
    }
    c = map_conversion_action_row(flat)
    assert isinstance(c, ConversionAction)
    assert c.conversion_action_id == 999
    assert c.primary_for_goal is True


def test_map_search_term_row():
    flat = {
        "customer.id": 111,
        "customer.currency_code": "RON",
        "campaign.id": 222,
        "ad_group.id": 333,
        "search_term_view.search_term": "running shoes",
        "segments.date": "2026-04-03",
        "segments.device": "MOBILE",
        "metrics.impressions": 100,
        "metrics.clicks": 12,
        "metrics.cost_micros": 3_400_000,
        "metrics.conversions": 2.0,
        "metrics.conversions_value": 140.0,
    }
    s = map_search_term_row(flat)
    assert isinstance(s, SearchTermDailyStat)
    assert s.search_term == "running shoes"
    assert s.ad_group_id == 333
    assert s.device == "MOBILE"
    assert s.spend == Decimal("3.40")


def test_map_keyword_row():
    flat = {
        "customer.id": 111,
        "customer.currency_code": "RON",
        "campaign.id": 222,
        "ad_group.id": 333,
        "ad_group_criterion.criterion_id": 444,
        "ad_group_criterion.keyword.text": "brand shoes",
        "ad_group_criterion.keyword.match_type": "PHRASE",
        "segments.date": "2026-04-03",
        "metrics.cost_micros": 8_120_000,
    }
    s = map_keyword_row(flat)
    assert isinstance(s, KeywordDailyStat)
    assert s.criterion_id == 444
    assert s.keyword_text == "brand shoes"
    assert s.match_type == "PHRASE"
    assert s.spend == Decimal("8.12")


def test_map_recommendation_row():
    flat = {
        "customer.id": 111,
        "recommendation.resource_name": "customers/111/recommendations/abc",
        "recommendation.type": "CAMPAIGN_BUDGET",
        "recommendation.campaign": "customers/111/campaigns/222",
        "recommendation.impact.base_metrics.cost_micros": 10_000_000,
        "recommendation.impact.potential_metrics.cost_micros": 12_500_000,
        "recommendation.impact.base_metrics.conversions_value": 250,
        "recommendation.impact.potential_metrics.conversions_value": 350,
    }
    r = map_recommendation_row(flat)
    assert isinstance(r, RecommendationSnapshot)
    assert r.recommendation_type == "CAMPAIGN_BUDGET"
    assert r.campaign_resource_name == "customers/111/campaigns/222"
    assert r.base_cost == Decimal("10.00")
    assert r.potential_conversion_value == Decimal("350.00")


def test_map_change_event():
    flat = {
        "customer.id": 111,
        "change_event.change_date_time": "2026-04-03 12:00:00.000000",
        "change_event.change_resource_type": "CAMPAIGN",
        "change_event.resource_name": "customers/111/changeEvents/1",
        "change_event.changed_fields": "status,budget",
        "change_event.client_type": "GOOGLE_ADS_WEB_CLIENT",
        "change_event.user_email": "user@example.com",
        "change_event.old_resource": "old",
        "change_event.new_resource": "new",
    }
    event = map_change_event(flat)
    assert isinstance(event, ChangeEvent)
    assert event.change_resource_type == "CAMPAIGN"
    assert event.changed_fields == "status,budget"


def test_row_to_flat_navigates_dotted_paths_and_unwraps_enums():
    # Mimics a GoogleAdsRow: nested objects + a proto-enum-like value with `.name`.
    enum_like = SimpleNamespace(name="SEARCH")
    row = SimpleNamespace(
        campaign=SimpleNamespace(id=222, advertising_channel_type=enum_like),
        metrics=SimpleNamespace(cost_micros=12_500_000),
        segments=SimpleNamespace(date="2026-04-01"),
    )
    flat = row_to_flat(
        row,
        ["campaign.id", "campaign.advertising_channel_type", "metrics.cost_micros", "segments.date"],
    )
    assert flat["campaign.id"] == 222
    assert flat["campaign.advertising_channel_type"] == "SEARCH"  # enum unwrapped to .name
    assert flat["metrics.cost_micros"] == 12_500_000
    assert flat["segments.date"] == "2026-04-01"
