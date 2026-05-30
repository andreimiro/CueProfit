"""AI copilot endpoint. Internal-only (BFF → internal token): the Next.js layer
authenticates the Supabase user and forwards the verified caller id + workspace;
we re-check workspace membership here so the internal token can't be used to read
another tenant's numbers."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from cueprofit_api.ai.runner import OpenRouterClient, run_copilot
from cueprofit_api.connect_api import require_internal
from cueprofit_api.settings import Settings, get_settings

router = APIRouter(prefix="/ai", dependencies=[Depends(require_internal)])


class AskReq(BaseModel):
    workspace_id: str
    caller_user_id: str
    question: str = Field(min_length=1, max_length=2000)


def get_llm_client(settings: Settings = Depends(get_settings)) -> OpenRouterClient:
    return OpenRouterClient(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        model=settings.openrouter_model_copilot,
    )


def get_copilot_store(settings: Settings = Depends(get_settings)) -> "SupabaseCopilotStore":
    return SupabaseCopilotStore(
        base_url=settings.supabase_url, service_role_key=settings.supabase_service_role_key
    )


@router.post("/ask")
def ai_ask(req: AskReq, client=Depends(get_llm_client), store=Depends(get_copilot_store)) -> dict:
    if not store.is_member(req.workspace_id, req.caller_user_id):
        raise HTTPException(status_code=403, detail="not a workspace member")
    result = run_copilot(client=client, store=store, workspace_id=req.workspace_id,
                         question=req.question)
    return {"answer": result.answer, "steps": result.steps, "stopped": result.stopped}


# ── Supabase-backed copilot store (PostgREST; service-role) ──────────────────
class SupabaseCopilotStore:
    def __init__(self, *, base_url: str, service_role_key: str, http=None) -> None:
        self._rest = f"{base_url.rstrip('/')}/rest/v1"
        self._key = service_role_key
        self._http = http

    def _client(self):
        import httpx

        return self._http or httpx.Client(
            timeout=30,
            headers={"apikey": self._key, "Authorization": f"Bearer {self._key}"},
        )

    @staticmethod
    def _window(period_days: int) -> tuple[str, str]:
        today = date.today()
        return (today - timedelta(days=period_days)).isoformat(), today.isoformat()

    def _get(self, path: str, params) -> list[dict]:
        client = self._client()
        try:
            resp = client.get(f"{self._rest}/{path}", params=params)
            resp.raise_for_status()
            return resp.json()
        finally:
            if self._http is None:
                client.close()

    def is_member(self, workspace_id: str, user_id: str) -> bool:
        rows = self._get("workspace_members", {
            "workspace_id": f"eq.{workspace_id}", "user_id": f"eq.{user_id}",
            "select": "user_id", "limit": "1",
        })
        return bool(rows)

    def profit_summary(self, workspace_id: str, period_days: int) -> dict:
        start, end = self._window(period_days)
        rows = self._get("profit_daily_facts", [
            ("workspace_id", f"eq.{workspace_id}"), ("entity_type", "eq.account"),
            ("date", f"gte.{start}"), ("date", f"lte.{end}"),
            ("select", "spend,revenue,gross_profit_before_ads,net_profit,waste_amount,currency"),
        ])
        agg = {k: 0.0 for k in ("spend", "revenue", "gross_profit_before_ads",
                                "net_profit", "waste_amount")}
        currency = None
        for r in rows:
            for k in agg:
                agg[k] += float(r.get(k) or 0)
            currency = currency or r.get("currency")
        spend = agg["spend"]
        return {
            "period_days": period_days,
            "spend": round(spend, 2), "revenue": round(agg["revenue"], 2),
            "net_profit": round(agg["net_profit"], 2),
            "waste": round(agg["waste_amount"], 2),
            "poas": round(agg["gross_profit_before_ads"] / spend, 4) if spend > 0 else None,
            "currency": currency,
        }

    def top_losses(self, workspace_id: str, period_days: int, limit: int) -> list[dict]:
        start, end = self._window(period_days)
        rows = self._get("profit_daily_facts", [
            ("workspace_id", f"eq.{workspace_id}"),
            ("entity_type", "in.(product,campaign)"),
            ("date", f"gte.{start}"), ("date", f"lte.{end}"),
            ("select", "entity_type,entity_id,spend,net_profit"),
        ])
        agg: dict[tuple, dict] = {}
        for r in rows:
            key = (r["entity_type"], r["entity_id"])
            a = agg.setdefault(key, {"entity_type": r["entity_type"], "entity_id": r["entity_id"],
                                     "spend": 0.0, "net_profit": 0.0})
            a["spend"] += float(r.get("spend") or 0)
            a["net_profit"] += float(r.get("net_profit") or 0)
        losers = sorted((a for a in agg.values() if a["net_profit"] < 0),
                        key=lambda a: a["net_profit"])
        return [{**a, "spend": round(a["spend"], 2), "net_profit": round(a["net_profit"], 2)}
                for a in losers[:limit]]

    def open_recommendations(self, workspace_id: str, limit: int) -> list[dict]:
        return self._get("recommendations", {
            "workspace_id": f"eq.{workspace_id}", "status": "eq.open",
            "order": "expected_impact.desc.nullslast", "limit": str(limit),
            "select": "kind,entity_type,entity_id,title,severity,expected_impact,"
                      "impact_currency,confidence",
        })
