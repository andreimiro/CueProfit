"""CueProfit projected-incrementality model (pure, no IO)."""

from incrementality.core import (
    DailyObservation,
    IncrementalityResult,
    estimate_incrementality,
)

__all__ = ["DailyObservation", "IncrementalityResult", "estimate_incrementality"]
