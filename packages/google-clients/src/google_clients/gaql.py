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
    "conversion_action.id",
    "conversion_action.name",
    "conversion_action.category",
    "conversion_action.type",
    "conversion_action.status",
    "conversion_action.primary_for_goal",
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
