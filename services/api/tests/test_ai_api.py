import uuid

import pytest
from fastapi.testclient import TestClient

from cueprofit_api import ai_api
from cueprofit_api.ai.runner import AssistantTurn, FakeLLMClient, ToolCall
from cueprofit_api.ai.tools import FakeCopilotStore
from cueprofit_api.main import app
from cueprofit_api.settings import get_settings

WS = str(uuid.uuid4())
USER = str(uuid.uuid4())
AUTH = {"Authorization": "Bearer sekret"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("PYTHON_API_INTERNAL_TOKEN", "sekret")
    get_settings.cache_clear()
    yield TestClient(app)
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def _use_fakes(store, turns):
    app.dependency_overrides[ai_api.get_copilot_store] = lambda: store
    app.dependency_overrides[ai_api.get_llm_client] = lambda: FakeLLMClient(turns)


def test_ask_requires_internal_token(client):
    r = client.post("/ai/ask", json={"workspace_id": WS, "caller_user_id": USER, "question": "hi"})
    assert r.status_code == 401


def test_ask_returns_copilot_answer(client):
    store = FakeCopilotStore()
    store.summary = {"net_profit": -120.0, "currency": "RON"}
    _use_fakes(store, [AssistantTurn(content="You are losing 120 RON.", tool_calls=[])])
    r = client.post("/ai/ask", headers=AUTH,
                    json={"workspace_id": WS, "caller_user_id": USER, "question": "How is profit?"})
    assert r.status_code == 200
    assert r.json()["answer"] == "You are losing 120 RON."


def test_ask_runs_a_tool_and_reports_the_step(client):
    store = FakeCopilotStore()
    store.summary = {"net_profit": -120.0, "currency": "RON"}
    _use_fakes(store, [
        AssistantTurn(content=None, tool_calls=[
            ToolCall(id="c1", name="get_profit_summary", arguments={"period_days": 30})]),
        AssistantTurn(content="Net profit is -120 RON.", tool_calls=[]),
    ])
    r = client.post("/ai/ask", headers=AUTH,
                    json={"workspace_id": WS, "caller_user_id": USER, "question": "profit?"})
    assert r.status_code == 200
    body = r.json()
    assert body["steps"][0]["tool"] == "get_profit_summary"
    assert body["steps"][0]["result"]["net_profit"] == -120.0


def test_ask_rejects_non_member(client):
    store = FakeCopilotStore()
    store.member = False
    _use_fakes(store, [AssistantTurn(content="x", tool_calls=[])])
    r = client.post("/ai/ask", headers=AUTH,
                    json={"workspace_id": WS, "caller_user_id": USER, "question": "q"})
    assert r.status_code == 403
