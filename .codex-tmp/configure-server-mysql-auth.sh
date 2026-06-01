#!/usr/bin/env bash
set -eu

DB_NAME="ace_coding"
DB_USER="ace_coding"
DB_PASSWORD="AceCodingMysql-2026-339d6688"
RUNNER_TOKEN="AceRunnerToken-2026-339d6688"

mysql <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

mkdir -p /etc/ace-coding
cat >/etc/ace-coding/backend.env <<EOF
NODE_ENV=production
PORT=3100
FRONTEND_ORIGIN=*
JUDGE_PROVIDER=remote-runner
RUNNER_SHARED_TOKEN=${RUNNER_TOKEN}
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=${DB_NAME}
MYSQL_USER=${DB_USER}
MYSQL_PASSWORD=${DB_PASSWORD}
EOF

cat >/etc/ace-coding/runner.env <<EOF
BACKEND_URL=http://127.0.0.1:3100
RUNNER_SHARED_TOKEN=${RUNNER_TOKEN}
RUNNER_POLL_MS=1200
RUNNER_TIMEOUT_MS=6000
EOF

chmod 600 /etc/ace-coding/backend.env /etc/ace-coding/runner.env
echo "configured ace_coding mysql auth"
