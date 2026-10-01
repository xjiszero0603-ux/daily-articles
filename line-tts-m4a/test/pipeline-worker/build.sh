#!/bin/sh
# 把編碼器與測試管線串成單一 worker.js（模擬「直接貼上」的部署方式）
cd "$(dirname "$0")" && cat ../../pcm-to-m4a.js harness.js > worker.js
