from unittest.mock import patch

from cueprofit_workers.sync_all import run_sync_all_workspaces
from cueprofit_workers.stores import FakeStatsStore


def test_sync_all_runs_pipeline_per_workspace():
    store = FakeStatsStore()
    store.list_workspaces_with_google_ads = lambda: ["ws-a", "ws-b"]  # type: ignore[method-assign]

    calls: list[tuple[str, str]] = []

    with patch("cueprofit_workers.sync_all.run_workspace_pipeline") as pipeline:
        pipeline.side_effect = lambda ws, **kw: calls.append((ws, kw["mode"])) or {"steps": {}}
        out = run_sync_all_workspaces(mode="daily", store=store)  # type: ignore[arg-type]

    assert out["workspaces"] == 2
    assert out["succeeded"] == 2
    assert out["failed"] == 0
    assert calls == [("ws-a", "daily"), ("ws-b", "daily")]


def test_sync_all_continues_after_failure():
    store = FakeStatsStore()
    store.list_workspaces_with_google_ads = lambda: ["ws-ok", "ws-bad"]  # type: ignore[method-assign]

    def pipeline(ws, **kw):
        if ws == "ws-bad":
            raise RuntimeError("ads api down")
        return {"steps": {}}

    with patch("cueprofit_workers.sync_all.run_workspace_pipeline", side_effect=pipeline):
        out = run_sync_all_workspaces(mode="daily", store=store)  # type: ignore[arg-type]

    assert out["succeeded"] == 1
    assert out["failed"] == 1
    assert out["errors"][0]["workspace_id"] == "ws-bad"
