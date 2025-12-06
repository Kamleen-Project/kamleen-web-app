#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

: "${BASE_URL:=http://localhost:3000}"
: "${PRISMA_DATABASE_URL:=postgres://together:together@localhost:5433/together_dev}"
: "${NEXTAUTH_SECRET:=devtestsecret}"

echo "[robot-run] Using BASE_URL=${BASE_URL}"
echo "[robot-run] Using PRISMA_DATABASE_URL=${PRISMA_DATABASE_URL}"

export PRISMA_DATABASE_URL
export NEXTAUTH_SECRET

echo "[robot-run] Prisma deploy..."
npm run prisma:deploy --silent

echo "[robot-run] Seeding baseline data..."
npm run seed:taxonomy --silent || true
npm run seed:emails --silent || true
npm run seed:tickets --silent || true
npm run seed:demo --silent || true
npm run seed:users --silent || true

echo "[robot-run] Building app..."
npm run build --silent

echo "[robot-run] Starting app..."
PORT=3000 npm run start --silent -- -p 3000 &
APP_PID=$!
trap 'echo "[robot-run] Stopping app (PID ${APP_PID})"; kill ${APP_PID} || true' EXIT

echo "[robot-run] Waiting for app to be ready at ${BASE_URL}..."
for i in {1..60}; do
  if curl -fsS "${BASE_URL}" >/dev/null 2>&1; then
    echo "[robot-run] App is up."
    break
  fi
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo "[robot-run] App did not become ready in time" >&2
    exit 1
  fi
done

echo "[robot-run] Ensuring Robot dependencies..."
if ! command -v robot >/dev/null 2>&1; then
  python3 -m pip install -r tests/robot/requirements.txt
fi

echo "[robot-run] Initializing Browser library (Playwright)..."
python3 -m Browser.entry init || true

OUT_DIR="tests/robot/output"
mkdir -p "$OUT_DIR"

echo "[robot-run] Running Robot suites..."
robot \
  -d "$OUT_DIR" \
  --xunit "$OUT_DIR/xunit.xml" \
  tests/robot/suites

echo "[robot-run] Reports: ${OUT_DIR}/report.html, ${OUT_DIR}/log.html"

