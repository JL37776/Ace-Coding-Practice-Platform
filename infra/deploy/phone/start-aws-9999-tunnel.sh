#!/usr/bin/env bash
set -euo pipefail

AWS_HOST="${AWS_TUNNEL_HOST:-13.217.45.222}"
AWS_USER="${AWS_TUNNEL_USER:-ubuntu}"
AWS_KEY="${AWS_TUNNEL_KEY:-/home/Ubuntu/k/ubuntu_20_05_08.pem}"
REMOTE_PORT="${AWS_PUBLIC_APP_PORT:-9999}"
LOCAL_PORT="${ACE_LOCAL_HTTP_PORT:-8080}"
LOG_FILE="/tmp/aws-${REMOTE_PORT}-ace-coding-tunnel.log"
PID_FILE="/tmp/aws-${REMOTE_PORT}-ace-coding-tunnel.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  exit 0
fi

pkill -f "0.0.0.0:${REMOTE_PORT}:localhost:${LOCAL_PORT}" 2>/dev/null || true

nohup ssh \
  -i "$AWS_KEY" \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=accept-new \
  -N -R "0.0.0.0:${REMOTE_PORT}:localhost:${LOCAL_PORT}" \
  "${AWS_USER}@${AWS_HOST}" \
  >"$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
