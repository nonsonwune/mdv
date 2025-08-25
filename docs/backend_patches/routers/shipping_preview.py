from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/api/shipping/calculate")
async def shipping_calculate(state: str, subtotal: float | None = None, coupon_code: str | None = None):
    # TODO: replace with your real zone/threshold/coupon logic
    base = 2500.0 if state.lower() == 'lagos' else 3500.0
    free = False
    reason = f"Base fee for {state}"
    if subtotal and subtotal >= 50000:
        base = 0.0
        free = True
        reason = "Free shipping threshold reached"
    return {"shipping_fee": base, "free_shipping_eligible": free, "reason": reason}

