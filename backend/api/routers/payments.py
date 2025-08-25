from __future__ import annotations

import json

from fastapi import APIRouter, Header, Request, HTTPException, Query
import httpx

from backend.mdv.paystack import verify_signature, handle_paystack_event
from backend.mdv.config import settings

router = APIRouter(prefix="/api/paystack", tags=["payments"]) 

# Local/CI mock endpoint to simulate Paystack events
@router.post("/mock")
async def paystack_mock(event: dict):
    # Expect shape: { event: "charge.success" | "charge.failed", data: { reference: str, ... } }
    if not isinstance(event, dict) or not event.get("event"):
        raise HTTPException(status_code=400, detail="Invalid event payload")
    await handle_paystack_event(event)
    return {"ok": True}


@router.post("/webhook")
async def paystack_webhook(request: Request, x_paystack_signature: str | None = Header(default=None)):
    raw = await request.body()
    verify_signature(raw, x_paystack_signature)
    event = json.loads(raw.decode("utf-8"))
    await handle_paystack_event(event)
    return {"ok": True}


@router.get("/verify")
async def paystack_verify(reference: str = Query(..., min_length=3)):
    if not settings.paystack_secret_key:
        raise HTTPException(status_code=400, detail="Paystack not configured")
    url = f"https://api.paystack.co/transaction/verify/{reference}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {settings.paystack_secret_key}"})
        data = resp.json()
        if resp.status_code >= 400 or not data.get("status"):
            raise HTTPException(status_code=502, detail=f"Verify failed: {data.get('message') or resp.text}")
        status_val = (data.get("data") or {}).get("status")
        if status_val == "success":
            # Idempotently mark order paid via existing logic
            await handle_paystack_event({"event": "charge.success", "data": {"reference": reference}})
            return {"ok": True, "verified": True}
        return {"ok": True, "verified": False, "data": data.get("data")}

