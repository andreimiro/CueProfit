"""Pure mappers: a flat {field_path: value} dict → typed stat records.

`row_to_flat` turns a GoogleAdsRow (nested objects, proto enums) into the flat
dict these mappers consume, so the mappers themselves stay trivially testable.
Money is Decimal; Ads reports cost/budget in micros (1e6 = one currency unit).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

_MONEY = Decimal("0.01")
_MICROS = Decimal(1_000_000)


def _money_from_micros(micros: Any) -> Decimal:
    return (Decimal(int(micros)) / _MICROS).quantize(_MONEY, rounding=ROUND_HALF_UP)


def _money(v: Any) -> Decimal:
    return Decimal(str(v)).quantize(_MONEY, rounding=ROUND_HALF_UP)


def _ratio(v: Any) -> Decimal | None:
    if v is None:
        return None
    return Decimal(str(v)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def _scalar(v: Any) -> Any:
    """Unwrap proto enums (objects with a str `.name`) to their name; pass scalars through."""
    if v is None or isinstance(v, (str, int, float, bool)):
        return v
    name = getattr(v, "name", None)
    return name if isinstance(name, str) else v


def row_to_flat(row: Any, field_paths: list[str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for path in field_paths:
        node = row
        for part in path.split("."):
            node = getattr(node, part)
        out[path] = _scalar(node)
    return out


@dataclass(frozen=True)
class CampaignDailyStat:
    customer_id: int
    date: str
    campaign_id: int
    campaign_name: str | None
    campaign_type: str | None
    status: str | None
    bidding_strategy: str | None
    budget_amount: Decimal | None
    impressions: int
    clicks: int
    spend: Decimal
    conversions: Decimal
    conversion_value: Decimal
    currency: str | None


@dataclass(frozen=True)
class ProductDailyStat:
    customer_id: int
    date: str
    campaign_id: int
    ads_item_id: str
    impressions: int
    clicks: int
    spend: Decimal
    conversions: Decimal
    conversion_value: Decimal
    currency: str | None


@dataclass(frozen=True)
class CustomerSnapshot:
    customer_id: int
    descriptive_name: str | None
    currency: str | None
    time_zone: str | None
    status: str | None
    manager: bool | None
    test_account: bool | None
    optimization_score: Decimal | None


@dataclass(frozen=True)
class ConversionAction:
    customer_id: int
    conversion_action_id: int
    name: str | None
    category: str | None
    action_type: str | None
    status: str | None
    primary_for_goal: bool | None


@dataclass(frozen=True)
class SearchTermDailyStat:
    customer_id: int
    date: str
    campaign_id: int
    ad_group_id: int
    search_term: str
    device: str | None
    impressions: int
    clicks: int
    spend: Decimal
    conversions: Decimal
    conversion_value: Decimal
    currency: str | None


@dataclass(frozen=True)
class KeywordDailyStat:
    customer_id: int
    date: str
    campaign_id: int
    ad_group_id: int
    criterion_id: int
    keyword_text: str | None
    match_type: str | None
    device: str | None
    impressions: int
    clicks: int
    spend: Decimal
    conversions: Decimal
    conversion_value: Decimal
    currency: str | None


@dataclass(frozen=True)
class GeographicDailyStat:
    customer_id: int
    date: str
    campaign_id: int
    country_criterion_id: int
    device: str | None
    impressions: int
    clicks: int
    spend: Decimal
    conversions: Decimal
    conversion_value: Decimal
    currency: str | None


@dataclass(frozen=True)
class RecommendationSnapshot:
    customer_id: int
    resource_name: str
    recommendation_type: str | None
    campaign_resource_name: str | None
    base_cost: Decimal
    potential_cost: Decimal
    base_conversions: Decimal
    potential_conversions: Decimal
    base_conversion_value: Decimal
    potential_conversion_value: Decimal


@dataclass(frozen=True)
class ChangeEvent:
    customer_id: int
    resource_name: str
    change_date_time: str
    change_resource_type: str | None
    changed_fields: Any
    client_type: str | None
    user_email: str | None
    old_resource: Any
    new_resource: Any


def map_campaign_row(flat: dict[str, Any]) -> CampaignDailyStat:
    budget = flat.get("campaign_budget.amount_micros")
    return CampaignDailyStat(
        customer_id=int(flat["customer.id"]),
        date=flat["segments.date"],
        campaign_id=int(flat["campaign.id"]),
        campaign_name=flat.get("campaign.name"),
        campaign_type=flat.get("campaign.advertising_channel_type"),
        status=flat.get("campaign.status"),
        bidding_strategy=flat.get("campaign.bidding_strategy_type"),
        budget_amount=_money_from_micros(budget) if budget is not None else None,
        impressions=int(flat.get("metrics.impressions", 0)),
        clicks=int(flat.get("metrics.clicks", 0)),
        spend=_money_from_micros(flat.get("metrics.cost_micros", 0)),
        conversions=_money(flat.get("metrics.conversions", 0)),
        conversion_value=_money(flat.get("metrics.conversions_value", 0)),
        currency=flat.get("customer.currency_code"),
    )


def map_product_row(flat: dict[str, Any]) -> ProductDailyStat:
    return ProductDailyStat(
        customer_id=int(flat["customer.id"]),
        date=flat["segments.date"],
        campaign_id=int(flat["campaign.id"]),
        ads_item_id=flat["segments.product_item_id"],
        impressions=int(flat.get("metrics.impressions", 0)),
        clicks=int(flat.get("metrics.clicks", 0)),
        spend=_money_from_micros(flat.get("metrics.cost_micros", 0)),
        conversions=_money(flat.get("metrics.conversions", 0)),
        conversion_value=_money(flat.get("metrics.conversions_value", 0)),
        currency=flat.get("customer.currency_code"),
    )


def map_customer_row(flat: dict[str, Any]) -> CustomerSnapshot:
    return CustomerSnapshot(
        customer_id=int(flat["customer.id"]),
        descriptive_name=flat.get("customer.descriptive_name"),
        currency=flat.get("customer.currency_code"),
        time_zone=flat.get("customer.time_zone"),
        status=flat.get("customer.status"),
        manager=flat.get("customer.manager"),
        test_account=flat.get("customer.test_account"),
        optimization_score=_ratio(flat.get("customer.optimization_score")),
    )


def map_conversion_action_row(flat: dict[str, Any]) -> ConversionAction:
    return ConversionAction(
        customer_id=int(flat["customer.id"]),
        conversion_action_id=int(flat["conversion_action.id"]),
        name=flat.get("conversion_action.name"),
        category=flat.get("conversion_action.category"),
        action_type=flat.get("conversion_action.type"),
        status=flat.get("conversion_action.status"),
        primary_for_goal=flat.get("conversion_action.primary_for_goal"),
    )


def map_search_term_row(flat: dict[str, Any]) -> SearchTermDailyStat:
    return SearchTermDailyStat(
        customer_id=int(flat["customer.id"]),
        date=flat["segments.date"],
        campaign_id=int(flat["campaign.id"]),
        ad_group_id=int(flat["ad_group.id"]),
        search_term=flat["search_term_view.search_term"],
        device=flat.get("segments.device"),
        impressions=int(flat.get("metrics.impressions", 0)),
        clicks=int(flat.get("metrics.clicks", 0)),
        spend=_money_from_micros(flat.get("metrics.cost_micros", 0)),
        conversions=_money(flat.get("metrics.conversions", 0)),
        conversion_value=_money(flat.get("metrics.conversions_value", 0)),
        currency=flat.get("customer.currency_code"),
    )


def map_keyword_row(flat: dict[str, Any]) -> KeywordDailyStat:
    return KeywordDailyStat(
        customer_id=int(flat["customer.id"]),
        date=flat["segments.date"],
        campaign_id=int(flat["campaign.id"]),
        ad_group_id=int(flat["ad_group.id"]),
        criterion_id=int(flat["ad_group_criterion.criterion_id"]),
        keyword_text=flat.get("ad_group_criterion.keyword.text"),
        match_type=flat.get("ad_group_criterion.keyword.match_type"),
        device=flat.get("segments.device"),
        impressions=int(flat.get("metrics.impressions", 0)),
        clicks=int(flat.get("metrics.clicks", 0)),
        spend=_money_from_micros(flat.get("metrics.cost_micros", 0)),
        conversions=_money(flat.get("metrics.conversions", 0)),
        conversion_value=_money(flat.get("metrics.conversions_value", 0)),
        currency=flat.get("customer.currency_code"),
    )


def map_geographic_row(flat: dict[str, Any]) -> GeographicDailyStat:
    return GeographicDailyStat(
        customer_id=int(flat["customer.id"]),
        date=flat["segments.date"],
        campaign_id=int(flat["campaign.id"]),
        country_criterion_id=int(flat["geographic_view.country_criterion_id"]),
        device=flat.get("segments.device"),
        impressions=int(flat.get("metrics.impressions", 0)),
        clicks=int(flat.get("metrics.clicks", 0)),
        spend=_money_from_micros(flat.get("metrics.cost_micros", 0)),
        conversions=_money(flat.get("metrics.conversions", 0)),
        conversion_value=_money(flat.get("metrics.conversions_value", 0)),
        currency=flat.get("customer.currency_code"),
    )


def map_recommendation_row(flat: dict[str, Any]) -> RecommendationSnapshot:
    return RecommendationSnapshot(
        customer_id=int(flat["customer.id"]),
        resource_name=flat["recommendation.resource_name"],
        recommendation_type=flat.get("recommendation.type"),
        campaign_resource_name=flat.get("recommendation.campaign"),
        base_cost=_money_from_micros(flat.get("recommendation.impact.base_metrics.cost_micros", 0)),
        potential_cost=_money_from_micros(
            flat.get("recommendation.impact.potential_metrics.cost_micros", 0)
        ),
        base_conversions=_money(flat.get("recommendation.impact.base_metrics.conversions", 0)),
        potential_conversions=_money(
            flat.get("recommendation.impact.potential_metrics.conversions", 0)
        ),
        base_conversion_value=_money(
            flat.get("recommendation.impact.base_metrics.conversions_value", 0)
        ),
        potential_conversion_value=_money(
            flat.get("recommendation.impact.potential_metrics.conversions_value", 0)
        ),
    )


def map_change_event(flat: dict[str, Any]) -> ChangeEvent:
    return ChangeEvent(
        customer_id=int(flat["customer.id"]),
        resource_name=flat["change_event.resource_name"],
        change_date_time=flat["change_event.change_date_time"],
        change_resource_type=flat.get("change_event.change_resource_type"),
        changed_fields=flat.get("change_event.changed_fields"),
        client_type=flat.get("change_event.client_type"),
        user_email=flat.get("change_event.user_email"),
        old_resource=flat.get("change_event.old_resource"),
        new_resource=flat.get("change_event.new_resource"),
    )
