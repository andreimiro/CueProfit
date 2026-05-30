from cueprofit_workers.recommendations import (
    DEFAULT_THRESHOLDS,
    FakeRecommendationStore,
    aggregate_facts,
    evaluate,
    generate_workspace_recommendations,
)

WS = {"currency": "RON"}
PERIOD = ("2026-05-01", "2026-05-31")


def _fact(**kw) -> dict:
    base = {
        "entity_type": "product", "entity_id": "x", "date": "2026-05-01",
        "spend": 0, "revenue": 0, "gross_profit_before_ads": 0, "net_profit": 0,
        "waste_amount": 0, "confidence": "high", "currency": "RON",
    }
    base.update(kw)
    return base


def _summary(**kw):
    return aggregate_facts([_fact(**kw)])[0]


# ── aggregate_facts ──────────────────────────────────────────────────────────
def test_aggregate_sums_per_entity_and_derives_ratios():
    facts = [
        _fact(entity_id="sku1", date="2026-05-01", spend=100, revenue=300,
              gross_profit_before_ads=80, net_profit=-20),
        _fact(entity_id="sku1", date="2026-05-02", spend=100, revenue=300,
              gross_profit_before_ads=80, net_profit=-20),
    ]
    [s] = aggregate_facts(facts)
    assert s.entity_id == "sku1" and s.days == 2
    assert s.spend == 200 and s.revenue == 600 and s.net_profit == -40
    assert s.poas == 0.8    # 160 / 200
    assert s.roas == 3.0    # 600 / 200
    assert s.currency == "RON" and s.confidence == "high"


def test_aggregate_keeps_entities_separate_and_takes_lowest_confidence():
    facts = [
        _fact(entity_type="product", entity_id="a", spend=10, confidence="high"),
        _fact(entity_type="product", entity_id="a", spend=10, confidence="medium"),
        _fact(entity_type="campaign", entity_id="a", spend=10, confidence="high"),
    ]
    by_key = {(s.entity_type, s.entity_id): s for s in aggregate_facts(facts)}
    assert len(by_key) == 2  # ("product","a") and ("campaign","a") are distinct
    assert by_key[("product", "a")].confidence == "medium"  # lowest of the two


def test_aggregate_handles_zero_spend_without_dividing():
    s = _summary(entity_id="z", spend=0, revenue=0)
    assert s.poas is None and s.roas is None and s.net_poas is None


# ── rules (via evaluate) ─────────────────────────────────────────────────────
def test_zero_revenue_material_spend_is_wasted_spend():
    rec = evaluate(_summary(spend=200, revenue=0, gross_profit_before_ads=0, net_profit=-200),
                   DEFAULT_THRESHOLDS, WS, PERIOD)
    assert rec["kind"] == "wasted_spend" and rec["rule_key"] == "wasted_spend"
    assert rec["severity"] == "high"
    assert rec["expected_impact"] == 200.0
    assert rec["evidence"]["revenue"] == 0


def test_high_roas_but_net_loss_is_good_roas_bad_profit():
    rec = evaluate(_summary(spend=100, revenue=400, gross_profit_before_ads=80, net_profit=-20),
                   DEFAULT_THRESHOLDS, WS, PERIOD)
    assert rec["kind"] == "good_roas_bad_profit" and rec["rule_key"] == "good_roas_bad_profit"
    assert rec["severity"] == "high"
    assert rec["expected_impact"] == 20.0       # the loss recoverable
    assert rec["evidence"]["roas"] == 4.0


def test_low_roas_net_loss_is_reduce():
    rec = evaluate(_summary(spend=100, revenue=120, gross_profit_before_ads=20, net_profit=-30),
                   DEFAULT_THRESHOLDS, WS, PERIOD)
    assert rec["kind"] == "reduce" and rec["rule_key"] == "reduce_unprofitable"
    assert rec["severity"] == "medium"
    assert rec["expected_impact"] == 30.0


def test_profitable_high_poas_is_scale():
    rec = evaluate(_summary(spend=100, revenue=600, gross_profit_before_ads=150, net_profit=50),
                   DEFAULT_THRESHOLDS, WS, PERIOD)
    assert rec["kind"] == "scale" and rec["rule_key"] == "scale_candidate"
    assert rec["severity"] == "low"
    assert rec["expected_impact"] == 50.0


def test_below_spend_threshold_yields_no_recommendation():
    assert evaluate(_summary(spend=10, revenue=0, gross_profit_before_ads=0, net_profit=-10),
                    DEFAULT_THRESHOLDS, WS, PERIOD) is None


def test_thin_profit_below_scale_multiplier_yields_no_recommendation():
    # poas 1.05 (< 1.2 multiplier), small positive net → healthy, no action
    assert evaluate(_summary(spend=100, revenue=420, gross_profit_before_ads=105, net_profit=5),
                    DEFAULT_THRESHOLDS, WS, PERIOD) is None


def test_recommendation_carries_entity_confidence_and_currency():
    rec = evaluate(_summary(spend=200, revenue=0, gross_profit_before_ads=0, net_profit=-200,
                            confidence="medium", currency="RON"),
                   DEFAULT_THRESHOLDS, WS, PERIOD)
    assert rec["confidence"] == "medium" and rec["impact_currency"] == "RON"
    assert rec["period_start"] == "2026-05-01" and rec["period_end"] == "2026-05-31"


# ── orchestration ────────────────────────────────────────────────────────────
def test_generate_skips_account_rollup_and_upserts_actionable_recs():
    store = FakeRecommendationStore()
    store.workspace = {"currency": "RON"}
    store.thresholds = {}  # fall back to engine defaults
    store.facts = [
        _fact(entity_type="product", entity_id="sku1", spend=100, revenue=400,
              gross_profit_before_ads=80, net_profit=-20, confidence="high"),
        _fact(entity_type="campaign", entity_id="c1", spend=100, revenue=600,
              gross_profit_before_ads=150, net_profit=50, confidence="medium"),
        _fact(entity_type="account", entity_id="account", spend=200, revenue=1000,
              gross_profit_before_ads=230, net_profit=30, confidence="medium"),
    ]
    out = generate_workspace_recommendations(store=store, workspace_id="ws1",
                                             start="2026-05-01", end="2026-05-31")
    assert out["recommendations"] == 2
    kinds = {r["entity_id"]: r["kind"] for r in store.recs}
    assert kinds == {"sku1": "good_roas_bad_profit", "c1": "scale"}
    assert all(r["workspace_id"] == "ws1" for r in store.recs)
    assert all(r["period_start"] == "2026-05-01" and r["period_end"] == "2026-05-31"
               for r in store.recs)


def test_stored_thresholds_override_engine_defaults():
    store = FakeRecommendationStore()
    store.workspace = {"currency": "RON"}
    store.thresholds = {"waste_spend_threshold": 1000}  # raise materiality past the loss
    store.facts = [
        _fact(entity_type="product", entity_id="sku1", spend=100, revenue=0,
              gross_profit_before_ads=0, net_profit=-100),
    ]
    out = generate_workspace_recommendations(store=store, workspace_id="ws1",
                                             start="2026-05-01", end="2026-05-31")
    assert out["recommendations"] == 0


def test_generated_rows_omit_status_so_reruns_preserve_user_state():
    # status is left to the DB default / preserved on conflict, never emitted here.
    rec = evaluate(_summary(spend=200, revenue=0, net_profit=-200),
                   DEFAULT_THRESHOLDS, WS, PERIOD)
    assert "status" not in rec and "resolved_at" not in rec
