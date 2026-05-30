"""Deterministic recommendation engine: profit_daily_facts → recommendations.

Aggregates each entity's facts over the period, then applies a mutually-exclusive
rule cascade driven by recommendation_thresholds. Rows are upserted idempotently
(unique on workspace, rule_key, entity, period_start), so re-running refreshes the
numbers rather than duplicating — and `status`/`resolved_at` are intentionally NOT
emitted, so a user's acknowledge/dismiss survives the next run.

V1 operates purely on the materialized money signals in profit_daily_facts
(spend / revenue / profit / poas / waste). Volume-based gates from the spec
(min_clicks_for_waste, min_conversions_to_scale) wait until facts carry counts;
until then `waste_spend_threshold` is the single materiality gate. Account-level
facts are rollups, not action targets, so only campaign/product entities fire.

Known follow-up: a rule that stops firing for an entity leaves its prior `open`
recommendation in place — an "expire stale recommendations" pass is a separate step.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol

# Engine defaults for keys absent from a workspace's stored threshold config.
DEFAULT_THRESHOLDS: dict = {
    "waste_spend_threshold": 50.0,   # min periodic spend for a finding to be material
    "good_roas_floor": 3.0,          # ROAS that "looks healthy" to a ROAS optimizer
    "scale_poas_multiplier": 1.2,    # POAS headroom above break-even (1.0) to scale
}

ACTIONABLE_ENTITIES = ("campaign", "product")
_CONF_RANK = {"low": 0, "medium": 1, "high": 2}


@dataclass(frozen=True)
class EntitySummary:
    entity_type: str
    entity_id: str
    spend: float
    revenue: float
    gross_profit_before_ads: float
    net_profit: float
    waste_amount: float
    poas: Optional[float]
    roas: Optional[float]
    net_poas: Optional[float]
    confidence: Optional[str]
    currency: Optional[str]
    days: int


def _num(v) -> float:
    return float(v) if v is not None else 0.0


def aggregate_facts(facts: list[dict]) -> list[EntitySummary]:
    """Group daily facts by (entity_type, entity_id) and derive period ratios."""
    grouped: dict[tuple[str, str], dict] = {}
    for f in facts:
        key = (f["entity_type"], str(f["entity_id"]))
        g = grouped.setdefault(key, {
            "spend": 0.0, "revenue": 0.0, "gross_profit_before_ads": 0.0,
            "net_profit": 0.0, "waste_amount": 0.0, "days": 0,
            "confidences": [], "currency": None,
        })
        for k in ("spend", "revenue", "gross_profit_before_ads", "net_profit", "waste_amount"):
            g[k] += _num(f.get(k))
        g["days"] += 1
        if f.get("confidence"):
            g["confidences"].append(f["confidence"])
        if g["currency"] is None and f.get("currency"):
            g["currency"] = f["currency"]

    out: list[EntitySummary] = []
    for (etype, eid), g in grouped.items():
        spend, gp = round(g["spend"], 2), round(g["gross_profit_before_ads"], 2)
        rev, net = round(g["revenue"], 2), round(g["net_profit"], 2)
        confs = g["confidences"]
        out.append(EntitySummary(
            entity_type=etype, entity_id=eid, spend=spend, revenue=rev,
            gross_profit_before_ads=gp, net_profit=net,
            waste_amount=round(g["waste_amount"], 2),
            poas=round(gp / spend, 4) if spend > 0 else None,
            roas=round(rev / spend, 4) if spend > 0 else None,
            net_poas=round(net / spend, 4) if spend > 0 else None,
            confidence=min(confs, key=lambda c: _CONF_RANK.get(c, 0)) if confs else None,
            currency=g["currency"], days=g["days"],
        ))
    return out


def _rec(summary: EntitySummary, ws: dict, period, *, kind, rule_key, severity,
         title, expected_impact, evidence) -> dict:
    start, end = period
    return {
        "entity_type": summary.entity_type,
        "entity_id": summary.entity_id,
        "kind": kind,
        "rule_key": rule_key,
        "severity": severity,
        "title": title,
        "description": None,
        "expected_impact": round(expected_impact, 2) if expected_impact is not None else None,
        "impact_currency": summary.currency or ws.get("currency"),
        "confidence": summary.confidence,
        "evidence": evidence,
        "period_start": start,
        "period_end": end,
    }


def evaluate(summary: EntitySummary, thresholds: dict | None, ws: dict, period) -> Optional[dict]:
    """Return the single recommendation this entity warrants, or None."""
    if summary.entity_type not in ACTIONABLE_ENTITIES:
        return None
    t = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    if summary.spend < float(t["waste_spend_threshold"]):
        return None

    spend, net = summary.spend, summary.net_profit
    roas, poas = summary.roas or 0.0, summary.poas or 0.0
    cur = (summary.currency or ws.get("currency") or "").strip()

    # 1. Pure waste — material spend, zero conversion value.
    if summary.revenue <= 0:
        return _rec(summary, ws, period, kind="wasted_spend", rule_key="wasted_spend",
                    severity="high", title=f"No return on {spend:.0f} {cur}".strip(),
                    expected_impact=spend,
                    evidence={"spend": spend, "revenue": summary.revenue, "net_profit": net})

    # 2. Losing money — split by whether ROAS *looks* healthy (the core thesis).
    if net < 0:
        if roas >= float(t["good_roas_floor"]):
            return _rec(summary, ws, period, kind="good_roas_bad_profit",
                        rule_key="good_roas_bad_profit", severity="high",
                        title=f"{roas:.1f}x ROAS but losing money", expected_impact=-net,
                        evidence={"roas": roas, "poas": poas, "net_profit": net,
                                  "spend": spend, "revenue": summary.revenue})
        return _rec(summary, ws, period, kind="reduce", rule_key="reduce_unprofitable",
                    severity="medium", title=f"Unprofitable at {roas:.1f}x ROAS",
                    expected_impact=-net,
                    evidence={"roas": roas, "poas": poas, "net_profit": net, "spend": spend})

    # 3. Profitable with headroom — scale candidate.
    if net > 0 and poas >= float(t["scale_poas_multiplier"]):
        return _rec(summary, ws, period, kind="scale", rule_key="scale_candidate",
                    severity="low", title=f"Scale — {poas:.2f} POAS, {net:.0f} {cur} profit".strip(),
                    expected_impact=net,
                    evidence={"poas": poas, "roas": roas, "net_profit": net, "spend": spend})

    return None


def generate_workspace_recommendations(*, store: "RecommendationStore",
                                       workspace_id: str, start: str, end: str) -> dict:
    ws = store.get_workspace(workspace_id)
    thresholds = store.get_thresholds(workspace_id)
    facts = store.read_profit_facts(workspace_id, start, end)
    period = (start, end)

    rows: list[dict] = []
    for summary in aggregate_facts(facts):
        rec = evaluate(summary, thresholds, ws, period)
        if rec is not None:
            rows.append({**rec, "workspace_id": workspace_id})

    n = store.upsert_recommendations(workspace_id=workspace_id, rows=rows)
    return {"recommendations": n}


# ── store protocol + in-memory fake ──────────────────────────────────────────
class RecommendationStore(Protocol):
    def get_workspace(self, workspace_id: str) -> dict: ...
    def get_thresholds(self, workspace_id: str) -> dict: ...
    def read_profit_facts(self, workspace_id: str, start: str, end: str) -> list[dict]: ...
    def upsert_recommendations(self, *, workspace_id: str, rows: list[dict]) -> int: ...


class FakeRecommendationStore:
    def __init__(self) -> None:
        self.workspace: dict = {}
        self.thresholds: dict = {}
        self.facts: list[dict] = []
        self.recs: list[dict] = []

    def get_workspace(self, workspace_id) -> dict:
        return self.workspace

    def get_thresholds(self, workspace_id) -> dict:
        return self.thresholds

    def read_profit_facts(self, workspace_id, start, end) -> list[dict]:
        return self.facts

    def upsert_recommendations(self, *, workspace_id, rows) -> int:
        self.recs.extend(rows)
        return len(rows)
