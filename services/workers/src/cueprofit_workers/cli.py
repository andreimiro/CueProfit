"""Cloud Run Jobs dispatcher.

Each Cloud Run Job runs `cueprofit-workers <job> --workspace <id> [--kind daily]`.
Scheduling is owned by Cloud Scheduler; this module routes to the job.
"""

from __future__ import annotations

import logging
import sys
from collections.abc import Sequence
from datetime import date
from typing import Callable

log = logging.getLogger("cueprofit.workers")

JobFn = Callable[[list[str]], int]


def _arg(args: list[str], name: str, default: str | None = None) -> str | None:
    if name in args:
        i = args.index(name)
        if i + 1 < len(args):
            return args[i + 1]
    return default


def _require_workspace(args: list[str]) -> str:
    ws = _arg(args, "--workspace")
    if not ws:
        raise SystemExit("--workspace <id> is required")
    return ws


def job_sync_workspace(args: list[str]) -> int:
    """Run the full workspace pipeline (onboarding or scheduled refresh)."""
    from cueprofit_workers.pipeline import run_workspace_pipeline
    from cueprofit_workers.settings import get_settings

    workspace_id = _require_workspace(args)
    mode = _arg(args, "--mode", "initial")
    if mode not in ("initial", "daily"):
        raise SystemExit("--mode must be initial or daily")
    result = run_workspace_pipeline(workspace_id, mode=mode, settings=get_settings())
    log.info("sync_workspace workspace=%s mode=%s %s", workspace_id, mode, result)
    return 0


def job_sync_all_workspaces(args: list[str]) -> int:
    """Run the daily pipeline for every workspace with Google Ads connected."""
    from cueprofit_workers.sync_all import run_sync_all_workspaces
    from cueprofit_workers.settings import get_settings

    mode = _arg(args, "--mode", "daily")
    if mode not in ("initial", "daily"):
        raise SystemExit("--mode must be initial or daily")
    result = run_sync_all_workspaces(mode=mode, settings=get_settings())
    log.info("sync_all_workspaces mode=%s %s", mode, result)
    if result["workspaces"] == 0:
        return 0
    return 0 if result["failed"] == 0 else 1


def job_sync_google_ads(args: list[str]) -> int:
    """Auto-discovers ALL connected customers for the workspace and syncs each."""
    from cueprofit_workers.ads_auth import sync_google_ads_connection
    from cueprofit_workers.settings import build_cipher, get_settings
    from cueprofit_workers.stores import SupabaseStatsStore

    s = get_settings()
    workspace_id = _require_workspace(args)
    kind = _arg(args, "--kind", "daily")
    store = SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)
    cipher = build_cipher(s)
    today = date.today()

    connections = store.list_google_ads_connections(workspace_id)
    log.info("sync_google_ads workspace=%s connections=%d kind=%s", workspace_id, len(connections), kind)
    for conn in connections:
        try:
            result = sync_google_ads_connection(
                store=store,
                settings=s,
                cipher=cipher,
                workspace_id=workspace_id,
                conn=conn,
                kind=kind,
                today=today,
            )
            log.info("synced customer=%s %s", conn["external_account_id"], result)
        except Exception as exc:  # noqa: BLE001
            log.exception("sync_google_ads failed customer=%s: %s", conn.get("external_account_id"), exc)
    return 0


def job_sync_merchant(args: list[str]) -> int:
    """Sync processed catalog products for all connected Merchant Center accounts."""
    from cueprofit_security import EncryptedToken
    from google_clients.merchant_client import MerchantClient

    from cueprofit_workers.settings import build_cipher, get_settings
    from cueprofit_workers.stores import SupabaseStatsStore
    from cueprofit_workers.sync_merchant import sync_merchant
    from cueprofit_workers.tokens import refresh_access_token

    s = get_settings()
    workspace_id = _require_workspace(args)
    kind = _arg(args, "--kind", "catalog")
    store = SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)
    cipher = build_cipher(s)

    connections = store.list_merchant_connections(workspace_id)
    log.info("sync_merchant workspace=%s connections=%d kind=%s", workspace_id, len(connections), kind)
    for conn in connections:
        secret = store.get_connection_secret(connection_id=conn["id"], workspace_id=workspace_id)
        if not secret:
            log.warning("no stored secret for connection %s; skipping", conn["id"])
            continue
        refresh_token = cipher.decrypt(EncryptedToken(*secret))
        access = refresh_access_token(
            refresh_token=refresh_token,
            client_id=s.google_ads_oauth_client_id,
            client_secret=s.google_ads_oauth_client_secret,
        )
        merchant = MerchantClient(access_token=access.access_token)
        result = sync_merchant(
            store=store,
            merchant_client=merchant,
            workspace_id=workspace_id,
            merchant_id=conn["external_account_id"],
            kind=kind,
            connection_id=conn["id"],
        )
        log.info("synced merchant=%s %s", conn["external_account_id"], result)
    return 0


def job_resolve_identities(args: list[str]) -> int:
    from cueprofit_workers.resolve import resolve_workspace_identities
    from cueprofit_workers.settings import get_settings
    from cueprofit_workers.stores import SupabaseStatsStore

    s = get_settings()
    workspace_id = _require_workspace(args)
    store = SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)
    result = resolve_workspace_identities(store=store, workspace_id=workspace_id)
    log.info("resolve_identities workspace=%s %s", workspace_id, result)
    return 0


def job_recompute_profit(args: list[str]) -> int:
    from cueprofit_workers.dates import plan_date_range
    from cueprofit_workers.profit import recompute_workspace_profit
    from cueprofit_workers.settings import get_settings
    from cueprofit_workers.stores import SupabaseStatsStore

    s = get_settings()
    workspace_id = _require_workspace(args)
    start, end = _arg(args, "--start"), _arg(args, "--end")
    if not (start and end):
        start, end = plan_date_range("backfill", date.today())  # default: last 90 days
    store = SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)
    result = recompute_workspace_profit(store=store, workspace_id=workspace_id, start=start, end=end)
    log.info("recompute_profit workspace=%s range=%s..%s %s", workspace_id, start, end, result)
    return 0


def job_generate_recommendations(args: list[str]) -> int:
    from cueprofit_workers.dates import plan_date_range
    from cueprofit_workers.recommendations import generate_workspace_recommendations
    from cueprofit_workers.settings import get_settings
    from cueprofit_workers.stores import SupabaseStatsStore

    s = get_settings()
    workspace_id = _require_workspace(args)
    start, end = _arg(args, "--start"), _arg(args, "--end")
    if not (start and end):
        start, end = plan_date_range("backfill", date.today())  # default: last 90 days
    store = SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)
    result = generate_workspace_recommendations(store=store, workspace_id=workspace_id, start=start, end=end)
    log.info("generate_recommendations workspace=%s range=%s..%s %s", workspace_id, start, end, result)
    return 0


def _stub(name: str) -> JobFn:
    def job(args: list[str]) -> int:
        log.info("job=%s status=stub args=%s", name, args)
        return 0

    return job


JOBS: dict[str, JobFn] = {
    "sync_workspace": job_sync_workspace,
    "sync_all_workspaces": job_sync_all_workspaces,
    "sync_google_ads": job_sync_google_ads,
    "sync_merchant": job_sync_merchant,
    "resolve_identities": job_resolve_identities,
    "recompute_profit": job_recompute_profit,
    "generate_recommendations": job_generate_recommendations,
    "refresh_fx": _stub("refresh_fx"),
    "refresh_tokens": _stub("refresh_tokens"),
}


def run(argv: Sequence[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args:
        raise SystemExit(f"usage: cueprofit-workers <job> [args...]\njobs: {', '.join(JOBS)}")
    job_name, rest = args[0], args[1:]
    if job_name not in JOBS:
        raise SystemExit(f"unknown job: {job_name!r}\njobs: {', '.join(JOBS)}")
    return JOBS[job_name](rest)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    raise SystemExit(run())
