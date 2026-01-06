#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "Starting dev server..."
pnpm dev &
DEV_PID=$!

cleanup() {
  echo "Stopping dev server (PID: $DEV_PID)..."
  kill $DEV_PID 2>/dev/null || true
  wait $DEV_PID 2>/dev/null || true
}

trap cleanup EXIT

echo "Waiting for server to be ready..."
MAX_ATTEMPTS=60
ATTEMPT=0

while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo "Server failed to start after $MAX_ATTEMPTS seconds"
    exit 1
  fi
  echo "Waiting for server... ($ATTEMPT/$MAX_ATTEMPTS)"
  sleep 1
done

echo "Server is ready!"

echo "Running Playwright tests..."
pnpm test:e2e
TEST_EXIT_CODE=$?

exit $TEST_EXIT_CODE
