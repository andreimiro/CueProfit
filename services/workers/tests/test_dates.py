from datetime import date, timedelta

import pytest

from cueprofit_workers.dates import plan_date_range

TODAY = date(2026, 5, 30)
YESTERDAY = (TODAY - timedelta(days=1)).isoformat()


def test_backfill_is_last_90_days_through_yesterday():
    start, end = plan_date_range("backfill", TODAY)
    assert end == YESTERDAY
    assert start == (TODAY - timedelta(days=90)).isoformat()


def test_daily_is_yesterday_only():
    start, end = plan_date_range("daily", TODAY)
    assert start == YESTERDAY and end == YESTERDAY


def test_lag_repull_is_trailing_14_days():
    start, end = plan_date_range("lag_repull", TODAY)
    assert end == YESTERDAY
    assert start == (TODAY - timedelta(days=14)).isoformat()


def test_unknown_kind_raises():
    with pytest.raises(ValueError):
        plan_date_range("nope", TODAY)
