from datetime import date, timedelta

from incrementality import DailyObservation, estimate_incrementality


def _series(n, spend_for):
    start = date(2026, 1, 1)
    out = []
    for i in range(n):
        spend = spend_for(i)
        out.append(DailyObservation((start + timedelta(days=i)).isoformat(),
                                    spend, 100.0 + 5.0 * spend))
    return out


# revenue = 100 + 5*spend exactly; spend alternates 80/40 (independent of weekday/trend).
def _alternating(n):
    return _series(n, lambda i: 80.0 if i % 2 == 0 else 40.0)


# ── recovery of the causal response ──────────────────────────────────────────
def test_recovers_marginal_response_and_splits_baseline_vs_incremental():
    r = estimate_incrementality(_alternating(28), margin_rate=0.5)
    assert abs(r.marginal_roas - 5.0) < 0.1            # revenue per unit spend
    assert abs(r.baseline_revenue - 2800.0) < 60       # organic (spend=0) ≈ 100/day
    assert abs(r.incremental_revenue - 8400.0) < 120   # 5 * Σspend(1680)
    assert r.spend_total == 1680.0 and r.actual_revenue == 11200.0
    assert r.r_squared > 0.99
    assert r.method == "projected_baseline_ols"
    # decomposition invariant: baseline + incremental reconstructs the fitted total (≈ actual at r²≈1)
    assert abs(r.baseline_revenue + r.incremental_revenue - r.actual_revenue) < 60


def test_incremental_profit_applies_margin_then_subtracts_spend():
    r = estimate_incrementality(_alternating(28), margin_rate=0.5)
    # 8400 incremental revenue * 0.5 margin - 1680 spend = 2520
    assert abs(r.incremental_profit - 2520.0) < 120


# ── confidence scoring from data-quality signals ─────────────────────────────
def test_long_varied_history_with_good_fit_is_high_confidence():
    assert estimate_incrementality(_alternating(28), margin_rate=0.5).confidence == "high"


def test_medium_length_history_is_medium_confidence():
    assert estimate_incrementality(_alternating(20), margin_rate=0.5).confidence == "medium"


def test_short_history_is_low_confidence():
    assert estimate_incrementality(_alternating(6), margin_rate=0.5).confidence == "low"


def test_no_spend_variation_cannot_attribute_incrementality():
    r = estimate_incrementality(_series(28, lambda i: 50.0), margin_rate=0.5)
    assert r.incremental_revenue == 0.0 and r.marginal_roas == 0.0
    assert r.confidence == "low" and r.method == "insufficient_variation"
    assert r.baseline_revenue == r.actual_revenue


def test_insufficient_data_degrades_gracefully():
    r = estimate_incrementality(_alternating(2), margin_rate=0.5)
    assert r.method == "insufficient_data"
    assert r.incremental_revenue == 0.0 and r.confidence == "low"


# ── never overclaim ──────────────────────────────────────────────────────────
def test_negative_marginal_response_is_clamped_to_zero_incremental():
    # revenue *falls* as spend rises (confounded) → don't claim negative incrementality
    obs = _series(28, lambda i: 80.0 if i % 2 == 0 else 40.0)
    obs = [DailyObservation(o.date, o.spend, 1000.0 - 4.0 * o.spend) for o in obs]
    r = estimate_incrementality(obs, margin_rate=0.5)
    assert r.marginal_roas < 0
    assert r.incremental_revenue == 0.0
    # nothing attributed → the baseline must equal (not exceed) the fitted/actual revenue
    assert abs(r.baseline_revenue - r.actual_revenue) < 50
