#!/usr/bin/env bash
set -eu

if [ -s /etc/ace-coding/backend.env ]; then
  echo "backend_env_exists"
else
  echo "backend_env_missing"
fi

grep '^MYSQL_USER=' /etc/ace-coding/backend.env || true
grep '^MYSQL_DATABASE=' /etc/ace-coding/backend.env || true
grep '^JUDGE_PROVIDER=' /etc/ace-coding/backend.env || true
if grep -q '^MYSQL_PASSWORD=.' /etc/ace-coding/backend.env; then
  echo "MYSQL_PASSWORD=set"
else
  echo "MYSQL_PASSWORD=missing"
fi

systemctl daemon-reload
systemctl restart ace-coding-backend
sleep 3
systemctl status ace-coding-backend --no-pager -l | tail -40
curl -fsS http://127.0.0.1:3100/api/health
