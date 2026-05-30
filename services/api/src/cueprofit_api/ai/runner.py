"""The copilot agent loop and the OpenRouter client.

run_copilot drives a tool-calling conversation: ask the model, execute any tool
calls it makes against the read-only analytics tools, feed the results back, and
repeat until the model answers in plain text (or we hit max_steps). The request
build / response parse are split out as pure functions so they're unit-testable
without a live OpenRouter call.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional, Protocol

from cueprofit_api.ai.tools import CopilotStore, build_tool_specs, dispatch_tool

DEFAULT_SYSTEM = (
    "You are CueProfit's profit copilot. Answer the user's question about their Google "
    "Ads profitability. You may ONLY state numbers that a tool returned — never estimate "
    "or invent figures; if a tool didn't give you a number, say you don't have it. Always "
    "reason in terms of net profit and POAS, not ROAS. Be concise and specific."
)


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass(frozen=True)
class AssistantTurn:
    content: Optional[str]
    tool_calls: list[ToolCall] = field(default_factory=list)


@dataclass
class CopilotResult:
    answer: str
    steps: list[dict]
    messages: list[dict]
    stopped: Optional[str] = None


class LLMClient(Protocol):
    def complete(self, *, messages: list[dict], tools: list[dict]) -> AssistantTurn: ...


# ── OpenRouter request/response (pure helpers) ───────────────────────────────
def build_chat_request(model: str, messages: list[dict], tools: list[dict]) -> dict:
    return {"model": model, "messages": messages, "tools": tools, "tool_choice": "auto"}


def parse_assistant_turn(response: dict) -> AssistantTurn:
    message = (response.get("choices") or [{}])[0].get("message") or {}
    calls: list[ToolCall] = []
    for tc in message.get("tool_calls") or []:
        fn = tc.get("function") or {}
        raw = fn.get("arguments")
        if isinstance(raw, dict):
            args = raw
        elif isinstance(raw, str):
            try:
                args = json.loads(raw)
            except (ValueError, TypeError):
                args = {}
        else:
            args = {}
        calls.append(ToolCall(id=tc.get("id", ""), name=fn.get("name", ""), arguments=args))
    return AssistantTurn(content=message.get("content"), tool_calls=calls)


def _assistant_message(turn: AssistantTurn) -> dict:
    return {
        "role": "assistant",
        "content": turn.content,
        "tool_calls": [
            {"id": tc.id, "type": "function",
             "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)}}
            for tc in turn.tool_calls
        ],
    }


# ── agent loop ───────────────────────────────────────────────────────────────
def run_copilot(*, client: LLMClient, store: CopilotStore, workspace_id: str, question: str,
                system_prompt: str = DEFAULT_SYSTEM, max_steps: int = 6) -> CopilotResult:
    messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]
    tools = build_tool_specs()
    steps: list[dict] = []
    turn: AssistantTurn | None = None

    for _ in range(max_steps):
        turn = client.complete(messages=messages, tools=tools)
        if not turn.tool_calls:
            return CopilotResult(answer=turn.content or "", steps=steps, messages=messages)
        messages.append(_assistant_message(turn))
        for tc in turn.tool_calls:
            result = dispatch_tool(store, workspace_id, tc.name, tc.arguments)
            steps.append({"tool": tc.name, "arguments": tc.arguments, "result": result})
            messages.append({"role": "tool", "tool_call_id": tc.id, "name": tc.name,
                             "content": json.dumps(result)})

    return CopilotResult(answer=(turn.content if turn else "") or "", steps=steps,
                         messages=messages, stopped="max_steps")


# ── clients ──────────────────────────────────────────────────────────────────
class OpenRouterClient:
    """Calls OpenRouter's OpenAI-compatible chat/completions endpoint."""

    def __init__(self, *, api_key: str, base_url: str, model: str, http=None) -> None:
        self._url = f"{base_url.rstrip('/')}/chat/completions"
        self._key = api_key
        self._model = model
        self._http = http

    def complete(self, *, messages: list[dict], tools: list[dict]) -> AssistantTurn:
        import httpx

        client = self._http or httpx.Client(
            timeout=120,
            headers={"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"},
        )
        try:
            resp = client.post(self._url, json=build_chat_request(self._model, messages, tools))
            resp.raise_for_status()
            return parse_assistant_turn(resp.json())
        finally:
            if self._http is None:
                client.close()


class FakeLLMClient:
    """Replays scripted assistant turns and records the messages it was asked with."""

    def __init__(self, turns: list[AssistantTurn]) -> None:
        self.turns = list(turns)
        self.seen: list[list[dict]] = []

    def complete(self, *, messages: list[dict], tools: list[dict]) -> AssistantTurn:
        self.seen.append(list(messages))
        return self.turns[len(self.seen) - 1]
