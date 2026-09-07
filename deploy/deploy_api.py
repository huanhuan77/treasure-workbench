#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""通过 GitHub Contents API 把本地 dist/ 部署到 gh-pages 分支（git 协议被沙箱拦截时的兜底方案）。
用法：GITHUB_TOKEN=xxx python deploy_api.py
铁律：1) Windows 路径用 C:/...；2) 删除前校验本地非空；3) 单文件 <=1MB(base64)。
跨设备：脚本自身位于仓库 deploy/ 目录，dist/ 用相对路径（脚本上级目录）定位，无需改路径。
"""
import base64
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request

REPO = "huanhuan77/treasure-workbench"
BRANCH = "gh-pages"
# 脚本在 <repo>/deploy/ 下，dist 在 <repo>/dist
LOCAL = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist"))

TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    sys.exit("✗ 缺少 GITHUB_TOKEN 环境变量")

API = "https://api.github.com"


def api(method, path, body=None, accept="application/vnd.github+json"):
    url = f"{API}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", accept)
    req.add_header("User-Agent", "treasure-deploy")
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


def blob_sha(content: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(content)).encode() + b"\0" + content)
    return h.hexdigest()


def local_files():
    """返回 {相对路径(用/): bytes}"""
    out = {}
    for root, _dirs, files in os.walk(LOCAL):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, LOCAL).replace(os.sep, "/")
            with open(full, "rb") as fh:
                out[rel] = fh.read()
    return out


def main():
    # 安全护栏：本地必须非空
    local = local_files()
    if not local:
        sys.exit("✗ 本地 dist 为空，拒绝部署（避免误删线上全部文件）")
    print(f"本地文件数：{len(local)}（dist = {LOCAL}）")

    # 拉取线上 gh-pages 文件树（path -> blob sha）
    st, tree = api("GET", f"/repos/{REPO}/git/trees/{BRANCH}?recursive=1")
    if st != 200:
        sys.exit(f"✗ 拉取 gh-pages 树失败：{st} {tree.get('message')}")
    remote = {t["path"]: t["sha"] for t in tree.get("tree", []) if t.get("type") == "blob"}
    print(f"线上文件数：{len(remote)}")

    # 1) 上传/更新
    for rel, content in local.items():
        b64 = base64.b64encode(content).decode("ascii")
        if len(b64) > 1_000_000:
            sys.exit(f"✗ 文件过大无法经 Contents API 上传：{rel} ({len(b64)} bytes base64)")
        sha = blob_sha(content)
        body = {
            "message": f"deploy: update {rel}",
            "content": b64,
            "branch": BRANCH,
        }
        action = "新增"
        if rel in remote:
            if remote[rel] == sha:
                print(f"  跳过(无变化)：{rel}")
                continue
            body["sha"] = remote[rel]
            action = "更新"
        st, resp = api("PUT", f"/repos/{REPO}/contents/{rel}", body)
        if st in (200, 201):
            print(f"  {action}成功：{rel}")
        else:
            sys.exit(f"✗ 上传失败 {rel}：{st} {resp.get('message')}")

    # 2) 删除孤儿（线上有、本地没有）—— .nojekyll 已在本地集合中，不会被删
    orphans = [p for p in remote if p not in local]
    if orphans:
        print(f"删除 {len(orphans)} 个孤儿文件：{orphans}")
        for p in orphans:
            st, resp = api(
                "DELETE",
                f"/repos/{REPO}/contents/{p}",
                {"message": f"deploy: remove {p}", "sha": remote[p], "branch": BRANCH},
            )
            if st in (200, 204):
                print(f"  删除成功：{p}")
            else:
                print(f"  ⚠ 删除失败 {p}：{st} {resp.get('message')}")
    else:
        print("无孤儿文件需删除")

    print("\n✓ 部署完成（gh-pages 已更新）")
    print(f"  访问地址：https://{REPO.split('/')[0]}.github.io/{REPO.split('/')[1]}/")


if __name__ == "__main__":
    main()
