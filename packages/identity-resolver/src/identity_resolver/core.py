"""Product Identity Resolver — map an Ads item to a canonical product.

Pure, deterministic, no IO. See tests/test_resolver.py for the cascade and
worked examples.

Identifier policy (matters for correctness):
  • offer_id / sku        — CASE-SENSITIVE exact match (Merchant offerId is
                            case-sensitive; 'SKU1' and 'sku1' are different).
  • ads_item_id (ITEM_ID) — matched CASE-INSENSITIVELY against the union of
                            {offer_id, merchant_product_id, bare offerId segment}
                            because Google Ads reports product_item_id lowercased.
                            If >1 product shares the lowercased key it is
                            ambiguous and the cascade falls through.
  • gtin                  — normalized to digits, zero-padded to GTIN-14 so
                            GTIN-8/12/13/14 representations of one product match.
  • landing_url           — authority-parsed (host without userinfo/port, www
                            stripped), tracking query params dropped, identity
                            params (id, variant, …) kept.
  • title                 — Unicode NFC + zero-width stripped + casefold.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass, field
from enum import Enum
from urllib.parse import parse_qsl, urlencode, urlsplit


class MatchMethod(str, Enum):
    MANUAL = "manual"
    OFFER_ID = "offer_id"
    ITEM_ID = "item_id"
    SKU = "sku"
    GTIN = "gtin"
    LANDING_URL = "landing_url"
    TITLE = "title"
    NONE = "none"


_CONFIDENCE: dict[MatchMethod, float] = {
    MatchMethod.MANUAL: 1.0,
    MatchMethod.OFFER_ID: 1.0,
    MatchMethod.ITEM_ID: 1.0,
    MatchMethod.SKU: 0.95,
    MatchMethod.GTIN: 0.95,
    MatchMethod.LANDING_URL: 0.8,
    MatchMethod.TITLE: 0.6,
    MatchMethod.NONE: 0.0,
}


@dataclass(frozen=True)
class Product:
    product_id: str
    offer_id: str | None = None
    merchant_product_id: str | None = None
    sku: str | None = None
    gtin: str | None = None
    landing_url: str | None = None
    title: str | None = None


@dataclass(frozen=True)
class Candidate:
    ads_item_id: str
    offer_id: str | None = None
    sku: str | None = None
    gtin: str | None = None
    landing_url: str | None = None
    title: str | None = None


@dataclass(frozen=True)
class Resolution:
    product_id: str | None
    method: MatchMethod
    confidence: float
    ambiguous: bool = False


@dataclass
class ProductIndex:
    product_ids: set[str] = field(default_factory=set)
    by_offer_id: dict[str, set[str]] = field(default_factory=dict)  # case-preserving
    by_item_ci: dict[str, set[str]] = field(default_factory=dict)   # casefolded union
    by_sku: dict[str, set[str]] = field(default_factory=dict)       # case-preserving
    by_gtin: dict[str, set[str]] = field(default_factory=dict)
    by_url: dict[str, set[str]] = field(default_factory=dict)
    by_title: dict[str, set[str]] = field(default_factory=dict)     # casefolded


_WS = re.compile(r"\s+")
_WWW = re.compile(r"^www\.")
_NONDIGIT = re.compile(r"\D")
_ZERO_WIDTH = {0x200B: None, 0x200C: None, 0x200D: None, 0xFEFF: None}

# Query params that carry no product identity — safe to drop before matching.
_TRACKING_PARAMS = {
    "gclid", "gbraid", "wbraid", "dclid", "gclsrc", "fbclid", "msclkid",
    "yclid", "ttclid", "scid", "_ga", "_gl", "mc_cid", "mc_eid", "igshid",
}


def _clean(s: str | None) -> str | None:
    """NFC-normalize, strip zero-width/BOM, trim, collapse whitespace. Case-preserving."""
    if not s:
        return None
    s = unicodedata.normalize("NFC", s).translate(_ZERO_WIDTH)
    s = _WS.sub(" ", s.strip())
    return s or None


def _norm_id(s: str | None) -> str | None:
    """Case-preserving exact key (offer_id, sku)."""
    return _clean(s)


def _norm_ci(s: str | None) -> str | None:
    """Case-insensitive key (ads_item_id, title)."""
    c = _clean(s)
    return c.casefold() if c is not None else None


def _norm_gtin(s: str | None) -> str | None:
    """Digits only; zero-pad to GTIN-14 when 8..14 digits so equivalent GTINs match."""
    if not s:
        return None
    digits = _NONDIGIT.sub("", s)
    if not digits:
        return None
    return digits.zfill(14) if 8 <= len(digits) <= 14 else digits


def _merchant_offer_segment(merchant_product_id: str) -> str:
    """Extract the offerId from 'channel:contentLanguage:targetCountry:offerId'.

    offerIds may themselves contain ':' so we keep everything after the 3rd colon.
    """
    parts = merchant_product_id.split(":")
    return ":".join(parts[3:]) if len(parts) >= 4 else merchant_product_id


def _norm_url(s: str | None) -> str | None:
    """Normalize a URL to host+path(+identity query). Drops scheme, userinfo,
    port, www., tracking params; keeps identity-bearing query params (sorted)."""
    if not s:
        return None
    raw = s.strip()
    if "://" not in raw and not raw.startswith("//"):
        raw = "//" + raw  # let urlsplit see a network-path reference
    parts = urlsplit(raw)
    host = _WWW.sub("", (parts.hostname or "").lower())  # hostname drops userinfo+port
    path = parts.path.rstrip("/")
    survivors = [
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if not (k.lower() in _TRACKING_PARAMS or k.lower().startswith("utm_"))
    ]
    key = host + path
    if survivors:
        key += "?" + urlencode(sorted(survivors))
    return key or None


def build_index(products: Iterable[Product]) -> ProductIndex:
    idx = ProductIndex()

    def add(table: dict[str, set[str]], key: str | None, pid: str) -> None:
        if key is None:
            return
        table.setdefault(key, set()).add(pid)

    for p in products:
        idx.product_ids.add(p.product_id)
        add(idx.by_offer_id, _norm_id(p.offer_id), p.product_id)
        add(idx.by_item_ci, _norm_ci(p.offer_id), p.product_id)
        mp = _clean(p.merchant_product_id)
        if mp is not None:
            add(idx.by_item_ci, mp.casefold(), p.product_id)
            add(idx.by_item_ci, _merchant_offer_segment(mp).casefold(), p.product_id)
        add(idx.by_sku, _norm_id(p.sku), p.product_id)
        add(idx.by_gtin, _norm_gtin(p.gtin), p.product_id)
        add(idx.by_url, _norm_url(p.landing_url), p.product_id)
        add(idx.by_title, _norm_ci(p.title), p.product_id)
    return idx


def resolve(
    candidate: Candidate,
    index: ProductIndex,
    manual: dict[str, str] | None = None,
) -> Resolution:
    # 1. Human override (keyed by exact ads_item_id) — honored only if the target
    #    product actually exists; a stale/typo'd target falls through to the cascade.
    if manual:
        pid = manual.get(candidate.ads_item_id)
        if pid is not None and pid in index.product_ids:
            return Resolution(pid, MatchMethod.MANUAL, 1.0)

    steps: list[tuple[MatchMethod, dict[str, set[str]], str | None]] = [
        (MatchMethod.OFFER_ID, index.by_offer_id, _norm_id(candidate.offer_id)),
        (MatchMethod.ITEM_ID, index.by_item_ci, _norm_ci(candidate.ads_item_id)),
        (MatchMethod.SKU, index.by_sku, _norm_id(candidate.sku)),
        (MatchMethod.GTIN, index.by_gtin, _norm_gtin(candidate.gtin)),
        (MatchMethod.LANDING_URL, index.by_url, _norm_url(candidate.landing_url)),
        (MatchMethod.TITLE, index.by_title, _norm_ci(candidate.title)),
    ]

    ambiguous_seen = False
    for method, table, key in steps:
        if key is None:
            continue
        hits = table.get(key)
        if not hits:
            continue
        if len(hits) == 1:
            return Resolution(next(iter(hits)), method, _CONFIDENCE[method])
        ambiguous_seen = True  # multiple candidates → skip this method

    return Resolution(None, MatchMethod.NONE, 0.0, ambiguous=ambiguous_seen)
