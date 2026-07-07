#!/usr/bin/env bash
set -euo pipefail

PB_URL="${VITE_POCKETBASE_URL:-http://127.0.0.1:8090}"

POCKETBASE_USERNAME="${SUPERUSER:-admin@test.com}"
POCKETBASE_PASSWORD="${PB_SUPERUSER_PASSWORD:-password123456}"
# POCKETBASE_USERNAME
PB_BIN="./apps/backend/pocketbase"

echo "Using PocketBase: $PB_URL"

echo "Waiting for PocketBase..."

until curl -sf "$PB_URL/api/health" > /dev/null; do
  echo "PocketBase not ready..."
  sleep 2
done

echo "PocketBase is ready"

echo "Creating/updating PocketBase superuser..."

"$PB_BIN" superuser upsert "$POCKETBASE_USERNAME" "$POCKETBASE_PASSWORD" || true

echo "Authenticating superuser..."

TOKEN=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{
    \"identity\": \"$POCKETBASE_USERNAME\",
    \"password\": \"$POCKETBASE_PASSWORD\"
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