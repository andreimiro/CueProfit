from unittest.mock import patch

from cueprofit_workers.pipeline import run_workspace_pipeline
from cueprofit_workers.stores import FakeStatsStore


def test_pipeline_runs_profit_steps_without_connections(monkeypatch):
    store = FakeStatsStore()

    monkeypatch.setattr(
        "cueprofit_workers.pipeline.resolve_workspace_identities",
        lambda *, store, workspace_id: {"mapped": 0, "linked": 0},
    )
    monkeypatch.setattr(
        "cueprofit_workers.pipeline.recompute_workspace_profit",
        lambda *, store, workspace_id, start, end: {"rows": 0},
    )
    monkeypatch.setattr(
        "cueprofit_workers.pipeline.generate_workspace_recommendations",
        lambda *, store, workspace_id, start, end: {"rows": 0},
    )

    out = run_workspace_pipeline("ws1", mode="initial", store=store)  # type: ignore[arg-type]
    assert out["mode"] == "initial"
    assert "recompute_profit" in out["steps"]
    assert "generate_recommendations" in out["steps"]
    assert "google_ads" not in out["steps"]
