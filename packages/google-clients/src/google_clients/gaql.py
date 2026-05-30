"""GAQL query catalog for the reports CueProfit syncs.

Field lists are the single source of truth — queries are built from them and the
same lists are handed to row_to_flat() so the SELECT and the parsing stay in sync.

NOTE: field/resource names target a recent Google Ads API version; verify against
the API version pinned in google-ads when wiring the live client.
"""

from __future__ import annotations

import re

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

CAMPAIGN_DAILY_FIELDS: list[str] = [
    "customer.id",
    "customer.currency_code",
    "campaign.id",
    "campaign.name",
    "campaign.advertising_channel_type",
    "campaign.status",
    "campaign.bidding_strategy_type",
    "campaign_budget.amount_micros",
    "segments.date",
    "metrics.impressions",
    "metrics.clicks",
    "metrics.cost_micros",
    "metrics.conversions",
    "metrics.conversions_value",
]

PRODUCT_DAILY_FIELDS: list[str] = [
    "customer.id",
    "customer.currency_code",
    "campaign.id",
    "segments.product_item_id",
    "segments.date",
    "metrics.impressions",
    "metrics.clicks",
    "metrics.cost_micros",
    "metrics.conversions",
    "metrics.conversions_value",
]

CONVERSION_ACTION_FIELDS: list[str] = [
    "customer.id",
    "conversion_action.id",
    "conversion_action.name",
    "conversion_action.category",
    "conversion_action.type",
    "conversion_action.status",
    "conversion_action.primary_for_goal",
]

CUSTOMER_FIELDS: list[str] = [
    "customer.id",
    "customer.descriptive_name",
    "customer.currency_code",
    "customer.time_zone",
    "customer.status",
    "customer.manager",
    "customer.test_account",
    "customer.optimization_score",
]

SEARCH_TERM_DAILY_FIELDS: list[str] = [
    "customer.id",
    "customer.currency_code",
    "campaign.id",
    "ad_group.id",
    "search_term_view.search_term",
    "segments.date",
    "segments.device",
    "metrics.impressions",
    "metrics.clicks",
    "metrics.cost_micros",
    "metrics.conversions",
    "metrics.conversions_value",
]

KEYWORD_DAILY_FIELDS: list[str] = [
    "customer.id",
    "customer.currency_code",
    "campaign.id",
    "ad_group.id",
    "ad_group_criterion.criterion_id",
    "ad_group_criterion.keyword.text",
    "ad_group_criterion.keyword.match_type",
    "segments.date",
    "segments.device",
    "metrics.impressions",
    "metrics.clicks",
    "metrics.cost_micros",
    "metrics.conversions",
    "metrics.conversions_value",
]

GEOGRAPHIC_DAILY_FIELDS: list[str] = [
    "customer.id",
    "customer.currency_code",
    "campaign.id",
    "geographic_view.country_criterion_id",
    "segments.date",
    "segments.device",
    "metrics.impressions",
    "metrics.clicks",
    "metrics.cost_micros",
    "metrics.conversions",
    "metrics.conversions_value",
]

RECOMMENDATION_FIELDS: list[str] = [
    "customer.id",
    "recommendation.resource_name",
    "recommendation.type",
    "recommendation.campaign",
    "recommendation.impact.base_metrics.cost_micros",
    "recommendation.impact.potential_metrics.cost_micros",
    "recommendation.impact.base_metrics.conversions",
    "recommendation.impact.potential_metrics.conversions",
    "recommendation.impact.base_metrics.conversions_value",
    "recommendation.impact.potential_metrics.conversions_value",
]

CHANGE_EVENT_FIELDS: list[str] = [
    "customer.id",
    "change_event.resource_name",
    "change_event.change_date_time",
    "change_event.change_resource_type",
    "change_event.changed_fields",
    "change_event.client_type",
    "change_event.user_email",
    "change_event.old_resource",
    "change_event.new_resource",
]


def _validate_date(d: str) -> str:
    # Strict format guard — also prevents GAQL injection via the date arguments.
    if not isinstance(d, str) or not _DATE_RE.match(d):
        raise ValueError(f"date must be 'YYYY-MM-DD', got {d!r}")
    return d


def _select(fields: list[str], resource: str, where: str | None = None) -> str:
    q = f"SELECT {', '.join(fields)} FROM {resource}"
    if where:
        q += f" WHERE {where}"
    return q


def _date_between(start: str, end: str) -> str:
    return f"segments.date BETWEEN '{_validate_date(start)}' AND '{_validate_date(end)}'"


def campaign_daily_query(start: str, end: str) -> str:
    return _select(CAMPAIGN_DAILY_FIELDS, "campaign", _date_between(start, end))


def product_daily_query(start: str, end: str) -> str:
    return _select(PRODUCT_DAILY_FIELDS, "shopping_performance_view", _date_between(start, end))


def conversion_actions_query() -> str:
    return _select(CONVERSION_ACTION_FIELDS, "conversion_action")


def customer_query() -> str:
    return _select(CUSTOMER_FIELDS, "customer")


def search_term_daily_query(start: str, end: str) -> str:
    return _select(SEARCH_TERM_DAILY_FIELDS, "search_term_view", _date_between(start, end))


def keyword_daily_query(start: str, end: str) -> str:
    return _select(KEYWORD_DAILY_FIELDS, "keyword_view", _date_between(start, end))


def geographic_daily_query(start: str, end: str) -> str:
    return _select(GEOGRAPHIC_DAILY_FIELDS, "geographic_view", _date_between(start, end))


def recommendation_query() -> str:
    return _select(RECOMMENDATION_FIELDS, "recommendation")


def change_events_query(start: str, end: str) -> str:
    where = (
        "change_event.change_date_time BETWEEN "
        f"'{_validate_date(start)}' AND '{_validate_date(end)}'"
    )
    return _select(CHANGE_EVENT_FIELDS, "change_event", where)
