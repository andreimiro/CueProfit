from cueprofit_api.ai.runner import (
    AssistantTurn,
    FakeLLMClient,
    ToolCall,
    build_chat_request,
    parse_assistant_turn,
    run_copilot,
)
from cueprofit_api.ai.tools import FakeCopilotStore, build_tool_specs, dispatch_tool

WS = "ws-1"


def _store() -> FakeCopilotStore:
    s = FakeCopilotStore()
    s.summary = {"spend": 1000.0, "revenue": 3000.0, "net_profit": -120.0,
                 "poas": 0.95, "waste": 200.0, "currency": "RON"}
    s.losses = [{"entity_type": "product", "entity_id": "sku1", "net_profit": -80.0, "roas": 4.0}]
    s.recommendations = [{"kind": "good_roas_bad_profit", "entity_id": "sku1",
                          "title": "4.0x ROAS but losing money"}]
    return s


# ── tool specs ───────────────────────────────────────────────────────────────
def test_build_tool_specs_are_well_formed_function_schemas():
    specs = build_tool_specs()
    names = {s["function"]["name"] for s in specs}
    assert {"get_profit_summary", "get_top_losses", "get_recommendations"} <= names
    for s in specs:
        assert s["type"] == "function"
        assert "name" in s["function"] and "parameters" in s["function"]


# ── dispatch ─────────────────────────────────────────────────────────────────
def test_dispatch_get_profit_summary_returns_store_numbers():
    out = dispatch_tool(_store(), WS, "get_profit_summary", {"period_days": 30})
    assert out["net_profit"] == -120.0 and out["currency"] == "RON"


def test_dispatch_top_losses_wraps_items_and_respects_limit():
    s = _store()
    s.losses = [{"entity_id": f"s{i}", "net_profit": -float(i)} for i in range(5)]
    out = dispatch_tool(s, WS, "get_top_losses", {"limit": 2})
    assert len(out["items"]) == 2


def test_dispatch_unknown_tool_returns_error_not_raises():
    out = dispatch_tool(_store(), WS, "no_such_tool", {})
    assert "error" in out


def test_dispatch_tool_failure_is_captured_as_error():
    s = _store()
    s.fail_summary = True
    out = dispatch_tool(s, WS, "get_profit_summary", {})
    assert "error" in out and "db down" in out["error"]


# ── OpenRouter request build + response parse ────────────────────────────────
def test_build_chat_request_includes_model_messages_and_tools():
    body = build_chat_request("anthropic/claude-sonnet-4",
                              [{"role": "user", "content": "hi"}], build_tool_specs())
    assert body["model"] == "anthropic/claude-sonnet-4"
    assert body["tools"] and body["tool_choice"] == "auto"


def test_parse_assistant_turn_extracts_tool_calls_with_json_arguments():
    resp = {"choices": [{"message": {"content": None, "tool_calls": [
        {"id": "c1", "type": "function",
         "function": {"name": "get_profit_summary", "arguments": '{"period_days": 7}'}}]}}]}
    turn = parse_assistant_turn(resp)
    assert turn.tool_calls[0].name == "get_profit_summary"
    assert turn.tool_calls[0].arguments == {"period_days": 7}


def test_parse_assistant_turn_plain_text_has_no_tool_calls():
    resp = {"choices": [{"message": {"content": "hello", "tool_calls": None}}]}
    turn = parse_assistant_turn(resp)
    assert turn.content == "hello" and turn.tool_calls == []


def test_parse_assistant_turn_tolerates_malformed_arguments():
    resp = {"choices": [{"message": {"tool_calls": [
        {"id": "c1", "function": {"name": "x", "arguments": "{not json"}}]}}]}
    turn = parse_assistant_turn(resp)
    assert turn.tool_calls[0].arguments == {}


# ── agent loop ───────────────────────────────────────────────────────────────
def test_run_copilot_executes_requested_tool_then_returns_final_answer():
    store = _store()
    client = FakeLLMClient([
        AssistantTurn(content=None, tool_calls=[
            ToolCall(id="c1", name="get_profit_summary", arguments={"period_days": 30})]),
        AssistantTurn(content="You're losing 120 RON despite a 3x ROAS.", tool_calls=[]),
    ])
    result = run_copilot(client=client, store=store, workspace_id=WS, question="How's profit?")
    assert result.answer.startswith("You're losing 120 RON")
    assert len(result.steps) == 1 and result.steps[0]["tool"] == "get_profit_summary"
    assert result.steps[0]["result"]["net_profit"] == -120.0
    # the tool result was fed back to the model on the second call
    assert any(m["role"] == "tool" for m in client.seen[-1])


def test_run_copilot_caps_tool_calls_per_step():
    store = _store()
    flood = AssistantTurn(content=None, tool_calls=[
        ToolCall(id=f"c{i}", name="get_profit_summary", arguments={}) for i in range(20)])
    client = FakeLLMClient([flood, AssistantTurn(content="done", tool_calls=[])])
    result = run_copilot(client=client, store=store, workspace_id=WS, question="x",
                         max_tool_calls_per_step=8)
    assert len(result.steps) == 8 and result.answer == "done"
    # the assistant message must only claim the calls we actually answered (protocol-valid)
    assistant_msg = next(m for m in result.messages if m["role"] == "assistant")
    assert len(assistant_msg["tool_calls"]) == 8


def test_run_copilot_stops_at_max_steps_when_model_loops():
    store = _store()
    looping = AssistantTurn(content=None, tool_calls=[
        ToolCall(id="c", name="get_profit_summary", arguments={})])
    client = FakeLLMClient([looping] * 10)
    result = run_copilot(client=client, store=store, workspace_id=WS, question="x", max_steps=3)
    assert result.stopped == "max_steps"
    assert len(result.steps) == 3
