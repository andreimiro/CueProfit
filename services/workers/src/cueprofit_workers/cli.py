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


def job_sync_google_ads(args: list[str]) -> int:
    """Auto-discovers ALL connected customers for the workspace and syncs each."""
    from cueprofit_security import EncryptedToken
    from google_clients.ads_client import GoogleAdsClient

    from cueprofit_workers.settings import build_cipher, get_settings
    from cueprofit_workers.stores import SupabaseStatsStore
    from cueprofit_workers.sync_ads import sync_google_ads

    s = get_settings()
    workspace_id = _require_workspace(args)
    kind = _arg(args, "--kind", "daily")
    store = SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)
    cipher = build_cipher(s)
    today = date.today()

    connections = store.list_google_ads_connections(workspace_id)
    log.info("sync_google_ads workspace=%s connections=%d kind=%s", workspace_id, len(connections), kind)
    for conn in connections:
        secret = store.get_connection_secret(connection_id=conn["id"], workspace_id=workspace_id)
        if not secret:
            log.warning("no stored secret for connection %s; skipping", conn["id"])
            continue
        refresh_token = cipher.decrypt(EncryptedToken(*secret))
        ads = GoogleAdsClient(
            developer_token=s.google_ads_developer_token,
            client_id=s.google_ads_oauth_client_id,
            client_secret=s.google_ads_oauth_client_secret,
            refresh_token=refresh_token,
            login_customer_id=s.google_ads_login_customer_id or None,
        )
        result = sync_google_ads(
            store=store, ads_client=ads, workspace_id=workspace_id,
            customer_id=conn["external_account_id"], kind=kind, connection_id=conn["id"], today=today,
        )
        log.info("synced customer=%s %s", conn["external_account_id"], result)
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


def _stub(name: str) -> JobFn:
    def job(args: list[str]) -> int:
        log.info("job=%s status=stub args=%s", name, args)
        return 0

    return job


JOBS: dict[str, JobFn] = {
    "sync_google_ads": job_sync_google_ads,
    "sync_merchant": _stub("sync_merchant"),          # Merchant API client: follow-up
    "resolve_identities": job_resolve_identities,
    "recompute_profit": job_recompute_profit,
    "generate_recommendations": _stub("generate_recommendations"),
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
