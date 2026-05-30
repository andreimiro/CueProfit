import pytest

from cueprofit_workers.stores import FakeStatsStore
from cueprofit_workers.sync_merchant import sync_merchant


SAMPLE_PRODUCT = {
    "name": "accounts/123/products/en~RO~sku-1",
    "contentLanguage": "en",
    "feedLabel": "RO",
    "offerId": "sku-1",
    "productAttributes": {
        "title": "Sample",
        "price": {"amountMicros": "1000000", "currencyCode": "RON"},
    },
    "productStatus": {"destinationStatuses": [{"approvedCountries": ["RO"]}]},
}


class FakeMerchantClient:
    def __init__(self, products):
        self.products = products

    def list_products(self, merchant_id):
        yield from self.products


def test_sync_merchant_upserts_catalog_and_records_run():
    store = FakeStatsStore()
    client = FakeMerchantClient([SAMPLE_PRODUCT, {**SAMPLE_PRODUCT, "offerId": "sku-2"}])

    out = sync_merchant(
        store=store,
        merchant_client=client,
        workspace_id="ws1",
        merchant_id=123,
    )
    assert out["product_rows"] == 2
    assert len(store.catalog) == 2
    assert store.products[0]["offer_id"] == "sku-1"
    run = store.runs[-1]
    assert run["status"] == "success"
    assert run["rows_written"] == 2


def test_sync_merchant_records_failure_and_reraises():
    class Boom:
        def list_products(self, *a, **k):
            raise RuntimeError("merchant api down")

    store = FakeStatsStore()
    with pytest.raises(RuntimeError):
        sync_merchant(
            store=store,
            merchant_client=Boom(),
            workspace_id="ws1",
            merchant_id=1,
        )
    assert store.runs[-1]["status"] == "failed"
