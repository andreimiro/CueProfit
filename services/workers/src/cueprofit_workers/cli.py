"""Cloud Run Jobs dispatcher.

Each Cloud Run Job container runs `cueprofit-workers <job> [args...]`.
Scheduling is owned by Cloud Scheduler; this module just routes to the job.

Job bodies are stubs for now — Milestone 1 fills them in:
  sync_google_ads          backfill/daily/lag GAQL pulls → *_daily_stats
  sync_merchant            Merchant API products + product issues
  resolve_identities       Ads item_id ↔ Merchant offer_id ↔ cost rows
  recompute_profit         profit_daily_facts via packages/profit-engine
  generate_recommendations deterministic rules → recommendations
  refresh_fx               fx_rates ingestion
  refresh_tokens           refresh + re-encrypt OAuth tokens (Cloud KMS)
"""

from __future__ import annotations

import logging
import sys
from collections.abc import Sequence
from typing import Callable

log = logging.getLogger("cueprofit.workers")

JobFn = Callable[[list[str]], int]


def _stub(name: str) -> JobFn:
    def job(args: list[str]) -> int:
        log.info("job=%s status=stub args=%s", name, args)
        return 0

    return job


JOBS: dict[str, JobFn] = {
    "sync_google_ads": _stub("sync_google_ads"),
    "sync_merchant": _stub("sync_merchant"),
    "resolve_identities": _stub("resolve_identities"),
    "recompute_profit": _stub("recompute_profit"),
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
