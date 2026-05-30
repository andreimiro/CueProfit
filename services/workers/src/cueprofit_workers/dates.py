"""Date-range planning for the sync kinds. Pure."""

from __future__ import annotations

from datetime import date, timedelta

_BACKFILL_DAYS = 90
_LAG_DAYS = 14


def plan_date_range(kind: str, today: date) -> tuple[str, str]:
    """Return (start, end) inclusive 'YYYY-MM-DD' strings ending yesterday.

    backfill   → last 90 days (initial load)
    daily      → yesterday only (Google Ads finalizes the prior day)
    lag_repull → trailing 14 days (conversions keep landing after the click)
    """
    end = today - timedelta(days=1)
    if kind == "backfill":
        start = today - timedelta(days=_BACKFILL_DAYS)
    elif kind == "daily":
        start = end
    elif kind == "lag_repull":
        start = today - timedelta(days=_LAG_DAYS)
    else:
        raise ValueError(f"unknown sync kind: {kind!r}")
    return start.isoformat(), end.isoformat()
