"""CueProfit Google API clients + GAQL catalog + result mappers."""

from google_clients import gaql
from google_clients.mappers import (
    CampaignDailyStat,
    ProductDailyStat,
    map_campaign_row,
    map_product_row,
    row_to_flat,
)
from google_clients.merchant_mappers import MerchantCatalogProduct, map_merchant_product

__all__ = [
    "gaql",
    "CampaignDailyStat",
    "ProductDailyStat",
    "MerchantCatalogProduct",
    "map_campaign_row",
    "map_product_row",
    "map_merchant_product",
    "row_to_flat",
]
