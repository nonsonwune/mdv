from __future__ import annotations

from typing import Optional

import httpx

from .config import settings


async def send_email(to_email: str, subject: str, html: str, from_email: Optional[str] = None) -> None:
    if not settings.resend_api_key:
        return  # no-op in dev if key not set
    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }
    default_from = settings.resend_from or "MDV <no-reply@mdv.local>"
    payload = {
        "from": from_email or default_from,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post("https://api.resend.com/emails", headers=headers, json=payload)

