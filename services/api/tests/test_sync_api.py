import uuid

from fastapi.testclient import TestClient

from cueprofit_api.main import app
from cueprofit_api.settings import get_settings

AUTH = {"Authorization": "Bearer sekret"}
WS = str(uuid.uuid4())


def test_sync_workspace_requires_internal_token():
    client = TestClient(app)
    r = client.post(f"/internal/workspaces/{WS}/sync", json={"mode": "initial"})
    assert r.status_code == 401


def test_sync_workspace_enqueues(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("PYTHON_API_INTERNAL_TOKEN", "sekret")
    get_settings.cache_clear()

    queued: list[tuple] = []

    def fake_enqueue(workspace_id, *, mode):
        queued.append((workspace_id, mode))
        return {"queued": True, "workspace_id": workspace_id, "mode": mode}

    monkeypatch.setattr("cueprofit_api.sync_api.enqueue_workspace_sync", fake_enqueue)
    client = TestClient(app)
    r = client.post(f"/internal/workspaces/{WS}/sync", headers=AUTH, json={"mode": "initial"})
    assert r.status_code == 200, r.text
    assert queued == [(WS, "initial")]
    get_settings.cache_clear()


def test_sync_all_enqueues(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("PYTHON_API_INTERNAL_TOKEN", "sekret")
    get_settings.cache_clear()

    queued: list[str] = []

    def fake_enqueue(*, mode):
        queued.append(mode)
        return {"queued": True, "mode": mode}

    monkeypatch.setattr("cueprofit_api.sync_api.enqueue_sync_all", fake_enqueue)
    client = TestClient(app)
    r = client.post("/internal/sync/all", headers=AUTH, json={"mode": "daily"})
    assert r.status_code == 200, r.text
    assert queued == ["daily"]
    get_settings.cache_clear()
