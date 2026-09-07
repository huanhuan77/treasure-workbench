#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""通过 GitHub Git Data API 把本地某个提交推送到 main（沙箱 git 协议被 502 拦截时的兜底）。
走 api.github.com (HTTPS)，绕开 github.com 的 git 智能 HTTP 端点。
用法：GITHUB_TOKEN=xxx python push_main_api.py
可选：PUSH_COMMIT=abc1234 指定提交（默认 HEAD，即当前分支最新提交）。
说明：推送的是「该提交相对其父提交改动的文件」，fast-forward 合入远程 main。
跨设备：脚本自身位于仓库 deploy/ 目录，仓库根目录用相对路径（脚本上级目录）定位，无需改路径。
"""
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

REPO = "huanhuan77/treasure-workbench"
API = "https://api.github.com"
# 仓库根目录 = 脚本上级目录
REPO_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LOCAL_COMMIT = os.environ.get("PUSH_COMMIT") or "HEAD"

TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    sys.exit("✗ 缺少 GITHUB_TOKEN")


def api(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "treasure-push")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            msg = json.loads(raw).get("message", raw)
        except Exception:
            msg = raw
        return e.code, {"message": msg}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=REPO_DIR).decode("utf-8")


def main():
    # 1) 当前 main 的 SHA（作为父提交，保证 fast-forward）
    st, ref = api("GET", f"/repos/{REPO}/git/refs/heads/main")
    if st != 200:
        sys.exit(f"✗ 读取 main 引用失败：{st} {ref.get('message')}")
    base_sha = ref["object"]["sha"]
    print(f"当前远程 main = {base_sha}")

    # 解析实际提交（HEAD 等符号）
    commit = subprocess.check_output(["git", "rev-parse", LOCAL_COMMIT], cwd=REPO_DIR).decode().strip()
    print(f"本地提交 {LOCAL_COMMIT} -> {commit}")

    # 2) 该提交相对其父提交改动的文件
    changed = [f for f in git("diff", "--name-only", f"{commit}^", commit).split() if f]
    if not changed:
        sys.exit("✗ 未检测到改动文件（该提交无 diff）")
    print(f"改动文件({len(changed)})：{changed}")

    # 3) 为每个改动文件创建 blob（用 LF 内容，避免 CRLF 差异）
    blobs = {}
    for f in changed:
        content = git("show", f"{commit}:{f}").encode("utf-8")  # git show 输出 LF
        b64 = base64.b64encode(content).decode("ascii")
        if len(b64) > 100 * 1024 * 1024:
            sys.exit(f"✗ 文件过大：{f}")
        st, resp = api("POST", f"/repos/{REPO}/git/blobs", {"content": b64, "encoding": "base64"})
        if st != 201:
            sys.exit(f"✗ 创建 blob 失败 {f}：{st} {resp.get('message')}")
        blobs[f] = resp["sha"]
        print(f"  blob ✓ {f} -> {resp['sha'][:8]}")

    # 4) 父提交对应的 tree
    st, base_commit = api("GET", f"/repos/{REPO}/git/commits/{base_sha}")
    if st != 200:
        sys.exit(f"✗ 读取 base commit 失败：{st} {base_commit.get('message')}")
    base_tree = base_commit["tree"]["sha"]

    # 5) 新 tree（base_tree 合并改动）
    entries = [{"path": f, "mode": "100644", "type": "blob", "sha": blobs[f]} for f in changed]
    st, tree = api("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": entries})
    if st != 201:
        sys.exit(f"✗ 创建 tree 失败：{st} {tree.get('message')}")
    new_tree = tree["sha"]
    print(f"新 tree = {new_tree}")

    # 6) 新 commit（父 = base_sha，保证 fast-forward）
    msg = git("log", "-1", "--format=%s", commit).strip() or "chore: deploy via api"
    st, commit_resp = api("POST", f"/repos/{REPO}/git/commits", {"message": msg, "tree": new_tree, "parents": [base_sha]})
    if st != 201:
        sys.exit(f"✗ 创建 commit 失败：{st} {commit_resp.get('message')}")
    new_commit = commit_resp["sha"]
    print(f"新 commit = {new_commit}")

    # 7) 更新 main 引用（fast-forward，非 force）
    st, upd = api("PATCH", f"/repos/{REPO}/git/refs/heads/main", {"sha": new_commit})
    if st != 200:
        sys.exit(f"✗ 更新 main 引用失败：{st} {upd.get('message')}")
    print(f"\n✓ 已推送：main {base_sha[:8]} -> {new_commit[:8]}")
    print(f"  源码地址：https://github.com/{REPO}/commit/{new_commit}")


if __name__ == "__main__":
    main()
