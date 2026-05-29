from decimal import Decimal
from types import SimpleNamespace

from google_clients.mappers import (
    CampaignDailyStat,
    ProductDailyStat,
    map_campaign_row,
    map_product_row,
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
