#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${ACE_APP_DIR:-/opt/ace-coding/current}"
LOG_DIR="${ACE_LOG_DIR:-/home/Ubuntu/ace-coding-logs}"
mkdir -p "$LOG_DIR"

cd "$APP_DIR"

if command -v systemctl >/dev/null 2>&1 && systemctl list-units >/dev/null 2>&1; then
  sudo cp infra/deploy/phone/systemd/ace-coding-backend.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now ace-coding-backend
else
  pkill -f "$APP_DIR/apps/backend/dist/server.js" 2>/dev/null || true
  cd "$APP_DIR/apps/backend"
  nohup env PORT="${PORT:-3100}" npm start >"$LOG_DIR/backend.log" 2>&1 &
fi

if command -v nginx >/dev/null 2>&1; then
  sudo cp "$APP_DIR/infra/deploy/phone/nginx/ace-coding.conf" /etc/nginx/sites-available/ace-coding
  sudo ln -sf /etc/nginx/sites-available/ace-coding /etc/nginx/sites-enabled/ace-coding
  sudo nginx -t
  if command -v systemctl >/dev/null 2>&1 && systemctl list-units >/dev/null 2>&1; then
    sudo systemctl reload nginx
  else
    sudo service nginx reload || sudo service nginx start
  fi
else
  cd "$APP_DIR/apps/frontend"
  nohup npm run preview -- --host 0.0.0.0 --port 8080 >"$LOG_DIR/frontend.log" 2>&1 &
fi
