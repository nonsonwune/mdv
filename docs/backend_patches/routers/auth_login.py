from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginIn(BaseModel):
    email: str
    password: str

class LoginOut(BaseModel):
    access_token: str
    role: str

@router.post("/api/auth/login", response_model=LoginOut)
async def login(payload: LoginIn):
    # TODO: replace with real auth service / DB lookup
    if payload.email.endswith("@mdv.local"):
        return {"access_token": "dev-token", "role": "staff"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

