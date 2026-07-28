#!/usr/bin/env bash
# 文案提取器 API 服务启动脚本
# 使用方式: bash run_server.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$HOME/.workbuddy/skills/douyin-transcribe-lz"
ENV_CONFIG="$SKILL_DIR/.env_config.json"

echo "=============================="
echo "  文案提取器 API 服务启动器"
echo "=============================="
echo ""

# 检查技能环境是否已配置
if [ ! -f "$ENV_CONFIG" ]; then
    echo "[WARN] 技能环境未配置!"
    echo "       请先运行: cd $SKILL_DIR && python scripts/setup_env.py"
    echo ""
    echo "       或使用系统 Python 继续（可能缺少依赖）..."
    echo ""
fi

# 尝试使用 venv 内的 pip 安装服务器依赖
if [ -f "$ENV_CONFIG" ]; then
    VENV_PY=$(python3 -c "import json; print(json.load(open('$ENV_CONFIG'))['venv_python'])" 2>/dev/null || echo "")
    if [ -n "$VENV_PY" ] && [ -f "$VENV_PY" ]; then
        echo "[INFO] 使用 venv Python: $VENV_PY"
        echo "[INFO] 安装服务器依赖..."
        "$VENV_PY" -m pip install -q fastapi uvicorn python-multipart 2>&1
        PYTHON_EXE="$VENV_PY"
    fi
fi

# 启动服务
cd "$SCRIPT_DIR"
echo "[INFO] 启动 API 服务..."
echo "  http://localhost:8877"
echo "  http://0.0.0.0:8877"
echo ""

if [ -n "$PYTHON_EXE" ]; then
    "$PYTHON_EXE" main.py
else
    python main.py
fi
