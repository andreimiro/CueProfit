import pytest

from google_clients.gaql import (
    CAMPAIGN_DAILY_FIELDS,
    CHANGE_EVENT_FIELDS,
    PRODUCT_DAILY_FIELDS,
    SEARCH_TERM_DAILY_FIELDS,
    campaign_daily_query,
    change_events_query,
    conversion_actions_query,
    customer_query,
    geographic_daily_query,
    keyword_daily_query,
    product_daily_query,
    recommendation_query,
    search_term_daily_query,
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


def test_customer_query_shape():
    q = customer_query()
    assert "FROM customer" in q
    for field in ("customer.id", "customer.descriptive_name", "customer.time_zone", "customer.currency_code"):
        assert field in q


def test_search_term_daily_query_shape():
    q = search_term_daily_query("2026-04-01", "2026-04-30")
    assert "FROM search_term_view" in q
    for field in ("search_term_view.search_term", "ad_group.id", "metrics.cost_micros", "segments.date"):
        assert field in q
    assert "segments.date BETWEEN '2026-04-01' AND '2026-04-30'" in q


def test_keyword_and_geo_queries_have_expected_resources():
    keyword_q = keyword_daily_query("2026-04-01", "2026-04-30")
    geo_q = geographic_daily_query("2026-04-01", "2026-04-30")
    assert "FROM keyword_view" in keyword_q
    assert "ad_group_criterion.keyword.text" in keyword_q
    assert "FROM geographic_view" in geo_q
    assert "geographic_view.country_criterion_id" in geo_q


def test_recommendations_and_change_events_queries_shape():
    rec_q = recommendation_query()
    change_q = change_events_query("2026-04-01", "2026-04-30")
    assert "FROM recommendation" in rec_q
    assert "recommendation.type" in rec_q
    assert "FROM change_event" in change_q
    assert "change_event.change_date_time BETWEEN '2026-04-01' AND '2026-04-30'" in change_q


def test_field_lists_are_reflected_in_queries():
    q = campaign_daily_query("2026-01-01", "2026-01-02")
    for f in CAMPAIGN_DAILY_FIELDS:
        assert f in q
    qp = product_daily_query("2026-01-01", "2026-01-02")
    for f in PRODUCT_DAILY_FIELDS:
        assert f in qp
    qs = search_term_daily_query("2026-01-01", "2026-01-02")
    for f in SEARCH_TERM_DAILY_FIELDS:
        assert f in qs
    qc = change_events_query("2026-01-01", "2026-01-02")
    for f in CHANGE_EVENT_FIELDS:
        assert f in qc


@pytest.mark.parametrize("bad", ["2026-1-1", "not-a-date", "2026/04/01", "2026-04-01' OR '1'='1"])
def test_invalid_date_rejected(bad):
    # Guards against malformed dates AND GAQL injection via the date arguments.
    with pytest.raises(ValueError):
        campaign_daily_query(bad, "2026-04-30")
    with pytest.raises(ValueError):
        campaign_daily_query("2026-04-01", bad)
