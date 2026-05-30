from cueprofit_workers.profit import FakeProfitStore, recompute_workspace_profit


def _store() -> FakeProfitStore:
    s = FakeProfitStore()
    s.workspace = {
        "vat_mode": "exclusive", "currency": "RON", "default_margin_rate": 0.3,
        "default_vat_rate": 0, "default_return_rate": 0,
        "default_validation_rate": 1, "default_payment_fee_rate": 0,
    }
    s.product_stats = [
        {"date": "2026-05-29", "customer_id": 1, "campaign_id": 10, "ads_item_id": "sku1",
         "product_id": "A", "spend": 100, "conversions": 10, "conversion_value": 300, "currency": "RON"},
        {"date": "2026-05-29", "customer_id": 1, "campaign_id": 10, "ads_item_id": "sku2",
         "product_id": None, "spend": 50, "conversions": 2, "conversion_value": 200, "currency": "RON"},
    ]
    s.campaign_stats = [
        {"date": "2026-05-29", "customer_id": 1, "campaign_id": 10,
         "spend": 150, "conversions": 12, "conversion_value": 500, "currency": "RON"},
    ]
    s.costs = {"A": {"cost_of_goods": 22}}
    return s


def test_recompute_emits_product_campaign_and_account_facts():
    store = _store()
    out = recompute_workspace_profit(store=store, workspace_id="ws1", start="2026-05-01", end="2026-05-31")
    assert out["facts"] == 4  # 2 product + 1 campaign + 1 account

    prod = {f["entity_id"]: f for f in store.facts if f["entity_type"] == "product"}
    camp = [f for f in store.facts if f["entity_type"] == "campaign"]
    acct = [f for f in store.facts if f["entity_type"] == "account"]
    assert len(prod) == 2 and len(camp) == 1 and len(acct) == 1


def test_product_with_real_cost_is_high_confidence_and_correct():
    store = _store()
    recompute_workspace_profit(store=store, workspace_id="ws1", start="2026-05-01", end="2026-05-31")
    sku1 = next(f for f in store.facts if f["entity_id"] == "sku1")
    assert sku1["confidence"] == "high"
    assert sku1["gross_profit_before_ads"] == 80.0   # 300 rev - 220 cogs
    assert sku1["net_profit"] == -20.0               # the loss-making product


def test_product_without_cost_falls_back_to_default_margin_medium_confidence():
    store = _store()
    recompute_workspace_profit(store=store, workspace_id="ws1", start="2026-05-01", end="2026-05-31")
    sku2 = next(f for f in store.facts if f["entity_id"] == "sku2")
    assert sku2["confidence"] == "medium"
    assert sku2["gross_profit_before_ads"] == 60.0   # 200 * 0.30
    assert sku2["net_profit"] == 10.0


def test_account_fact_sums_campaign_facts():
    store = _store()
    recompute_workspace_profit(store=store, workspace_id="ws1", start="2026-05-01", end="2026-05-31")
    acct = next(f for f in store.facts if f["entity_type"] == "account")
    assert acct["spend"] == 150.0
    assert acct["gross_profit_before_ads"] == 150.0  # 500 * 0.30
    assert acct["net_profit"] == 0.0
