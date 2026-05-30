"""Workspace sync pipeline — one entry point for onboarding and scheduled runs."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

from cueprofit_security import EncryptedToken
from google_clients.merchant_client import MerchantClient

from cueprofit_workers.ads_auth import sync_google_ads_connection
from cueprofit_workers.dates import plan_date_range
from cueprofit_workers.profit import recompute_workspace_profit
from cueprofit_workers.recommendations import generate_workspace_recommendations
from cueprofit_workers.resolve import resolve_workspace_identities
from cueprofit_workers.settings import Settings, build_cipher, get_settings
from cueprofit_workers.stores import SupabaseStatsStore
from cueprofit_workers.sync_merchant import sync_merchant
from cueprofit_workers.tokens import refresh_access_token

log = logging.getLogger("cueprofit.workers.pipeline")

MODES = frozenset({"initial", "daily"})


def run_workspace_pipeline(
    workspace_id: str,
    *,
    mode: str = "initial",
    settings: Settings | None = None,
    store: SupabaseStatsStore | None = None,
    today: date | None = None,
) -> dict[str, Any]:
    """Run the full data pipeline for one workspace.

    initial — first connect: 90-day Ads backfill + Merchant catalog + profit stack
    daily   — scheduled: yesterday Ads + Merchant refresh + profit stack
    """
    if mode not in MODES:
        raise ValueError(f"unknown pipeline mode: {mode!r}")

    s = settings or get_settings()
    st = store or SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)
    cipher = build_cipher(s)
    run_day = today or date.today()
    ads_kind = "backfill" if mode == "initial" else "daily"
    summary: dict[str, Any] = {"mode": mode, "workspace_id": workspace_id, "steps": {}}

    ads_connections = st.list_google_ads_connections(workspace_id)
    for conn in ads_connections:
        try:
            result = sync_google_ads_connection(
                store=st,
                settings=s,
                cipher=cipher,
                workspace_id=workspace_id,
                conn=conn,
                kind=ads_kind,
                today=run_day,
            )
            summary["steps"].setdefault("google_ads", []).append(result)
        except Exception as exc:  # noqa: BLE001 — keep syncing other customers
            log.exception("pipeline: google ads sync failed customer=%s", conn.get("external_account_id"))
            summary["steps"].setdefault("google_ads_errors", []).append(
                {"customer_id": conn.get("external_account_id"), "error": str(exc)}
            )

    merchant_connections = st.list_merchant_connections(workspace_id)
    for conn in merchant_connections:
        secret = st.get_connection_secret(connection_id=conn["id"], workspace_id=workspace_id)
        if not secret:
            log.warning("pipeline: no secret for merchant connection %s", conn["id"])
            continue
        refresh_token = cipher.decrypt(EncryptedToken(*secret))
        access = refresh_access_token(
            refresh_token=refresh_token,
            client_id=s.google_ads_oauth_client_id,
            client_secret=s.google_ads_oauth_client_secret,
        )
        merchant = MerchantClient(access_token=access.access_token)
        result = sync_merchant(
            store=st,
            merchant_client=merchant,
            workspace_id=workspace_id,
            merchant_id=conn["external_account_id"],
            kind="catalog",
            connection_id=conn["id"],
        )
        summary["steps"].setdefault("merchant_center", []).append(result)

    if ads_connections or merchant_connections:
        summary["steps"]["resolve_identities"] = resolve_workspace_identities(
            store=st, workspace_id=workspace_id
        )

    profit_kind = "backfill" if mode == "initial" else "daily"
    start, end = plan_date_range(profit_kind, run_day)
    summary["steps"]["recompute_profit"] = recompute_workspace_profit(
        store=st, workspace_id=workspace_id, start=start, end=end
    )
    summary["steps"]["generate_recommendations"] = generate_workspace_recommendations(
        store=st, workspace_id=workspace_id, start=start, end=end
    )
    summary["range"] = [start, end]
    return summary
