from decimal import Decimal

from google_clients.merchant_mappers import map_merchant_product, merchant_product_id


def test_merchant_product_id_legacy_online_format():
    product = {
        "name": "accounts/123/products/en~RO~SKU123",
        "contentLanguage": "en",
        "feedLabel": "RO",
        "offerId": "SKU123",
        "legacyLocal": False,
        "productAttributes": {},
    }
    assert merchant_product_id(product) == "online:en:RO:SKU123"


def test_map_merchant_product_extracts_catalog_fields():
    product = {
        "name": "accounts/999/products/en~RO~sku-1",
        "contentLanguage": "en",
        "feedLabel": "RO",
        "offerId": "sku-1",
        "productAttributes": {
            "title": "Red T-shirt",
            "brand": "Acme",
            "gtins": ["5901234123457"],
            "mpn": "MPN-1",
            "googleProductCategory": "Apparel",
            "productTypes": ["Shirts"],
            "price": {"amountMicros": "19900000", "currencyCode": "RON"},
            "salePrice": {"amountMicros": "14900000", "currencyCode": "RON"},
            "availability": "IN_STOCK",
            "condition": "NEW",
            "link": "https://shop.example/sku-1",
            "imageLink": "https://cdn.example/sku-1.jpg",
            "customLabel0": "hero",
        },
        "productStatus": {
            "destinationStatuses": [{"approvedCountries": ["RO"]}],
            "itemLevelIssues": [],
        },
    }
    row = map_merchant_product(product)
    assert row.merchant_product_id == "online:en:RO:sku-1"
    assert row.offer_id == "sku-1"
    assert row.title == "Red T-shirt"
    assert row.price == Decimal("19.90")
    assert row.sale_price == Decimal("14.90")
    assert row.currency == "RON"
    assert row.status == "approved"
    assert row.custom_label_0 == "hero"
