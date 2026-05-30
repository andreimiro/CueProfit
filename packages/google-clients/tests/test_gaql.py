import pytest

from google_clients.gaql import (
    CAMPAIGN_DAILY_FIELDS,
    PRODUCT_DAILY_FIELDS,
    campaign_daily_query,
    conversion_actions_query,
    product_daily_query,
)


def test_campaign_daily_query_has_required_shape():
    q = campaign_daily_query("2026-04-01", "2026-04-30")
    assert q.startswith("SELECT ")
    assert "FROM campaign" in q
    for field in ("campaign.id", "metrics.cost_micros", "metrics.conversions_value", "segments.date"):
        assert field in q
    assert "segments.date BETWEEN '2026-04-01' AND '2026-04-30'" in q


def test_product_daily_query_uses_shopping_view_and_item_id():
    q = product_daily_query("2026-04-01", "2026-04-30")
    assert "FROM shopping_performance_view" in q
    assert "segments.product_item_id" in q
    assert "segments.date BETWEEN '2026-04-01' AND '2026-04-30'" in q


def test_conversion_actions_query_shape():
    q = conversion_actions_query()
    assert "FROM conversion_action" in q
    assert "conversion_action.id" in q


def test_field_lists_are_reflected_in_queries():
    q = campaign_daily_query("2026-01-01", "2026-01-02")
    for f in CAMPAIGN_DAILY_FIELDS:
        assert f in q
    qp = product_daily_query("2026-01-01", "2026-01-02")
    for f in PRODUCT_DAILY_FIELDS:
        assert f in qp


@pytest.mark.parametrize("bad", ["2026-1-1", "not-a-date", "2026/04/01", "2026-04-01' OR '1'='1"])
def test_invalid_date_rejected(bad):
    # Guards against malformed dates AND GAQL injection via the date arguments.
    with pytest.raises(ValueError):
        campaign_daily_query(bad, "2026-04-30")
    with pytest.raises(ValueError):
        campaign_daily_query("2026-04-01", bad)
