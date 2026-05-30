"""Run the workspace pipeline for every workspace with an active Google Ads connection."""

from __future__ import annotations

import logging
from typing import Any

from cueprofit_workers.pipeline import run_workspace_pipeline
from cueprofit_workers.settings import Settings, get_settings
from cueprofit_workers.stores import SupabaseStatsStore

log = logging.getLogger("cueprofit.workers.sync_all")


def run_sync_all_workspaces(
    *,
    mode: str = "daily",
    settings: Settings | None = None,
    store: SupabaseStatsStore | None = None,
) -> dict[str, Any]:
    """Daily scheduler entry point — sync each connected workspace sequentially."""
    s = settings or get_settings()
    st = store or SupabaseStatsStore(base_url=s.supabase_url, service_role_key=s.supabase_service_role_key)

    workspace_ids = st.list_workspaces_with_google_ads()
    log.info("sync_all mode=%s workspaces=%d", mode, len(workspace_ids))

    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for workspace_id in workspace_ids:
        try:
            summary = run_workspace_pipeline(workspace_id, mode=mode, settings=s, store=st)
            results.append({"workspace_id": workspace_id, "summary": summary})
            log.info("sync_all ok workspace=%s", workspace_id)
        except Exception as exc:  # noqa: BLE001 — continue with remaining workspaces
            log.exception("sync_all failed workspace=%s", workspace_id)
            errors.append({"workspace_id": workspace_id, "error": str(exc)})

    return {
        "mode": mode,
        "workspaces": len(workspace_ids),
        "succeeded": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }
