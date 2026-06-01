#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${ACE_APP_DIR:-/opt/ace-coding/current}"
LOG_DIR="${ACE_LOG_DIR:-/home/Ubuntu/ace-coding-logs}"
BACKEND_ENV_FILE="${ACE_BACKEND_ENV_FILE:-/etc/ace-coding/backend.env}"
mkdir -p "$LOG_DIR"

cd "$APP_DIR"

stop_port() {
  port="$1"
  pid="$(ss -ltnp 2>/dev/null | grep ":$port " | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)"
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
}

wait_http() {
  url="$1"
  i=0
  while [ "$i" -lt 30 ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  return 1
}

stop_port 3100
stop_port 8080

if command -v systemctl >/dev/null 2>&1 && systemctl list-units >/dev/null 2>&1; then
  sudo cp infra/deploy/phone/systemd/ace-coding-backend.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable ace-coding-backend
  sudo systemctl restart ace-coding-backend
else
  pkill -f "$APP_DIR/apps/backend/dist/server.js" 2>/dev/null || true
  cd "$APP_DIR/apps/backend"
  if [ -f "$BACKEND_ENV_FILE" ]; then
    set -a
    . "$BACKEND_ENV_FILE"
    set +a
  fi
  nohup env PORT="${PORT:-3100}" npm start >"$LOG_DIR/backend.log" 2>&1 &
fi

pkill -f "$APP_DIR/apps/frontend/node_modules/vite/bin/vite.js" 2>/dev/null || true
cd "$APP_DIR/apps/frontend"
nohup env VITE_API_PROXY_TARGET=http://127.0.0.1:3100 npm run preview -- --host 0.0.0.0 --port 8080 >"$LOG_DIR/frontend.log" 2>&1 &

wait_http "http://127.0.0.1:3100/api/health"
wait_http "http://127.0.0.1:8080/"

if [ "${ACE_START_RUNNER:-1}" = "1" ]; then
  "$APP_DIR/infra/deploy/phone/start-runner.sh"
fi
