"""Pure mappers: Merchant API Product JSON → catalog records."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

_MONEY = Decimal("0.01")
_MICROS = Decimal(1_000_000)


def _money_from_micros(micros: Any) -> Decimal | None:
    if micros is None:
        return None
    return (Decimal(int(micros)) / _MICROS).quantize(_MONEY, rounding=ROUND_HALF_UP)


def _price_amount(price: dict | None) -> tuple[Decimal | None, str | None]:
    if not price:
        return None, None
    amount = price.get("amountMicros")
    if amount is None and price.get("amount") is not None:
        return Decimal(str(price["amount"])).quantize(_MONEY, rounding=ROUND_HALF_UP), price.get("currencyCode")
    return _money_from_micros(amount), price.get("currencyCode")


def _first(seq: Any) -> str | None:
    if isinstance(seq, list) and seq:
        val = seq[0]
        return str(val) if val is not None else None
    return None


def merchant_product_id(product: dict[str, Any]) -> str:
    """Stable id used for identity resolution (legacy channel:lang:feed:offer shape)."""
    if product.get("legacyLocal"):
        slug = _product_slug(product)
        return f"local~{slug}" if slug else "local~unknown"
    lang = product.get("contentLanguage") or "en"
    feed = product.get("feedLabel") or "XX"
    offer = product.get("offerId") or _product_slug(product).split("~")[-1]
    return f"online:{lang}:{feed}:{offer}"


def _product_slug(product: dict[str, Any]) -> str:
    name = product.get("name") or ""
    if isinstance(name, str) and "/products/" in name:
        return name.split("/products/", 1)[1]
    parts = [product.get("contentLanguage"), product.get("feedLabel"), product.get("offerId")]
    if all(parts):
        return "~".join(str(p) for p in parts)
    return str(product.get("offerId") or "")


def _processed_status(product: dict[str, Any]) -> str | None:
    status = product.get("productStatus") or {}
    issues = status.get("itemLevelIssues") or []
    if any(i.get("severity") == "DISAPPROVED" for i in issues):
        return "disapproved"
    destinations = status.get("destinationStatuses") or []
    if any(d.get("pendingCountries") for d in destinations):
        return "pending"
    if any(d.get("disapprovedCountries") for d in destinations):
        return "disapproved"
    if any(d.get("approvedCountries") for d in destinations):
        return "approved"
    return None


@dataclass(frozen=True)
class MerchantCatalogProduct:
    merchant_product_id: str
    offer_id: str | None
    sku: str | None
    gtin: str | None
    mpn: str | None
    title: str | None
    brand: str | None
    category: str | None
    product_type: str | None
    price: Decimal | None
    sale_price: Decimal | None
    currency: str | None
    availability: str | None
    condition: str | None
    image_url: str | None
    landing_url: str | None
    status: str | None
    custom_label_0: str | None
    custom_label_1: str | None
    custom_label_2: str | None
    custom_label_3: str | None
    custom_label_4: str | None
    raw: dict[str, Any]


def map_merchant_product(product: dict[str, Any]) -> MerchantCatalogProduct:
    attrs = product.get("productAttributes") or {}
    price, currency = _price_amount(attrs.get("price"))
    sale_price, sale_currency = _price_amount(attrs.get("salePrice"))
    offer_id = product.get("offerId")
    return MerchantCatalogProduct(
        merchant_product_id=merchant_product_id(product),
        offer_id=str(offer_id) if offer_id is not None else None,
        sku=str(offer_id) if offer_id is not None else None,
        gtin=_first(attrs.get("gtins")),
        mpn=attrs.get("mpn"),
        title=attrs.get("title"),
        brand=attrs.get("brand"),
        category=attrs.get("googleProductCategory"),
        product_type=_first(attrs.get("productTypes")),
        price=price,
        sale_price=sale_price,
        currency=currency or sale_currency,
        availability=attrs.get("availability"),
        condition=attrs.get("condition"),
        image_url=attrs.get("imageLink"),
        landing_url=attrs.get("link"),
        status=_processed_status(product),
        custom_label_0=attrs.get("customLabel0"),
        custom_label_1=attrs.get("customLabel1"),
        custom_label_2=attrs.get("customLabel2"),
        custom_label_3=attrs.get("customLabel3"),
        custom_label_4=attrs.get("customLabel4"),
        raw=product,
    )
