#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

# When running inside Docker, localhost refers to the container.
# Use host.docker.internal to reach the host's web server on macOS/Windows.
: "${BASE_URL:=http://host.docker.internal:3000}"

echo "[robot-docker] Building Robot runner image..."
docker build -f tests/robot/Dockerfile -t robot-runner:local .

OUT_DIR="$(pwd)/tests/robot/output"
mkdir -p "$OUT_DIR"

echo "[robot-docker] Running Robot tests against ${BASE_URL}..."
docker run --rm \
  -e BASE_URL="${BASE_URL}" \
  -v "$(pwd)":/work \
  -w /work \
  robot-runner:local \
  -d tests/robot/output \
  --xunit tests/robot/output/xunit.xml \
  tests/robot/suites

echo "[robot-docker] Reports: tests/robot/output/report.html"

