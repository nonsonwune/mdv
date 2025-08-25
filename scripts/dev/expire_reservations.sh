#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

# Choose python (prefer venv, fallback to system)
PY="$ROOT_DIR/.venv/bin/python"
if [ ! -x "$PY" ]; then
  PY="python3"
fi

# Expire active reservations whose expiry is in the past
$PY - <<'PY'
import asyncio
from backend.mdv.worker.worker import expire_reservations
async def main():
    await expire_reservations(None)
asyncio.run(main())
PY

