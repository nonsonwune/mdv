from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class UpdateQtyIn(BaseModel):
    qty: int

@router.put("/api/cart/{cart_id}/items/{item_id}")
async def update_cart_item(cart_id: int, item_id: int, payload: UpdateQtyIn):
    if payload.qty < 0:
        raise HTTPException(status_code=400, detail="qty must be >= 0")
    # TODO: update in DB, recompute cart
    return {"id": cart_id, "items": [{"id": item_id, "variant_id": 0, "qty": payload.qty}]}

@router.delete("/api/cart/{cart_id}/items/{item_id}")
async def remove_cart_item(cart_id: int, item_id: int):
    # TODO: remove from DB and return updated cart
    return {"id": cart_id, "items": []}

@router.post("/api/cart/{cart_id}/clear")
async def clear_cart(cart_id: int):
    # TODO: clear all items for cart
    return {"id": cart_id, "items": []}

