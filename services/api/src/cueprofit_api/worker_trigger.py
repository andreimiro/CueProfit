"""Enqueue workspace sync jobs (Cloud Run in prod, subprocess in local dev)."""

from __future__ import annotations

import logging
import subprocess
from typing import Any

from cueprofit_api.settings import Settings, get_settings

log = logging.getLogger("cueprofit.api.worker_trigger")


def enqueue_workspace_sync(workspace_id: str, *, mode: str = "initial") -> dict[str, Any]:
    """Kick off `sync_workspace` after connect or cost setup."""
    settings = get_settings()
    if settings.workers_inline_sync and settings.app_env == "development":
        return _run_inline(["sync_workspace", "--workspace", workspace_id, "--mode", mode])
    if settings.workers_cloud_run_job and settings.gcp_project_id:
        return _run_cloud_run_job(
            settings,
            job="sync_workspace",
            args=["--workspace", workspace_id, "--mode", mode],
        )
    log.info(
        "workspace sync not queued (set WORKERS_CLOUD_RUN_JOB in prod): workspace=%s mode=%s",
        workspace_id,
        mode,
    )
    return {"queued": False, "workspace_id": workspace_id, "mode": mode}


def enqueue_sync_all(*, mode: str = "daily") -> dict[str, Any]:
    """Kick off `sync_all_workspaces` — used by Cloud Scheduler / cron."""
    settings = get_settings()
    if settings.workers_inline_sync and settings.app_env == "development":
        return _run_inline(["sync_all_workspaces", "--mode", mode])
    if settings.workers_cloud_run_job and settings.gcp_project_id:
        return _run_cloud_run_job(settings, job="sync_all_workspaces", args=["--mode", mode])
    log.info(
        "sync_all not queued (set WORKERS_CLOUD_RUN_JOB in prod): mode=%s",
        mode,
    )
    return {"queued": False, "mode": mode}


def _run_inline(argv: list[str]) -> dict[str, Any]:
    cmd = ["cueprofit-workers", *argv]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)  # noqa: S603
    log.info("spawned inline worker: %s", " ".join(cmd))
    return {"queued": True, "inline": True, "args": argv}


def _run_cloud_run_job(settings: Settings, *, job: str, args: list[str]) -> dict[str, Any]:
    import httpx

    url = (
        f"https://run.googleapis.com/v2/projects/{settings.gcp_project_id}"
        f"/locations/{settings.gcp_region}/jobs/{settings.workers_cloud_run_job}:run"
    )
    body = {"overrides": {"containerOverrides": [{"args": [job, *args]}]}}
    resp = httpx.post(
        url,
        headers={"Authorization": f"Bearer {_gcp_access_token()}", "Content-Type": "application/json"},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    execution = resp.json().get("name", "")
    log.info("queued cloud run job=%s execution=%s args=%s", job, execution, args)
    return {"queued": True, "execution": execution, "job": job, "args": args}


def _gcp_access_token() -> str:
    try:
        import google.auth.transport.requests
    except ImportError as exc:
        raise RuntimeError("google-auth is required to trigger Cloud Run jobs") from exc

    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    req = google.auth.transport.requests.Request()
    creds.refresh(req)
    return creds.token
