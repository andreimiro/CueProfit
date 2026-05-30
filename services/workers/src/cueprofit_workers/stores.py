"""StatsStore — where synced facts land. Protocol + in-memory fake + Supabase REST.

Writes use the Supabase service-role key (RLS bypass), so every method is
explicitly workspace-scoped. Upserts are idempotent on the natural keys, so a
daily/lag re-pull overwrites the same (workspace, date, entity) rows.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Protocol

from google_clients.mappers import CampaignDailyStat, ProductDailyStat
from google_clients.merchant_mappers import MerchantCatalogProduct


def _utc_now_iso() -> str:
    # PostgREST stores JSON values verbatim: a timestamptz column needs a real ISO
    # timestamp, not the literal string "now()" (which Postgres can't parse).
    return datetime.now(timezone.utc).isoformat()


class StatsStore(Protocol):
    def start_sync_run(self, *, workspace_id: str, provider: str, kind: str, connection_id: str | None) -> str: ...
    def finish_sync_run(self, *, run_id: str, status: str, rows_written: int, cursor: dict | None, error: str | None) -> None: ...
    def upsert_campaign_stats(self, *, workspace_id: str, rows: list[CampaignDailyStat]) -> int: ...
    def upsert_product_stats(self, *, workspace_id: str, rows: list[ProductDailyStat]) -> int: ...
    def upsert_catalog_products(self, *, workspace_id: str, rows: list[MerchantCatalogProduct]) -> int: ...
    def list_products(self, workspace_id: str) -> list[dict]: ...
    def list_unresolved_ads_items(self, workspace_id: str) -> list[dict]: ...
    def upsert_identity_map(self, *, workspace_id: str, rows: list[dict]) -> int: ...
    def link_product_stats(self, *, workspace_id: str, ads_item_id: str, product_id: str) -> int: ...
    def list_merchant_connections(self, workspace_id: str) -> list[dict]: ...
    def list_workspaces_with_google_ads(self) -> list[str]: ...
    def mark_connection_synced(self, *, connection_id: str, workspace_id: str) -> None: ...


# ── In-memory fake ─────────────────────────────────────────────────────────
class FakeStatsStore:
    def __init__(self) -> None:
        self.runs: list[dict] = []
        self.campaign: list[tuple[str, CampaignDailyStat]] = []
        self.product: list[tuple[str, ProductDailyStat]] = []
        self.identity: list[tuple[str, dict]] = []
        self.links: list[tuple[str, str, str]] = []
        self.products: list[dict] = []
        self.catalog: list[tuple[str, MerchantCatalogProduct]] = []
        self.unresolved: list[dict] = []

    def start_sync_run(self, *, workspace_id, provider, kind, connection_id=None) -> str:
        rid = str(uuid.uuid4())
        self.runs.append({"id": rid, "workspace_id": workspace_id, "provider": provider,
                          "kind": kind, "status": "running", "rows_written": 0, "cursor": None, "error": None})
        return rid

    def finish_sync_run(self, *, run_id, status, rows_written, cursor, error) -> None:
        for r in self.runs:
            if r["id"] == run_id:
                r.update(status=status, rows_written=rows_written, cursor=cursor, error=error)

    def upsert_campaign_stats(self, *, workspace_id, rows) -> int:
        self.campaign.extend((workspace_id, r) for r in rows)
        return len(rows)

    def upsert_product_stats(self, *, workspace_id, rows) -> int:
        self.product.extend((workspace_id, r) for r in rows)
        return len(rows)

    def upsert_catalog_products(self, *, workspace_id, rows) -> int:
        self.catalog.extend((workspace_id, r) for r in rows)
        for row in rows:
            self.products.append({
                "workspace_id": workspace_id,
                "product_id": row.merchant_product_id,
                "offer_id": row.offer_id,
                "merchant_product_id": row.merchant_product_id,
                "sku": row.sku,
                "gtin": row.gtin,
                "landing_url": row.landing_url,
                "title": row.title,
            })
        return len(rows)

    def list_merchant_connections(self, workspace_id) -> list[dict]:
        return []

    def list_google_ads_connections(self, workspace_id) -> list[dict]:
        return []

    def list_workspaces_with_google_ads(self) -> list[str]:
        return []

    def mark_connection_synced(self, *, connection_id, workspace_id) -> None:
        return None

    def list_products(self, workspace_id) -> list[dict]:
        return [p for p in self.products if p["workspace_id"] == workspace_id]

    def list_unresolved_ads_items(self, workspace_id) -> list[dict]:
        return [u for u in self.unresolved if u["workspace_id"] == workspace_id]

    def upsert_identity_map(self, *, workspace_id, rows) -> int:
        self.identity.extend((workspace_id, r) for r in rows)
        return len(rows)

    def link_product_stats(self, *, workspace_id, ads_item_id, product_id) -> int:
        self.links.append((workspace_id, ads_item_id, product_id))
        return 1


# ── Supabase REST (PostgREST) ──────────────────────────────────────────────
def _campaign_row(workspace_id: str, s: CampaignDailyStat) -> dict:
    return {
        "workspace_id": workspace_id, "date": s.date, "customer_id": s.customer_id,
        "campaign_id": s.campaign_id, "campaign_name": s.campaign_name,
        "campaign_type": s.campaign_type, "status": s.status, "bidding_strategy": s.bidding_strategy,
        "budget_amount": float(s.budget_amount) if s.budget_amount is not None else None,
        "impressions": s.impressions, "clicks": s.clicks, "spend": float(s.spend),
        "conversions": float(s.conversions), "conversion_value": float(s.conversion_value),
        "currency": s.currency,
    }


def _product_row(workspace_id: str, s: ProductDailyStat) -> dict:
    return {
        "workspace_id": workspace_id, "date": s.date, "customer_id": s.customer_id,
        "campaign_id": s.campaign_id, "ads_item_id": s.ads_item_id,
        "impressions": s.impressions, "clicks": s.clicks, "spend": float(s.spend),
        "conversions": float(s.conversions), "conversion_value": float(s.conversion_value),
        "currency": s.currency,
    }


def _catalog_product_row(workspace_id: str, p: MerchantCatalogProduct) -> dict:
    return {
        "workspace_id": workspace_id,
        "merchant_product_id": p.merchant_product_id,
        "offer_id": p.offer_id,
        "sku": p.sku,
        "gtin": p.gtin,
        "mpn": p.mpn,
        "title": p.title,
        "brand": p.brand,
        "category": p.category,
        "product_type": p.product_type,
        "price": float(p.price) if p.price is not None else None,
        "sale_price": float(p.sale_price) if p.sale_price is not None else None,
        "currency": p.currency,
        "availability": p.availability,
        "condition": p.condition,
        "image_url": p.image_url,
        "landing_url": p.landing_url,
        "status": p.status,
        "custom_label_0": p.custom_label_0,
        "custom_label_1": p.custom_label_1,
        "custom_label_2": p.custom_label_2,
        "custom_label_3": p.custom_label_3,
        "custom_label_4": p.custom_label_4,
        "raw": p.raw,
    }


class SupabaseStatsStore:
    def __init__(self, *, base_url: str, service_role_key: str, http=None):
        self._rest = f"{base_url.rstrip('/')}/rest/v1"
        self._key = service_role_key
        self._http = http

    def _client(self):
        import httpx

        return self._http or httpx.Client(
            timeout=60,
            headers={"apikey": self._key, "Authorization": f"Bearer {self._key}", "Content-Type": "application/json"},
        )

    def _upsert(self, client, table: str, on_conflict: str, rows: list[dict]) -> int:
        if not rows:
            return 0
        resp = client.post(
            f"{self._rest}/{table}",
            params={"on_conflict": on_conflict},
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            json=rows,
        )
        resp.raise_for_status()
        return len(rows)

    def start_sync_run(self, *, workspace_id, provider, kind, connection_id=None) -> str:
        client = self._client()
        try:
            resp = client.post(
                f"{self._rest}/sync_runs",
                headers={"Prefer": "return=representation"},
                json={"workspace_id": workspace_id, "provider": provider, "kind": kind,
                      "connection_id": connection_id, "status": "running",
                      "started_at": _utc_now_iso()},
            )
            resp.raise_for_status()
            return resp.json()[0]["id"]
        finally:
            if self._http is None:
                client.close()

    def finish_sync_run(self, *, run_id, status, rows_written, cursor, error) -> None:
        client = self._client()
        try:
            client.patch(
                f"{self._rest}/sync_runs",
                params={"id": f"eq.{run_id}"},
                json={"status": status, "rows_written": rows_written, "cursor": cursor,
                      "error": error, "finished_at": _utc_now_iso()},
            ).raise_for_status()
        finally:
            if self._http is None:
                client.close()

    def upsert_campaign_stats(self, *, workspace_id, rows) -> int:
        client = self._client()
        try:
            return self._upsert(client, "campaign_daily_stats",
                                "workspace_id,date,customer_id,campaign_id",
                                [_campaign_row(workspace_id, s) for s in rows])
        finally:
            if self._http is None:
                client.close()

    def upsert_product_stats(self, *, workspace_id, rows) -> int:
        client = self._client()
        try:
            return self._upsert(client, "product_daily_stats",
                                "workspace_id,date,customer_id,campaign_id,ads_item_id",
                                [_product_row(workspace_id, s) for s in rows])
        finally:
            if self._http is None:
                client.close()

    def upsert_catalog_products(self, *, workspace_id, rows) -> int:
        client = self._client()
        try:
            return self._upsert(
                client,
                "products",
                "workspace_id,merchant_product_id",
                [_catalog_product_row(workspace_id, p) for p in rows],
            )
        finally:
            if self._http is None:
                client.close()

    def list_products(self, workspace_id) -> list[dict]:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/products", params={
                "workspace_id": f"eq.{workspace_id}",
                "select": "product_id:id,offer_id,merchant_product_id,sku,gtin,landing_url,title",
            })
            resp.raise_for_status()
            return [{"workspace_id": workspace_id, **r} for r in resp.json()]
        finally:
            if self._http is None:
                client.close()

    def list_unresolved_ads_items(self, workspace_id) -> list[dict]:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/product_daily_stats", params={
                "workspace_id": f"eq.{workspace_id}", "product_id": "is.null", "select": "ads_item_id",
            })
            resp.raise_for_status()
            seen, out = set(), []
            for r in resp.json():
                if r["ads_item_id"] not in seen:
                    seen.add(r["ads_item_id"])
                    out.append({"workspace_id": workspace_id, "ads_item_id": r["ads_item_id"]})
            return out
        finally:
            if self._http is None:
                client.close()

    def upsert_identity_map(self, *, workspace_id, rows) -> int:
        client = self._client()
        try:
            return self._upsert(
                client, "product_identity_map", "workspace_id,ads_item_id",
                [{"workspace_id": workspace_id, **r} for r in rows],
            )
        finally:
            if self._http is None:
                client.close()

    def link_product_stats(self, *, workspace_id, ads_item_id, product_id) -> int:
        client = self._client()
        try:
            resp = client.patch(
                f"{self._rest}/product_daily_stats",
                params={"workspace_id": f"eq.{workspace_id}", "ads_item_id": f"eq.{ads_item_id}"},
                headers={"Prefer": "return=minimal"},
                json={"product_id": product_id},
            )
            resp.raise_for_status()
            return 1
        finally:
            if self._http is None:
                client.close()

    # ── connection loading (for the sync dispatcher) ───────────────────────
    def list_google_ads_connections(self, workspace_id: str) -> list[dict]:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/oauth_connections", params={
                "workspace_id": f"eq.{workspace_id}", "provider": "eq.google_ads",
                "status": "eq.active", "select": "id,external_account_id,login_customer_id",
            })
            resp.raise_for_status()
            return resp.json()
        finally:
            if self._http is None:
                client.close()

    def list_merchant_connections(self, workspace_id: str) -> list[dict]:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/oauth_connections", params={
                "workspace_id": f"eq.{workspace_id}", "provider": "eq.merchant_center",
                "status": "eq.active", "select": "id,external_account_id",
            })
            resp.raise_for_status()
            return resp.json()
        finally:
            if self._http is None:
                client.close()

    def list_workspaces_with_google_ads(self) -> list[str]:
        """Distinct workspace IDs with at least one active Google Ads connection."""
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/oauth_connections", params={
                "provider": "eq.google_ads",
                "status": "eq.active",
                "select": "workspace_id",
            })
            resp.raise_for_status()
            seen: set[str] = set()
            ordered: list[str] = []
            for row in resp.json():
                ws = row.get("workspace_id")
                if ws and ws not in seen:
                    seen.add(ws)
                    ordered.append(ws)
            return ordered
        finally:
            if self._http is None:
                client.close()

    def mark_connection_synced(self, *, connection_id: str, workspace_id: str) -> None:
        client = self._client()
        try:
            client.patch(
                f"{self._rest}/oauth_connections",
                params={"id": f"eq.{connection_id}", "workspace_id": f"eq.{workspace_id}"},
                json={"last_synced_at": _utc_now_iso()},
            ).raise_for_status()
        finally:
            if self._http is None:
                client.close()

    def get_connection_secret(self, *, connection_id: str, workspace_id: str) -> tuple[bytes, str] | None:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/oauth_secrets", params={
                "connection_id": f"eq.{connection_id}", "workspace_id": f"eq.{workspace_id}",
                "select": "encrypted_refresh_token,kms_key_version",
            })
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                return None
            hex_str = rows[0]["encrypted_refresh_token"]
            raw = bytes.fromhex(hex_str[2:] if hex_str.startswith("\\x") else hex_str)
            return raw, rows[0]["kms_key_version"]
        finally:
            if self._http is None:
                client.close()

    # ── profit recompute reads/writes ──────────────────────────────────────
    def get_workspace(self, workspace_id: str) -> dict:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/workspaces", params={
                "id": f"eq.{workspace_id}",
                "select": "vat_mode,currency,default_margin_rate,default_vat_rate,"
                          "default_return_rate,default_validation_rate,default_payment_fee_rate",
            })
            resp.raise_for_status()
            rows = resp.json()
            return rows[0] if rows else {}
        finally:
            if self._http is None:
                client.close()

    def read_product_stats(self, workspace_id: str, start: str, end: str) -> list[dict]:
        return self._read_stats("product_daily_stats", workspace_id, start, end,
                                "date,customer_id,campaign_id,ads_item_id,product_id,spend,conversions,conversion_value,currency")

    def read_campaign_stats(self, workspace_id: str, start: str, end: str) -> list[dict]:
        return self._read_stats("campaign_daily_stats", workspace_id, start, end,
                                "date,customer_id,campaign_id,spend,conversions,conversion_value,currency")

    def _read_stats(self, table, workspace_id, start, end, select) -> list[dict]:
        client = self._client()
        try:
            # Two filters on the same column (date) need separate query items.
            resp = client.get(f"{self._rest}/{table}", params=[
                ("workspace_id", f"eq.{workspace_id}"), ("date", f"gte.{start}"),
                ("date", f"lte.{end}"), ("select", select),
            ])
            resp.raise_for_status()
            return resp.json()
        finally:
            if self._http is None:
                client.close()

    def read_product_costs(self, workspace_id: str) -> dict[str, dict]:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/product_costs", params={
                "workspace_id": f"eq.{workspace_id}", "product_id": "not.is.null",
                "select": "product_id,cost_of_goods,shipping_cost,packaging_cost,other_cost,"
                          "payment_fee_rate,vat_rate,return_rate,validation_rate",
            })
            resp.raise_for_status()
            # NOTE: effective-dating ignored for V1 — last row per product wins.
            return {r["product_id"]: r for r in resp.json() if r.get("product_id")}
        finally:
            if self._http is None:
                client.close()

    def upsert_profit_facts(self, *, workspace_id: str, rows: list[dict]) -> int:
        client = self._client()
        try:
            return self._upsert(client, "profit_daily_facts",
                                "workspace_id,date,entity_type,entity_id", rows)
        finally:
            if self._http is None:
                client.close()

    # ── recommendation engine reads/writes ─────────────────────────────────
    def get_thresholds(self, workspace_id: str) -> dict:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/recommendation_thresholds", params={
                "workspace_id": f"eq.{workspace_id}", "select": "config",
            })
            resp.raise_for_status()
            rows = resp.json()
            return rows[0]["config"] if rows else {}
        finally:
            if self._http is None:
                client.close()

    def read_profit_facts(self, workspace_id: str, start: str, end: str) -> list[dict]:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/profit_daily_facts", params=[
                ("workspace_id", f"eq.{workspace_id}"), ("date", f"gte.{start}"),
                ("date", f"lte.{end}"),
                ("select", "date,entity_type,entity_id,spend,revenue,gross_profit_before_ads,"
                           "net_profit,poas,net_poas,waste_amount,confidence,currency"),
            ])
            resp.raise_for_status()
            return resp.json()
        finally:
            if self._http is None:
                client.close()

    def upsert_recommendations(self, *, workspace_id: str, rows: list[dict]) -> int:
        # status/resolved_at omitted from rows on purpose: merge-duplicates leaves
        # them untouched on refresh, so user acknowledge/dismiss is preserved.
        client = self._client()
        try:
            return self._upsert(client, "recommendations",
                                "workspace_id,rule_key,entity_type,entity_id,period_start", rows)
        finally:
            if self._http is None:
                client.close()
