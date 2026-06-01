#!/usr/bin/env bash
set -eu

chown Ubuntu:Ubuntu /etc/ace-coding/backend.env /etc/ace-coding/runner.env
chmod 600 /etc/ace-coding/backend.env /etc/ace-coding/runner.env
echo "ace env permissions fixed"
