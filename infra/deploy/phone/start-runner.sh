#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${ACE_APP_DIR:-/opt/ace-coding/current}"
LOG_DIR="${ACE_LOG_DIR:-/home/Ubuntu/ace-coding-logs}"
mkdir -p "$LOG_DIR"

cd "$APP_DIR"

if command -v systemctl >/dev/null 2>&1 && systemctl is-system-running >/dev/null 2>&1; then
  sudo cp infra/deploy/phone/systemd/ace-coding-runner.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable ace-coding-runner
  sudo systemctl restart ace-coding-runner
else
  pkill -f "$APP_DIR/apps/runner/dist/index.js" 2>/dev/null || true
  pkill -f "$APP_DIR/apps/runner.*npm start" 2>/dev/null || true
  cd "$APP_DIR/apps/runner"
  if [ -f /etc/ace-coding/runner.env ]; then
    set -a
    . /etc/ace-coding/runner.env
    set +a
  elif [ -f /etc/ace-coding/backend.env ]; then
    set -a
    . /etc/ace-coding/backend.env
    set +a
  fi
  nohup env \
    BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3100}" \
    RUNNER_SHARED_TOKEN="${RUNNER_SHARED_TOKEN:-}" \
    RUNNER_POLL_MS="${RUNNER_POLL_MS:-1200}" \
    RUNNER_TIMEOUT_MS="${RUNNER_TIMEOUT_MS:-15000}" \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    npm start >"$LOG_DIR/runner.log" 2>&1 &
fi
