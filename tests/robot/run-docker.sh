#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

: "${BASE_URL:=http://host.docker.internal:3000}"
: "${DATABASE_URL:=postgres://together:together@localhost:5433/together_dev}"
: "${NEXTAUTH_SECRET:=devtestsecret}"

echo "[robot-docker] Bringing up Postgres..."
docker compose up -d postgres

echo "[robot-docker] Applying migrations..."
export DATABASE_URL
export NEXTAUTH_SECRET
npm run prisma:deploy --silent

echo "[robot-docker] Seeding..."
npm run seed:taxonomy --silent || true
npm run seed:emails --silent || true
npm run seed:tickets --silent || true
npm run seed:demo --silent || true
npm run seed:users --silent || true

echo "[robot-docker] Building app (ignoring ESLint for E2E)..."
E2E_TESTS=true npm run build --silent

echo "[robot-docker] Checking if app is already running at ${BASE_URL}..."
if curl -fsS "${BASE_URL}" >/dev/null 2>&1; then
  echo "[robot-docker] Detected running app. Skipping start."
  STARTED_APP=false
else
  echo "[robot-docker] Starting app on :3000..."
  PORT=3000 npm run start --silent -- -p 3000 &
  APP_PID=$!
  STARTED_APP=true
  trap 'if [ "${STARTED_APP}" = true ]; then echo "[robot-docker] Stopping app (PID ${APP_PID})"; kill ${APP_PID} || true; fi' EXIT

  echo "[robot-docker] Waiting for app at ${BASE_URL}..."
  for i in {1..60}; do
    if curl -fsS "${BASE_URL}" >/dev/null 2>&1; then
      echo "[robot-docker] App is up."
      break
    fi
    sleep 1
    if [ "$i" -eq 60 ]; then
      echo "[robot-docker] App did not become ready in time" >&2
      exit 1
    fi
  done
fi

echo "[robot-docker] Running Robot (Dockerized) against ${BASE_URL}..."
BASE_URL="${BASE_URL}" bash tests/robot/docker-run.sh

echo "[robot-docker] Done. Reports under tests/robot/output"

