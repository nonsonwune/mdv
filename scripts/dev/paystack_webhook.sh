#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

# Load env
set +u
set -a
. ./.env
set +a
set -u

: "${PAYSTACK_SECRET_KEY:?PAYSTACK_SECRET_KEY missing}"

KIND=${1:-success}
REF=${REF:-MDV-TEST-$(date +%s)}
AMOUNT_KOBO=${AMOUNT_KOBO:-1000}

# Construct minimal Paystack event payload
if [ "$KIND" = "success" ]; then
  EVENT="charge.success"
else
  EVENT="charge.failed"
fi

read -r -d '' BODY <<JSON
{
  "event": "$EVENT",
  "data": {
    "reference": "$REF",
    "amount": $AMOUNT_KOBO
  }
}
JSON

# Compute signature: HMAC-SHA512 of raw body using PAYSTACK_SECRET_KEY
SIG=$(python3 - <<PY
import os, hmac, hashlib, sys
secret=os.environ['PAYSTACK_SECRET_KEY'].encode()
body=sys.stdin.buffer.read()
print(hmac.new(secret, body, hashlib.sha512).hexdigest())
PY
<<<"$BODY")

curl -sS -X POST "http://127.0.0.1:8000/api/paystack/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: $SIG" \
  --data-raw "$BODY"

