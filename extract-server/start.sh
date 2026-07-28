#!/usr/bin/env bash
# Render 启动脚本

set -e

echo "=== 安装 Chromium（可选，跳过不影响核心功能） ==="
pip install playwright 2>/dev/null && python -m playwright install chromium 2>/dev/null || echo "[SKIP] Chromium 安装跳过，抖音模式自动走 API 降级"

echo "=== 启动 API 服务 ==="
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-10000}"
