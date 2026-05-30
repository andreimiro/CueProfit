"""Projected incrementality: how much revenue/profit ads actually *added*.

V1 fits a deterministic least-squares baseline of daily revenue on an intercept,
a linear trend, weekday dummies (Monday reference) and ad spend. The spend
coefficient is the modeled marginal response; the spend=0 prediction is the
organic baseline (the counterfactual). Incremental revenue is the spend
contribution; incremental profit applies the contribution margin then subtracts
the ad spend. Everything here is *projected / estimated*, never proven — and we
refuse to attribute incrementality when there isn't enough spend variation or
history to support it, and never claim a negative-response confound as a gain.

Pure Python (no numpy/statsmodels) so it stays dependency-free and deterministic.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import date

# Feature layout: [intercept, trend, Tue..Sun dummies (6), spend]  → 9 columns.
_SPEND = -1
_MIN_FIT_DAYS = 3
_MIN_CONFIDENT_DAYS = 14
_MIN_SPEND_CV = 0.05


@dataclass(frozen=True)
class DailyObservation:
    date: str       # ISO yyyy-mm-dd
    spend: float
    revenue: float


@dataclass(frozen=True)
class IncrementalityResult:
    method: str                 # projected_baseline_ols | insufficient_variation | insufficient_data
    days: int
    spend_total: float
    actual_revenue: float
    baseline_revenue: float     # modeled organic (counterfactual, no ad spend)
    incremental_revenue: float  # modeled ad-driven revenue
    marginal_roas: float        # spend coefficient (revenue per unit spend)
    incremental_profit: float   # incremental_revenue * margin - spend
    margin_rate: float
    r_squared: float
    confidence: str             # low | medium | high
    confidence_factors: dict


# ── linear algebra (normal equations + Gaussian elimination) ─────────────────
def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _solve(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    n = len(rhs)
    a = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(a[r][col]))
        a[col], a[pivot] = a[pivot], a[col]
        piv = a[col][col] or 1e-12
        for r in range(n):
            if r != col:
                factor = a[r][col] / piv
                a[r] = [a[r][k] - factor * a[col][k] for k in range(n + 1)]
    return [a[i][n] / (a[i][i] or 1e-12) for i in range(n)]


def _ols(x: list[list[float]], y: list[float]) -> list[float]:
    k = len(x[0])
    xtx = [[sum(x[r][i] * x[r][j] for r in range(len(x))) for j in range(k)] for i in range(k)]
    xty = [sum(x[r][i] * y[r] for r in range(len(x))) for i in range(k)]
    ridge = 1e-9 * (sum(xtx[i][i] for i in range(k)) / k)  # negligible, just conditions XtX
    for i in range(k):
        xtx[i][i] += ridge
    return _solve(xtx, xty)


def _features(obs: DailyObservation, i: int, n: int) -> list[float]:
    weekday = date.fromisoformat(obs.date).weekday()  # 0=Mon .. 6=Sun
    row = [1.0, i / max(1, n - 1)]
    row += [1.0 if weekday == w else 0.0 for w in range(1, 7)]  # Tue..Sun (Mon = reference)
    row.append(obs.spend)
    return row


def _r_squared(y: list[float], pred: list[float]) -> float:
    mean = statistics.mean(y)
    ss_tot = sum((v - mean) ** 2 for v in y)
    if ss_tot == 0:
        return 0.0
    ss_res = sum((v - p) ** 2 for v, p in zip(y, pred))
    return 1.0 - ss_res / ss_tot


def _cv(values: list[float]) -> float:
    mean = statistics.mean(values) if values else 0.0
    if mean == 0:
        return 0.0
    # coefficient of variation is non-negative by definition (σ / |μ|)
    return statistics.pstdev(values) / abs(mean)


def _confidence(days: int, r2: float, spend_cv: float) -> tuple[str, dict]:
    factors = {"days": days, "r_squared": round(r2, 4), "spend_cv": round(spend_cv, 4)}
    if days < _MIN_CONFIDENT_DAYS or spend_cv < _MIN_SPEND_CV:
        return "low", factors
    score = (days >= 28) + (r2 >= 0.5) + (spend_cv >= 0.15)
    return ("high" if score == 3 else "medium" if score == 2 else "low"), factors


def _degraded(method: str, days: int, spend_total: float, actual_revenue: float,
              margin_rate: float) -> IncrementalityResult:
    return IncrementalityResult(
        method=method, days=days, spend_total=round(spend_total, 2),
        actual_revenue=round(actual_revenue, 2), baseline_revenue=round(actual_revenue, 2),
        incremental_revenue=0.0, marginal_roas=0.0, incremental_profit=0.0,
        margin_rate=margin_rate, r_squared=0.0, confidence="low",
        confidence_factors={"days": days, "reason": method},
    )


def estimate_incrementality(observations, *, margin_rate: float) -> IncrementalityResult:
    obs = list(observations)
    n = len(obs)
    spend_total = sum(o.spend for o in obs)
    actual_revenue = sum(o.revenue for o in obs)
    spend_cv = _cv([o.spend for o in obs])

    if n < _MIN_FIT_DAYS:
        return _degraded("insufficient_data", n, spend_total, actual_revenue, margin_rate)
    if spend_cv < _MIN_SPEND_CV:
        return _degraded("insufficient_variation", n, spend_total, actual_revenue, margin_rate)

    x = [_features(o, i, n) for i, o in enumerate(obs)]
    y = [o.revenue for o in obs]
    coefs = _ols(x, y)
    beta = coefs[_SPEND]
    preds = [_dot(x[i], coefs) for i in range(n)]
    r2 = _r_squared(y, preds)

    # Attribute only a non-negative ad response (never claim a negative-response confound),
    # and use that SAME effective beta for the baseline so the decomposition is exact:
    # baseline + incremental == Σ fitted revenue (no asymmetric per-day clamp).
    beta_eff = max(0.0, beta)
    incremental_revenue = beta_eff * spend_total
    baseline_revenue = sum(preds) - incremental_revenue
    incremental_profit = incremental_revenue * margin_rate - spend_total
    confidence, factors = _confidence(n, r2, spend_cv)

    return IncrementalityResult(
        method="projected_baseline_ols", days=n, spend_total=round(spend_total, 2),
        actual_revenue=round(actual_revenue, 2), baseline_revenue=round(baseline_revenue, 2),
        incremental_revenue=round(incremental_revenue, 2), marginal_roas=round(beta, 4),
        incremental_profit=round(incremental_profit, 2), margin_rate=margin_rate,
        r_squared=round(r2, 4), confidence=confidence, confidence_factors=factors,
    )
