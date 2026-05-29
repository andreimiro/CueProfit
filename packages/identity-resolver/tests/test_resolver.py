"""Golden tests for the Product Identity Resolver.

Cascade priority (highest first):
  MANUAL → OFFER_ID → ITEM_ID → SKU → GTIN → LANDING_URL → TITLE → NONE

A method matches only if its key resolves to exactly ONE product. If a key
resolves to multiple products it is ambiguous and the cascade falls through;
when nothing matches and ambiguity was seen, Resolution.ambiguous is True.

Confidence: MANUAL/OFFER_ID/ITEM_ID = 1.0, SKU/GTIN = 0.95, LANDING_URL = 0.8,
TITLE = 0.6, NONE = 0.0.
"""

from identity_resolver import (
    Candidate,
    MatchMethod,
    Product,
    build_index,
    resolve,
)


def _index(*products):
    return build_index(products)


def test_manual_override_wins_over_offer_id():
    idx = _index(
        Product(product_id="A", offer_id="OFF1"),
        Product(product_id="B", offer_id="OFF2"),
    )
    cand = Candidate(ads_item_id="OFF1")  # would match A by item_id
    r = resolve(cand, idx, manual={"OFF1": "B"})
    assert r.product_id == "B"
    assert r.method == MatchMethod.MANUAL
    assert r.confidence == 1.0


def test_offer_id_exact_match():
    idx = _index(Product(product_id="A", offer_id="SKU123"))
    r = resolve(Candidate(ads_item_id="x", offer_id="SKU123"), idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.OFFER_ID
    assert r.confidence == 1.0


def test_item_id_matches_product_offer_id():
    idx = _index(Product(product_id="A", offer_id="SKU123"))
    # No candidate.offer_id; the Ads item_id itself is the offer id.
    r = resolve(Candidate(ads_item_id="SKU123"), idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.ITEM_ID
    assert r.confidence == 1.0


def test_item_id_matches_merchant_product_id_case_insensitive():
    idx = _index(Product(product_id="A", merchant_product_id="online:en:ro:sku123"))
    r = resolve(Candidate(ads_item_id="online:en:RO:SKU123"), idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.ITEM_ID


def test_sku_match():
    idx = _index(Product(product_id="A", sku="ABC-9"))
    r = resolve(Candidate(ads_item_id="x", sku="ABC-9"), idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.SKU
    assert r.confidence == 0.95


def test_gtin_match():
    idx = _index(Product(product_id="A", gtin="00012345678905"))
    r = resolve(Candidate(ads_item_id="x", gtin="00012345678905"), idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.GTIN
    assert r.confidence == 0.95


def test_landing_url_match_ignores_scheme_www_query_and_slash():
    idx = _index(Product(product_id="A", landing_url="https://www.shop.com/p/1"))
    cand = Candidate(ads_item_id="x", landing_url="http://shop.com/p/1/?utm_source=g")
    r = resolve(cand, idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.LANDING_URL
    assert r.confidence == 0.8


def test_title_match_normalizes_case_and_whitespace():
    idx = _index(Product(product_id="A", title="Red  Running  Shoe"))
    r = resolve(Candidate(ads_item_id="x", title="red running shoe"), idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.TITLE
    assert r.confidence == 0.6


def test_priority_offer_id_beats_sku():
    idx = _index(
        Product(product_id="A", offer_id="OFF1"),
        Product(product_id="B", sku="SKUX"),
    )
    cand = Candidate(ads_item_id="x", offer_id="OFF1", sku="SKUX")
    r = resolve(cand, idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.OFFER_ID


def test_ambiguous_sku_falls_through_to_no_match():
    idx = _index(
        Product(product_id="A", sku="DUP"),
        Product(product_id="B", sku="DUP"),
    )
    r = resolve(Candidate(ads_item_id="x", sku="DUP"), idx)
    assert r.product_id is None
    assert r.method == MatchMethod.NONE
    assert r.ambiguous is True


def test_ambiguous_sku_but_unique_gtin_still_resolves():
    idx = _index(
        Product(product_id="A", sku="DUP"),
        Product(product_id="B", sku="DUP"),
        Product(product_id="C", gtin="G1"),
    )
    cand = Candidate(ads_item_id="x", sku="DUP", gtin="G1")
    r = resolve(cand, idx)
    assert r.product_id == "C"
    assert r.method == MatchMethod.GTIN
    assert r.ambiguous is False


def test_no_match_returns_none():
    idx = _index(Product(product_id="A", offer_id="OFF1"))
    r = resolve(Candidate(ads_item_id="zzz", sku="nope"), idx)
    assert r.product_id is None
    assert r.method == MatchMethod.NONE
    assert r.confidence == 0.0
    assert r.ambiguous is False


def test_build_index_tolerates_missing_fields():
    # Products with sparse identifiers must not raise.
    idx = _index(
        Product(product_id="A"),
        Product(product_id="B", sku="S1"),
    )
    r = resolve(Candidate(ads_item_id="x", sku="S1"), idx)
    assert r.product_id == "B"


def test_empty_candidate_identifiers_are_ignored():
    idx = _index(Product(product_id="A", sku=""))  # empty sku must not index
    r = resolve(Candidate(ads_item_id="x", sku=""), idx)
    assert r.product_id is None
    assert r.method == MatchMethod.NONE


# ── Regression tests from the adversarial review ────────────────────────────

def test_item_id_cross_table_collision_is_ambiguous():
    # ads_item_id uniquely matches A by offer_id AND B by merchant id → ambiguous.
    idx = _index(
        Product(product_id="A", offer_id="ID42"),
        Product(product_id="B", merchant_product_id="ID42"),
    )
    r = resolve(Candidate(ads_item_id="ID42"), idx)
    assert r.product_id is None
    assert r.method == MatchMethod.NONE
    assert r.ambiguous is True


def test_gtin_length_and_zero_pad_normalized():
    # GTIN-12 / GTIN-13 / GTIN-14 of the SAME product must all resolve to it.
    idx = _index(Product(product_id="A", gtin="0012345678905"))  # 13
    assert resolve(Candidate(ads_item_id="x", gtin="012345678905"), idx).product_id == "A"   # 12
    assert resolve(Candidate(ads_item_id="x", gtin="00012345678905"), idx).product_id == "A"  # 14
    # non-digits stripped
    assert resolve(Candidate(ads_item_id="x", gtin="0-012345-678905"), idx).product_id == "A"


def test_landing_url_query_identity_is_preserved():
    # Products differing only by an identity-bearing query param stay distinct.
    idx = _index(
        Product(product_id="A", landing_url="https://shop.com/p?id=123"),
        Product(product_id="B", landing_url="https://shop.com/p?id=456"),
    )
    a = resolve(Candidate(ads_item_id="x", landing_url="http://www.shop.com/p?id=123&utm_source=g&gclid=z"), idx)
    assert a.product_id == "A"
    assert a.method == MatchMethod.LANDING_URL
    assert resolve(Candidate(ads_item_id="x", landing_url="https://shop.com/p?id=456"), idx).product_id == "B"


def test_landing_url_authority_normalization():
    idx = _index(Product(product_id="A", landing_url="https://shop.com/p/1"))
    for url in (
        "https://shop.com:443/p/1",
        "https://user:pass@shop.com/p/1",
        "//shop.com/p/1/",
        "HTTP://Shop.com/p/1",
    ):
        assert resolve(Candidate(ads_item_id="x", landing_url=url), idx).product_id == "A", url


def test_offer_id_case_distinct_not_merged():
    idx = _index(
        Product(product_id="A", offer_id="A1"),
        Product(product_id="B", offer_id="a1"),
    )
    # Explicit offer_id is case-sensitive (Merchant offerId semantics).
    assert resolve(Candidate(ads_item_id="x", offer_id="A1"), idx).product_id == "A"
    assert resolve(Candidate(ads_item_id="x", offer_id="a1"), idx).product_id == "B"
    # A bare lowercase Ads item_id can't disambiguate case-variants → ambiguous.
    amb = resolve(Candidate(ads_item_id="a1"), idx)
    assert amb.product_id is None
    assert amb.ambiguous is True


def test_uppercase_merchant_offer_resolved_by_lowercase_ads_item_id():
    idx = _index(Product(product_id="A", offer_id="SKU123"))
    r = resolve(Candidate(ads_item_id="sku123"), idx)  # Ads lowercases item_id
    assert r.product_id == "A"
    assert r.method == MatchMethod.ITEM_ID
    assert r.confidence == 1.0


def test_manual_override_missing_target_falls_through():
    idx = _index(Product(product_id="A", offer_id="OFF1"))
    r = resolve(Candidate(ads_item_id="OFF1"), idx, manual={"OFF1": "GHOST"})
    assert r.product_id == "A"  # GHOST not in catalog → fall through to cascade
    assert r.method != MatchMethod.MANUAL


def test_item_id_matches_bare_offer_segment_of_merchant_id():
    idx = _index(Product(product_id="A", merchant_product_id="online:en:RO:SKU123"))
    r = resolve(Candidate(ads_item_id="SKU123"), idx)  # Ads reports the bare offerId
    assert r.product_id == "A"
    assert r.method == MatchMethod.ITEM_ID


def test_title_unicode_nfc_and_zero_width():
    idx = _index(Product(product_id="A", title="Café Noir"))  # precomposed é
    # decomposed e + combining acute, plus a zero-width space
    r = resolve(Candidate(ads_item_id="x", title="café​ noir"), idx)
    assert r.product_id == "A"
    assert r.method == MatchMethod.TITLE


def test_confidence_ladder():
    cases = [
        (MatchMethod.OFFER_ID, Product(product_id="A", offer_id="OF"), Candidate(ads_item_id="x", offer_id="OF"), 1.0),
        (MatchMethod.ITEM_ID, Product(product_id="A", offer_id="IT"), Candidate(ads_item_id="IT"), 1.0),
        (MatchMethod.SKU, Product(product_id="A", sku="SK"), Candidate(ads_item_id="x", sku="SK"), 0.95),
        (MatchMethod.GTIN, Product(product_id="A", gtin="00000012345675"), Candidate(ads_item_id="x", gtin="00000012345675"), 0.95),
        (MatchMethod.LANDING_URL, Product(product_id="A", landing_url="https://s.com/a"), Candidate(ads_item_id="x", landing_url="https://s.com/a"), 0.8),
        (MatchMethod.TITLE, Product(product_id="A", title="t"), Candidate(ads_item_id="x", title="t"), 0.6),
    ]
    for method, prod, cand, conf in cases:
        r = resolve(cand, _index(prod))
        assert r.method == method
        assert r.confidence == conf


def test_all_methods_ambiguous_returns_none():
    idx = _index(
        Product(product_id="A", sku="DUP", gtin="00000000000017", title="dup"),
        Product(product_id="B", sku="DUP", gtin="00000000000017", title="dup"),
    )
    r = resolve(Candidate(ads_item_id="zzz", sku="DUP", gtin="00000000000017", title="dup"), idx)
    assert r.product_id is None
    assert r.ambiguous is True
