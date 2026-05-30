"""Profit recompute: synced stats + product costs → profit_daily_facts.

Product facts use real per-SKU costs (high confidence) when available, else the
workspace default contribution margin (medium), else no-COGS (low). Campaign and
account facts use the margin model so they cover ALL spend (search/PMax included).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Protocol

from profit_engine import (
    ProfitInputs,
    ProfitResult,
    VatMode,
    compute_profit,
    compute_profit_from_margin,
)

_ONE = Decimal("1")


def _dec(*values: Any, default: Any = None) -> Decimal | None:
    for v in values:
        if v is not None:
            return Decimal(str(v))
    return Decimal(str(default)) if default is not None else None


def _vat_mode(ws: dict) -> VatMode:
    try:
        return VatMode(ws.get("vat_mode") or "unknown")
    except ValueError:
        return VatMode.UNKNOWN


class ProfitStore(Protocol):
    def get_workspace(self, workspace_id: str) -> dict: ...
    def read_product_stats(self, workspace_id: str, start: str, end: str) -> list[dict]: ...
    def read_campaign_stats(self, workspace_id: str, start: str, end: str) -> list[dict]: ...
    def read_product_costs(self, workspace_id: str) -> dict[str, dict]: ...
    def upsert_profit_facts(self, *, workspace_id: str, rows: list[dict]) -> int: ...


def _compute_product(stat: dict, cost: dict | None, ws: VatMode | dict) -> tuple[ProfitResult, str]:
    spend = _dec(stat.get("spend"), default=0)
    revenue = _dec(stat.get("conversion_value"), default=0)
    conv = _dec(stat.get("conversions"), default=0)
    vat_mode = _vat_mode(ws)

    if cost and cost.get("cost_of_goods") is not None:
        result = compute_profit(ProfitInputs(
            ad_spend=spend, gross_revenue=revenue, conversions=conv, vat_mode=vat_mode,
            vat_rate=_dec(cost.get("vat_rate"), ws.get("default_vat_rate"), default=0),
            return_rate=_dec(cost.get("return_rate"), ws.get("default_return_rate"), default=0),
            validation_rate=_dec(cost.get("validation_rate"), ws.get("default_validation_rate"), default=1),
            cost_of_goods=_dec(cost.get("cost_of_goods"), default=0),
            shipping_cost=_dec(cost.get("shipping_cost"), default=0),
            packaging_cost=_dec(cost.get("packaging_cost"), default=0),
            other_cost=_dec(cost.get("other_cost"), default=0),
            payment_fee_rate=_dec(cost.get("payment_fee_rate"), ws.get("default_payment_fee_rate"), default=0),
        ))
        return result, "high"
    return _compute_by_margin(spend, revenue, conv, ws)


def _compute_by_margin(spend, revenue, conv, ws: dict) -> tuple[ProfitResult, str]:
    margin = ws.get("default_margin_rate")
    confidence = "medium" if margin is not None else "low"
    result = compute_profit_from_margin(
        ad_spend=spend, gross_revenue=revenue, conversions=conv, vat_mode=_vat_mode(ws),
        margin_rate=_dec(margin, default=1) or _ONE,
        vat_rate=_dec(ws.get("default_vat_rate"), default=0),
        return_rate=_dec(ws.get("default_return_rate"), default=0),
        validation_rate=_dec(ws.get("default_validation_rate"), default=1),
        payment_fee_rate=_dec(ws.get("default_payment_fee_rate"), default=0),
    )
    return result, confidence


def _fact_row(*, workspace_id, date, entity_type, entity_id, spend, revenue, result, confidence, currency) -> dict:
    def f(x):
        return float(x) if x is not None else None

    return {
        "workspace_id": workspace_id, "date": date, "entity_type": entity_type, "entity_id": str(entity_id),
        "spend": float(spend), "revenue": float(revenue),
        "adjusted_revenue": f(result.adjusted_revenue), "variable_cost": f(result.variable_cost),
        "gross_profit_before_ads": f(result.gross_profit_before_ads), "net_profit": f(result.net_profit),
        "poas": f(result.poas), "net_poas": f(result.net_poas), "break_even_roas": f(result.break_even_roas),
        "waste_amount": f(result.waste_amount), "confidence": confidence, "currency": currency,
    }


def _aggregate_account(workspace_id: str, campaign_facts: list[dict], currency: str | None) -> list[dict]:
    by_date: dict[str, dict] = {}
    _sum_keys = ("spend", "revenue", "adjusted_revenue", "variable_cost",
                 "gross_profit_before_ads", "net_profit", "waste_amount")
    for f in campaign_facts:
        agg = by_date.setdefault(f["date"], dict.fromkeys(_sum_keys, 0.0))
        for k in _sum_keys:
            agg[k] += f.get(k) or 0.0

    rows = []
    for date, agg in by_date.items():
        spend, gp, rev, net = agg["spend"], agg["gross_profit_before_ads"], agg["revenue"], agg["net_profit"]
        rows.append({
            "workspace_id": workspace_id, "date": date, "entity_type": "account", "entity_id": "account",
            **{k: round(v, 2) for k, v in agg.items()},
            "poas": round(gp / spend, 4) if spend > 0 else None,
            "net_poas": round(net / spend, 4) if spend > 0 else None,
            "break_even_roas": round(rev / gp, 4) if gp > 0 else None,
            "confidence": "medium", "currency": currency,
        })
    return rows


def recompute_workspace_profit(*, store: ProfitStore, workspace_id: str, start: str, end: str) -> dict:
    ws = store.get_workspace(workspace_id)
    currency = ws.get("currency")
    costs = store.read_product_costs(workspace_id)

    facts: list[dict] = []

    for stat in store.read_product_stats(workspace_id, start, end):
        result, confidence = _compute_product(stat, costs.get(stat.get("product_id")), ws)
        facts.append(_fact_row(
            workspace_id=workspace_id, date=stat["date"], entity_type="product",
            entity_id=stat["ads_item_id"], spend=_dec(stat.get("spend"), default=0),
            revenue=_dec(stat.get("conversion_value"), default=0), result=result,
            confidence=confidence, currency=stat.get("currency") or currency,
        ))

    campaign_facts: list[dict] = []
    for stat in store.read_campaign_stats(workspace_id, start, end):
        result, confidence = _compute_by_margin(
            _dec(stat.get("spend"), default=0), _dec(stat.get("conversion_value"), default=0),
            _dec(stat.get("conversions"), default=0), ws,
        )
        campaign_facts.append(_fact_row(
            workspace_id=workspace_id, date=stat["date"], entity_type="campaign",
            entity_id=stat["campaign_id"], spend=_dec(stat.get("spend"), default=0),
            revenue=_dec(stat.get("conversion_value"), default=0), result=result,
            confidence=confidence, currency=stat.get("currency") or currency,
        ))

    facts.extend(campaign_facts)
    facts.extend(_aggregate_account(workspace_id, campaign_facts, currency))

    n = store.upsert_profit_facts(workspace_id=workspace_id, rows=facts)
    return {"facts": n}


# ── In-memory fake ─────────────────────────────────────────────────────────
class FakeProfitStore:
    def __init__(self) -> None:
        self.workspace: dict = {}
        self.product_stats: list[dict] = []
        self.campaign_stats: list[dict] = []
        self.costs: dict[str, dict] = {}
        self.facts: list[dict] = []

    def get_workspace(self, workspace_id) -> dict:
        return self.workspace

    def read_product_stats(self, workspace_id, start, end) -> list[dict]:
        return self.product_stats

    def read_campaign_stats(self, workspace_id, start, end) -> list[dict]:
        return self.campaign_stats

    def read_product_costs(self, workspace_id) -> dict[str, dict]:
        return self.costs

    def upsert_profit_facts(self, *, workspace_id, rows) -> int:
        self.facts.extend(rows)
        return len(rows)
