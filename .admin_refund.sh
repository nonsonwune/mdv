#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

# Load env safely (avoid nounset during source)
set +u
set -a
. ./.env
set +a
set -u

# Ensure required secrets exist (do not print values)
: "${JWT_SECRET:?JWT_SECRET missing from environment}"

# Choose python (prefer venv, fallback to system)
PY="$(pwd)/.venv/bin/python"
if [ ! -x "$PY" ]; then
  PY="python3"
fi

# 1) Ensure admin exists and capture id
ADMIN_ID=$($PY - <<'PY'
import asyncio
from sqlalchemy import select
from backend.mdv.db import session_scope
from backend.mdv.models import User, Role
async def main():
    async with session_scope() as db:
        res = await db.execute(select(User).where(User.email == 'admin@local'))
        u = res.scalar_one_or_none()
        if not u:
            u = User(name='Admin', email='admin@local', role=Role.admin, active=True)
            db.add(u)
            await db.flush()
        print(u.id)
asyncio.run(main())
PY
)

# 2) Generate short-lived admin JWT
export ADMIN_ID
TOKEN=$($PY - <<'PY'
from datetime import datetime, timedelta, timezone
import os
from jose import jwt
sub=os.environ['ADMIN_ID']
secret=os.environ['JWT_SECRET']
claims={'sub': sub, 'role':'admin', 'iat': datetime.now(timezone.utc), 'exp': datetime.now(timezone.utc)+timedelta(minutes=30)}
print(jwt.encode(claims, secret, algorithm='HS256'))
PY
)

# 3) Call refund endpoint; fail on non-2xx
curl -sS -f -X POST "http://127.0.0.1:8000/api/admin/orders/2/refund" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "method": "manual", "manual_ref": "BANKTXN123", "reason": "partial goodwill"}'

