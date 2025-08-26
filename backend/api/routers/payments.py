from __future__ import annotations

import json

from fastapi import APIRouter, Header, Request, HTTPException, Query
import httpx

from mdv.paystack import verify_signature, handle_paystack_event
from mdv.config import settings

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
    # Enhanced logging for webhook debugging
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    print(f"[WEBHOOK] Incoming request from IP: {client_ip}, User-Agent: {user_agent}")
    print(f"[WEBHOOK] Headers: {dict(request.headers)}")

    raw = await request.body()
    print(f"[WEBHOOK] Raw body length: {len(raw)} bytes")
    print(f"[WEBHOOK] Signature header present: {x_paystack_signature is not None}")

    try:
        verify_signature(raw, x_paystack_signature)
        print(f"[WEBHOOK] Signature verification: SUCCESS")
    except Exception as e:
        print(f"[WEBHOOK] Signature verification: FAILED - {e}")
        raise

    try:
        event = json.loads(raw.decode("utf-8"))
        print(f"[WEBHOOK] JSON parsing: SUCCESS")
        print(f"[WEBHOOK] Event type: {event.get('event', 'unknown')}")
    except Exception as e:
        print(f"[WEBHOOK] JSON parsing: FAILED - {e}")
        raise

    await handle_paystack_event(event)
    print(f"[WEBHOOK] Event processing: COMPLETED")
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

