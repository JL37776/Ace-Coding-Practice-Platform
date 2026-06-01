#!/usr/bin/env bash
set -eu

APP_DIR="/opt/ace-coding/current"
LOG_DIR="/home/Ubuntu/ace-coding-logs"
mkdir -p "$LOG_DIR"

pkill -f "$APP_DIR/apps/backend/dist/server.js" 2>/dev/null || true
cd "$APP_DIR/apps/backend"
set -a
. /etc/ace-coding/backend.env
set +a
nohup env PORT="${PORT:-3100}" npm start >"$LOG_DIR/backend.log" 2>&1 &
sleep 5
curl -fsS http://127.0.0.1:3100/api/health
