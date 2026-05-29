"""CueProfit Google API clients + GAQL catalog + result mappers."""

from google_clients import gaql
from google_clients.mappers import (
    CampaignDailyStat,
    ProductDailyStat,
    map_campaign_row,
    map_product_row,
    row_to_flat,
)

__all__ = [
    "gaql",
    "CampaignDailyStat",
    "ProductDailyStat",
    "map_campaign_row",
    "map_product_row",
    "row_to_flat",
]
