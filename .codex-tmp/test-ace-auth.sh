#!/usr/bin/env bash
set -eu

echo "me_without_token:"
curl -s -o /tmp/ace-me.out -w "%{http_code}\n" http://127.0.0.1:3100/api/auth/me
cat /tmp/ace-me.out
echo

echo "admin_login:"
curl -s -X POST http://127.0.0.1:3100/api/auth/login \
  -H 'content-type: application/json' \
  --data '{"username":"admin@ace.local","password":"AceAdmin-2026!"}'
echo
