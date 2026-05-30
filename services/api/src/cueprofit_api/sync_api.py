"""Internal endpoints to enqueue background worker jobs."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from cueprofit_api.connect_api import require_internal
from cueprofit_api.worker_trigger import enqueue_sync_all, enqueue_workspace_sync

router = APIRouter(prefix="/internal", dependencies=[Depends(require_internal)])


class SyncWorkspaceReq(BaseModel):
    mode: str = "initial"


class SyncAllReq(BaseModel):
    mode: str = "daily"


@router.post("/workspaces/{workspace_id}/sync")
def sync_workspace(workspace_id: uuid.UUID, req: SyncWorkspaceReq) -> dict:
    if req.mode not in ("initial", "daily"):
        raise HTTPException(status_code=400, detail="mode must be initial or daily")
    return enqueue_workspace_sync(str(workspace_id), mode=req.mode)


@router.post("/sync/all")
def sync_all(req: SyncAllReq) -> dict:
    """Enqueue a daily refresh for every workspace with Google Ads connected."""
    if req.mode not in ("initial", "daily"):
        raise HTTPException(status_code=400, detail="mode must be initial or daily")
    return enqueue_sync_all(mode=req.mode)
