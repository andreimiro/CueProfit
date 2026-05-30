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
