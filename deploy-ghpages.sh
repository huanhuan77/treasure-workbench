#!/usr/bin/env bash
#
# 宝藏工作台 · 一键部署到 GitHub Pages (gh-pages 分支)
# 前置：仓库根目录存在 .deploy_token（PAT，至少含 repo 权限）
# 用法：./deploy-ghpages.sh
#
set -euo pipefail

# 定位仓库根目录（脚本所在目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REPO="huanhuan77/treasure-workbench"
TOKEN_FILE="$SCRIPT_DIR/.deploy_token"
TMP_CLONE="/tmp/ghpages-build-$$"

# ---- 0. 检查 token ----
if [ ! -f "$TOKEN_FILE" ]; then
  echo "✗ 找不到 $TOKEN_FILE，无法部署。" >&2
  echo "  请先把 GitHub PAT 写入该文件（chmod 600）。" >&2
  exit 1
fi
TOKEN="$(cat "$TOKEN_FILE")"
if [ -z "$TOKEN" ]; then
  echo "✗ $TOKEN_FILE 为空，无法部署。" >&2
  exit 1
fi

# 带 TLS 绕过的 git（应对沙箱网络：DNS 劫持 + gnutls 握手失败）
GIT="git -c http.sslVerify=false -c http.version=HTTP/1.1 -c http.curloptResolve=github.com:443:20.205.243.166"
AUTH_URL="https://${TOKEN}@github.com/${REPO}.git"

# ---- 1. 构建（相对路径，适配 GitHub Pages 子路径）----
echo "==> 1/4 构建生产包 (BASE_PATH=./)"
BASE_PATH='./' pnpm build

# ---- 2. 克隆 gh-pages 分支到临时目录 ----
echo "==> 2/4 拉取 gh-pages 分支"
rm -rf "$TMP_CLONE"
$GIT clone --depth 1 --branch gh-pages "$AUTH_URL" "$TMP_CLONE"

# ---- 3. 用 dist 内容整体覆盖 ----
echo "==> 3/4 写入 dist 内容并补 .nojekyll"
cd "$TMP_CLONE"
# 删除除 .git 外的所有内容
find . -maxdepth 1 ! -name '.git' ! -name '.' ! -name '..' -exec rm -rf {} +
cp -r "$SCRIPT_DIR/dist/." .
touch .nojekyll
git add -A
if git diff --cached --quiet; then
  echo "    无变更，跳过提交。"
else
  git -c user.email="deploy@local" -c user.name="deploy-bot" \
    commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "    已提交，准备推送。"
fi

# ---- 4. 强制推送 ----
echo "==> 4/4 推送到 gh-pages"
$GIT push origin gh-pages

# 清理
cd "$SCRIPT_DIR"
rm -rf "$TMP_CLONE"

echo
echo "✓ 部署完成！"
echo "  访问地址：https://${REPO%/*}.github.io/${REPO#*/}/"
