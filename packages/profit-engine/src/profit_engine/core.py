"""Deterministic profit math. Pure functions, no IO. Money uses Decimal.

See tests/test_profit_engine.py for the canonical model and worked examples.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from enum import Enum

_ZERO = Decimal("0")
_ONE = Decimal("1")
_MONEY_Q = Decimal("0.01")
_RATIO_Q = Decimal("0.0001")


class VatMode(str, Enum):
    INCLUSIVE = "inclusive"
    EXCLUSIVE = "exclusive"
    UNKNOWN = "unknown"


class BusinessMode(str, Enum):
    ECOMMERCE = "ecommerce"
    AFFILIATE = "affiliate"


@dataclass(frozen=True)
class ProfitInputs:
    ad_spend: Decimal = _ZERO
    gross_revenue: Decimal = _ZERO          # conversion_value, or commission (affiliate)
    conversions: Decimal = _ZERO            # units, for per-unit costs
    mode: BusinessMode = BusinessMode.ECOMMERCE
    vat_mode: VatMode = VatMode.UNKNOWN
    vat_rate: Decimal = _ZERO               # 0..1
    return_rate: Decimal = _ZERO            # 0..1
    validation_rate: Decimal = _ONE         # 0..1
    cost_of_goods: Decimal = _ZERO          # per unit
    shipping_cost: Decimal = _ZERO          # per unit
    packaging_cost: Decimal = _ZERO         # per unit
    other_cost: Decimal = _ZERO             # per unit
    payment_fee_rate: Decimal = _ZERO       # applied to net revenue (ecommerce)


@dataclass(frozen=True)
class ProfitResult:
    net_revenue_before_returns: Decimal
    adjusted_revenue: Decimal
    variable_cost: Decimal
    gross_profit_before_ads: Decimal
    net_profit: Decimal
    roas: Decimal | None
    poas: Decimal | None
    net_poas: Decimal | None
    contribution_margin: Decimal | None
    break_even_roas: Decimal | None
    waste_amount: Decimal


def _money(x: Decimal) -> Decimal:
    return x.quantize(_MONEY_Q, rounding=ROUND_HALF_UP)


def _ratio(x: Decimal | None) -> Decimal | None:
    return None if x is None else x.quantize(_RATIO_Q, rounding=ROUND_HALF_UP)


def compute_profit(inp: ProfitInputs) -> ProfitResult:
    if inp.ad_spend < 0:
        raise ValueError("ad_spend must be >= 0")
    if inp.gross_revenue < 0:
        raise ValueError("gross_revenue must be >= 0")
    if inp.conversions < 0:
        raise ValueError("conversions must be >= 0")

    retention = (_ONE - inp.return_rate) * inp.validation_rate

    if inp.mode == BusinessMode.AFFILIATE:
        # Commission is already net; no VAT, no COGS, no payment fee.
        net_rev = inp.gross_revenue
        cogs_total = _ZERO
        payment_fee = _ZERO
    else:
        if inp.vat_mode == VatMode.INCLUSIVE:
            net_rev = inp.gross_revenue / (_ONE + inp.vat_rate)
        else:
            net_rev = inp.gross_revenue
        per_unit = (
            inp.cost_of_goods + inp.shipping_cost + inp.packaging_cost + inp.other_cost
        )
        cogs_total = per_unit * inp.conversions * retention
        payment_fee = inp.payment_fee_rate * net_rev * retention

    adjusted_revenue = net_rev * retention
    variable_cost = cogs_total + payment_fee
    return _assemble(
        net_revenue_before_returns=net_rev,
        adjusted_revenue=adjusted_revenue,
        variable_cost=variable_cost,
        ad_spend=inp.ad_spend,
        gross_revenue=inp.gross_revenue,
        conversions=inp.conversions,
    )


def compute_profit_from_margin(
    *,
    ad_spend: Decimal,
    gross_revenue: Decimal,
    margin_rate: Decimal,
    conversions: Decimal = _ZERO,
    vat_mode: VatMode = VatMode.UNKNOWN,
    vat_rate: Decimal = _ZERO,
    return_rate: Decimal = _ZERO,
    validation_rate: Decimal = _ONE,
    payment_fee_rate: Decimal = _ZERO,
) -> ProfitResult:
    """Profit from a contribution-MARGIN assumption instead of per-unit costs.

    For aggregate levels (campaign/account) where we have revenue + spend but no
    per-SKU COGS: gross_profit = adjusted_revenue × margin_rate − payment fees.
    """
    if ad_spend < 0:
        raise ValueError("ad_spend must be >= 0")
    if gross_revenue < 0:
        raise ValueError("gross_revenue must be >= 0")

    retention = (_ONE - return_rate) * validation_rate
    if vat_mode == VatMode.INCLUSIVE:
        net_rev = gross_revenue / (_ONE + vat_rate)
    else:
        net_rev = gross_revenue
    adjusted_revenue = net_rev * retention
    payment_fee = payment_fee_rate * net_rev * retention
    variable_cost = adjusted_revenue * (_ONE - margin_rate) + payment_fee
    return _assemble(
        net_revenue_before_returns=net_rev,
        adjusted_revenue=adjusted_revenue,
        variable_cost=variable_cost,
        ad_spend=ad_spend,
        gross_revenue=gross_revenue,
        conversions=conversions,
    )


def _assemble(
    *,
    net_revenue_before_returns: Decimal,
    adjusted_revenue: Decimal,
    variable_cost: Decimal,
    ad_spend: Decimal,
    gross_revenue: Decimal,
    conversions: Decimal,
) -> ProfitResult:
    gross_profit_before_ads = adjusted_revenue - variable_cost
    net_profit = gross_profit_before_ads - ad_spend

    roas = (gross_revenue / ad_spend) if ad_spend > 0 else None
    poas = (gross_profit_before_ads / ad_spend) if ad_spend > 0 else None
    net_poas = (net_profit / ad_spend) if ad_spend > 0 else None
    contribution_margin = (
        gross_profit_before_ads / gross_revenue if gross_revenue > 0 else None
    )
    break_even_roas = (
        gross_revenue / gross_profit_before_ads if gross_profit_before_ads > 0 else None
    )

    if conversions == 0:
        waste = ad_spend
    else:
        waste = -net_profit if net_profit < 0 else _ZERO

    return ProfitResult(
        net_revenue_before_returns=_money(net_revenue_before_returns),
        adjusted_revenue=_money(adjusted_revenue),
        variable_cost=_money(variable_cost),
        gross_profit_before_ads=_money(gross_profit_before_ads),
        net_profit=_money(net_profit),
        roas=_ratio(roas),
        poas=_ratio(poas),
        net_poas=_ratio(net_poas),
        contribution_margin=_ratio(contribution_margin),
        break_even_roas=_ratio(break_even_roas),
        waste_amount=_money(waste),
    )
