# treasure-workbench 部署脚本（API 兜底版）

> 背景：本沙箱环境里 `github.com` 的 **git 智能 HTTP 协议被拦截**（推送报 `CONNECT tunnel failed, response 502`），
> 只有 `api.github.com` 能通。因此用「GitHub REST API」替代 `git push` 完成部署。
> 能直连 GitHub 的机器上，直接 `git push origin main` 即可（仓库自带 Actions 会自动部署，见文末）。

---

## 一、两个脚本（位于本仓库 `deploy/` 目录）

两者都需要环境变量 `GITHUB_TOKEN`（**要有 `repo` 权限**的 PAT，不是 `gist` 作用域的 token）。
路径都用「脚本自身位置」推导，**跨设备无需改路径**。

| 脚本 | 作用 |
|---|---|
| `deploy_api.py` | 把构建产物 `dist/` 经 Contents API 同步到 `gh-pages` 分支 |
| `push_main_api.py` | 把本地某个提交经 Git Data API 推到 `main` 分支（替代 `git push`） |

### 1) deploy_api.py（部署线上站点）

通过 GitHub Contents API 把 `../dist/` 同步到 `gh-pages`，智能 diff：
只新增/更新变化的文件，删除线上有但本地没有的孤儿文件（`.nojekyll` 已在本地集合里，不会被删）。

**前置**：先构建出 `dist/`（见第三节）。

```bash
cd deploy
GITHUB_TOKEN=ghp_xxx python deploy_api.py
```

内置常量（通常无需改）：`REPO`、`BRANCH="gh-pages"`、`LOCAL` 自动指向仓库 `dist/`。
护栏：本地 `dist/` 为空会拒绝；单文件 base64 超过 1MB 会报错退出。

### 2) push_main_api.py（推送源码到 main）

通过 Git Data API 走 `blob → tree → commit → 更新 main 引用`，等同于 `git push`（fast-forward，非 force）。
默认推送当前分支最新提交（`HEAD`）；可用 `PUSH_COMMIT=abc1234` 指定某个提交。

```bash
cd deploy
GITHUB_TOKEN=ghp_xxx python push_main_api.py
# 或指定提交：PUSH_COMMIT=abc1234 GITHUB_TOKEN=ghp_xxx python push_main_api.py
```

只推送「该提交相对其父提交改动的文件」，不会把整个仓库重传；提交信息自动沿用本地提交的标题。

---

## 二、完整部署流程（本环境）

```bash
# 1. 进入仓库目录
cd treasure-workbench

# 2. 构建（相对路径，适配 GitHub Pages 子路径 /treasure-workbench/）
BASE_PATH='./' npm run build
touch dist/.nojekyll            # 防止 Pages 当作 Jekyll 站点

# 3. 部署线上站点（gh-pages）
cd deploy
GITHUB_TOKEN=ghp_xxx python deploy_api.py

# 4. 推送源码到 main（会触发 Actions 再次自动部署，三者最终一致）
GITHUB_TOKEN=ghp_xxx python push_main_api.py

# 5. 验证
curl -s -o /dev/null -w "%{http_code}\n" https://huanhuan77.github.io/treasure-workbench/
```

> 第 4 步推送 main 后，仓库自带 Actions（`deploy.yml`）会自动重新构建并部署 gh-pages，
> 浏览器访问站点即是最新版本，**无需手动重复第 3 步**；第 3 步是「不等 Actions」的即时兜底。

---

## 三、普通机器上的标准做法（能直连 GitHub）

不用上面两个脚本，直接：

```bash
cd treasure-workbench
git add -A && git commit -m "feat: ..."
git push origin main          # 触发 Actions 自动部署 gh-pages
```

---

## 四、安全提醒

- PAT 切勿明文贴在聊天里；用到时通过环境变量传入，不在脚本内写死。
- 仓库 `.gitignore` 已忽略 `dist/`、`.deploy_token`、`fix_merge.py`、`merge_jiebitudu.py`，
  部署脚本与文档不会被误判为构建产物。
- 建议定期到 GitHub → Settings → Developer settings → Personal access tokens 撤销不再使用的 token。
