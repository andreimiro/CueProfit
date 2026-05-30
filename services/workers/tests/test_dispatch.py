import pytest

from cueprofit_workers.cli import JOBS, run


def test_core_jobs_are_registered():
    for name in (
        "sync_google_ads",
        "sync_merchant",
        "resolve_identities",
        "recompute_profit",
        "generate_recommendations",
    ):
        assert name in JOBS


def test_run_known_job_returns_zero():
    assert run(["refresh_fx", "--workspace", "abc"]) == 0  # a still-stub job


def test_run_unknown_job_raises():
    with pytest.raises(SystemExit):
        run(["does_not_exist"])


def test_run_without_job_raises():
    with pytest.raises(SystemExit):
        run([])
