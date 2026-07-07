#!/usr/bin/env bash
set -euo pipefail

PB_URL="${VITE_POCKETBASE_URL:-http://127.0.0.1:8090}"

ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@test.com}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-password123456}"

PB_BIN="./apps/backend/pocketbase"

echo "Using PocketBase: $PB_URL"

echo "Waiting for PocketBase..."

until curl -sf "$PB_URL/api/health" > /dev/null; do
  echo "PocketBase not ready..."
  sleep 2
done

echo "PocketBase is ready"

echo "Creating/updating PocketBase superuser..."

"$PB_BIN" superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASSWORD" || true

echo "Authenticating superuser..."

TOKEN=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{
    \"identity\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }" | node -e "
    let d='';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      try {
        console.log(JSON.parse(d).token || '');
      } catch {
        console.log('');
      }
    });
  ")

if [ -z "$TOKEN" ]; then
  echo "Failed to authenticate superuser"
  exit 1
fi

echo "Superuser authenticated"

echo "Creating Cypress seed data..."

curl -sf -X POST "$PB_URL/api/collections/decoders/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{
    "decoderId": "test"
  }' || true

echo "Cypress seed completed"