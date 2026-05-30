"""Read-only analytics tools the copilot can call.

Each tool returns aggregated numbers straight from the materialized profit data —
no raw PII, no free-form computation. The model may only quote figures that came
back from a tool, which is what keeps it from fabricating numbers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Protocol

ToolFn = Callable[["CopilotStore", str, dict], dict]


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    parameters: dict       # JSON schema for the function arguments
    run: ToolFn


class CopilotStore(Protocol):
    def profit_summary(self, workspace_id: str, period_days: int) -> dict: ...
    def top_losses(self, workspace_id: str, period_days: int, limit: int) -> list[dict]: ...
    def open_recommendations(self, workspace_id: str, limit: int) -> list[dict]: ...


def _t_profit_summary(store: CopilotStore, ws: str, args: dict) -> dict:
    return store.profit_summary(ws, int(args.get("period_days", 30)))


def _t_top_losses(store: CopilotStore, ws: str, args: dict) -> dict:
    items = store.top_losses(ws, int(args.get("period_days", 30)), int(args.get("limit", 5)))
    return {"items": items}


def _t_recommendations(store: CopilotStore, ws: str, args: dict) -> dict:
    return {"items": store.open_recommendations(ws, int(args.get("limit", 10)))}


_PERIOD = {"period_days": {"type": "integer", "description": "lookback window in days (default 30)"}}

TOOLS: dict[str, Tool] = {t.name: t for t in [
    Tool("get_profit_summary",
         "Net profit, POAS, spend, revenue and wasted spend for the whole workspace "
         "over the last N days.",
         {"type": "object", "properties": dict(_PERIOD)}, _t_profit_summary),
    Tool("get_top_losses",
         "The products or campaigns losing the most net profit over the last N days.",
         {"type": "object", "properties": {**_PERIOD,
          "limit": {"type": "integer", "description": "max rows (default 5)"}}}, _t_top_losses),
    Tool("get_recommendations",
         "Current open profit recommendations (scale / reduce / wasted-spend / etc.).",
         {"type": "object", "properties": {
          "limit": {"type": "integer", "description": "max rows (default 10)"}}}, _t_recommendations),
]}


def build_tool_specs() -> list[dict]:
    """OpenRouter/OpenAI-style `tools` array advertising the callable functions."""
    return [
        {"type": "function",
         "function": {"name": t.name, "description": t.description, "parameters": t.parameters}}
        for t in TOOLS.values()
    ]


def dispatch_tool(store: CopilotStore, workspace_id: str, name: str, arguments: dict | None) -> dict:
    """Run a tool by name. Failures become {"error": ...} so the agent loop survives
    and the model can recover, rather than crashing the request."""
    tool = TOOLS.get(name)
    if tool is None:
        return {"error": f"unknown tool: {name}"}
    try:
        return tool.run(store, workspace_id, arguments or {})
    except Exception as exc:  # noqa: BLE001 — tool boundary must not break the loop
        return {"error": str(exc)}


# ── in-memory fake ───────────────────────────────────────────────────────────
class FakeCopilotStore:
    def __init__(self) -> None:
        self.summary: dict = {}
        self.losses: list[dict] = []
        self.recommendations: list[dict] = []
        self.fail_summary = False
        self.member = True

    def is_member(self, workspace_id: str, user_id: str) -> bool:
        return self.member

    def profit_summary(self, workspace_id: str, period_days: int) -> dict:
        if self.fail_summary:
            raise RuntimeError("db down")
        return self.summary

    def top_losses(self, workspace_id: str, period_days: int, limit: int) -> list[dict]:
        return self.losses[:limit]

    def open_recommendations(self, workspace_id: str, limit: int) -> list[dict]:
        return self.recommendations[:limit]
