#!/usr/bin/env bash
set -euo pipefail

# Go to repo root (relative to this script)
ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

# Bring up DB services, install deps, run migrations, seed, and start API and worker
make db-up
make deps
make migrate
make seed

# Print helpful next steps
cat <<'TXT'
Stack prepared.

Next steps:
1) Terminal A: make api
2) Terminal B: make worker
3) Terminal C (optional): make web

Quick E2E smoke:
- In Terminal A/B running, then run:
    cd scripts/dev
    ./paystack_webhook.sh success REF=MDV-1-$(date +%s)
- Visit http://localhost:8000/docs and http://localhost:3000
TXT

