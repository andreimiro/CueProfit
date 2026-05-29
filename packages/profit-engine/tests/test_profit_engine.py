"""Golden tests for the deterministic profit engine.

Each test encodes a hand-computed scenario. The canonical V1 model:

  net_revenue_before_returns =
      gross_revenue / (1 + vat_rate)        if vat_mode == INCLUSIVE
      gross_revenue                         otherwise
  retention            = (1 - return_rate) * validation_rate
  adjusted_revenue     = net_revenue_before_returns * retention
  units                = conversions
  per_unit_cost        = cost_of_goods + shipping_cost + packaging_cost + other_cost
  cogs_total           = per_unit_cost * units * retention      (ecommerce only)
  payment_fee          = payment_fee_rate * net_revenue_before_returns * retention
  variable_cost        = cogs_total + payment_fee
  gross_profit_before_ads = adjusted_revenue - variable_cost
  net_profit           = gross_profit_before_ads - ad_spend
  roas                 = gross_revenue / ad_spend              (None if ad_spend == 0)
  poas                 = gross_profit_before_ads / ad_spend    (None if ad_spend == 0)
  net_poas             = net_profit / ad_spend                 (None if ad_spend == 0)
  contribution_margin  = gross_profit_before_ads / gross_revenue  (None if revenue == 0)
  break_even_roas      = gross_revenue / gross_profit_before_ads  (None if gpba <= 0)
  waste_amount         = ad_spend            if conversions == 0
                         max(0, -net_profit) otherwise

Affiliate mode: no VAT, no COGS (per-unit costs ignored); `gross_revenue` carries
the commission value.

Money outputs are rounded to 2dp; ratio outputs to 4dp.
"""

from decimal import Decimal as D

import pytest

from profit_engine import BusinessMode, ProfitInputs, VatMode, compute_profit


def _inp(**kw):
    return ProfitInputs(**kw)


def test_vat_exclusive_no_costs():
    r = compute_profit(_inp(ad_spend=D("100"), gross_revenue=D("500"), conversions=D("10")))
    assert r.net_revenue_before_returns == D("500.00")
    assert r.adjusted_revenue == D("500.00")
    assert r.variable_cost == D("0.00")
    assert r.gross_profit_before_ads == D("500.00")
    assert r.net_profit == D("400.00")
    assert r.roas == D("5.0000")
    assert r.poas == D("5.0000")
    assert r.net_poas == D("4.0000")
    assert r.contribution_margin == D("1.0000")
    assert r.break_even_roas == D("1.0000")
    assert r.waste_amount == D("0.00")


def test_vat_inclusive_with_cogs():
    r = compute_profit(_inp(
        ad_spend=D("100"), gross_revenue=D("600"), conversions=D("10"),
        vat_mode=VatMode.INCLUSIVE, vat_rate=D("0.20"), cost_of_goods=D("20"),
    ))
    assert r.net_revenue_before_returns == D("500.00")
    assert r.adjusted_revenue == D("500.00")
    assert r.variable_cost == D("200.00")
    assert r.gross_profit_before_ads == D("300.00")
    assert r.net_profit == D("200.00")
    assert r.roas == D("6.0000")
    assert r.poas == D("3.0000")
    assert r.net_poas == D("2.0000")
    assert r.contribution_margin == D("0.5000")
    assert r.break_even_roas == D("2.0000")


def test_returns_and_validation_scale_revenue_and_costs():
    r = compute_profit(_inp(
        ad_spend=D("50"), gross_revenue=D("1000"), conversions=D("20"),
        return_rate=D("0.10"), validation_rate=D("0.95"),
        cost_of_goods=D("15"), shipping_cost=D("5"), payment_fee_rate=D("0.02"),
    ))
    assert r.adjusted_revenue == D("855.00")
    assert r.variable_cost == D("359.10")          # cogs 342 + payment_fee 17.10
    assert r.gross_profit_before_ads == D("495.90")
    assert r.net_profit == D("445.90")
    assert r.poas == D("9.9180")
    assert r.net_poas == D("8.9180")
    assert r.contribution_margin == D("0.4959")
    assert r.break_even_roas == D("2.0165")


def test_zero_conversions_is_full_waste():
    r = compute_profit(_inp(ad_spend=D("80"), gross_revenue=D("0"), conversions=D("0")))
    assert r.net_profit == D("-80.00")
    assert r.roas == D("0.0000")
    assert r.net_poas == D("-1.0000")
    assert r.contribution_margin is None
    assert r.break_even_roas is None
    assert r.waste_amount == D("80.00")


def test_good_roas_but_negative_profit():
    """The core thesis: ROAS 3.0 looks fine but the product loses money."""
    r = compute_profit(_inp(
        ad_spend=D("100"), gross_revenue=D("300"), conversions=D("10"),
        cost_of_goods=D("22"),
    ))
    assert r.roas == D("3.0000")
    assert r.gross_profit_before_ads == D("80.00")
    assert r.net_profit == D("-20.00")
    assert r.net_poas == D("-0.2000")
    assert r.break_even_roas == D("3.7500")        # need ROAS 3.75 to break even
    assert r.waste_amount == D("20.00")


def test_zero_ad_spend_ratios_are_none():
    r = compute_profit(_inp(
        ad_spend=D("0"), gross_revenue=D("200"), conversions=D("5"), cost_of_goods=D("10"),
    ))
    assert r.gross_profit_before_ads == D("150.00")
    assert r.net_profit == D("150.00")
    assert r.roas is None
    assert r.poas is None
    assert r.net_poas is None
    assert r.contribution_margin == D("0.7500")
    assert r.break_even_roas == D("1.3333")
    assert r.waste_amount == D("0.00")


def test_affiliate_mode_no_vat_no_cogs():
    r = compute_profit(_inp(
        mode=BusinessMode.AFFILIATE,
        ad_spend=D("40"), gross_revenue=D("120"), conversions=D("4"),
        validation_rate=D("0.9"),
        cost_of_goods=D("999"),    # must be ignored in affiliate mode
        vat_mode=VatMode.INCLUSIVE, vat_rate=D("0.20"),  # VAT ignored in affiliate mode
    ))
    assert r.adjusted_revenue == D("108.00")
    assert r.variable_cost == D("0.00")
    assert r.gross_profit_before_ads == D("108.00")
    assert r.net_profit == D("68.00")
    assert r.roas == D("3.0000")
    assert r.poas == D("2.7000")
    assert r.net_poas == D("1.7000")
    assert r.contribution_margin == D("0.9000")
    assert r.break_even_roas == D("1.1111")


def test_inputs_reject_negative_spend():
    with pytest.raises(ValueError):
        compute_profit(_inp(ad_spend=D("-1"), gross_revenue=D("10")))
