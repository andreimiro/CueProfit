"""Identity resolution: match the Ads item_ids in product_daily_stats to the
catalog and write product_identity_map (+ backfill product_daily_stats.product_id)."""

from __future__ import annotations

from typing import Any

from identity_resolver import Candidate, Product, build_index, resolve


def resolve_workspace_identities(*, store, workspace_id: str) -> dict[str, Any]:
    products = [
        Product(
            product_id=p["product_id"], offer_id=p.get("offer_id"),
            merchant_product_id=p.get("merchant_product_id"), sku=p.get("sku"),
            gtin=p.get("gtin"), landing_url=p.get("landing_url"), title=p.get("title"),
        )
        for p in store.list_products(workspace_id)
    ]
    index = build_index(products)

    rows: list[dict] = []
    linked = 0
    for item in store.list_unresolved_ads_items(workspace_id):
        ads_item_id = item["ads_item_id"]
        res = resolve(Candidate(ads_item_id=ads_item_id), index)
        rows.append({
            "ads_item_id": ads_item_id,
            "product_id": res.product_id,
            "match_method": res.method.value,
            "match_confidence": res.confidence,
        })
        if res.product_id is not None:
            store.link_product_stats(
                workspace_id=workspace_id, ads_item_id=ads_item_id, product_id=res.product_id
            )
            linked += 1

    mapped = store.upsert_identity_map(workspace_id=workspace_id, rows=rows)
    return {"mapped": mapped, "linked": linked}
