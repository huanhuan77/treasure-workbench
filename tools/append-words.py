#!/usr/bin/env python3
"""把当天新词追加到 gh-pages 分支的 words-db.json。
用法: python append-words.py new_words.json
"""
import sys, json, base64, urllib.request, urllib.error, pathlib

REPO = "huanhuan77/treasure-workbench"
BRANCH = "gh-pages"
PATH = "words-db.json"
TOKEN_FILE = pathlib.Path(__file__).resolve().parent.parent / ".deploy_token"

def main():
    if len(sys.argv) < 2:
        print("usage: append-words.py new_words.json"); sys.exit(1)
    new_words = json.load(open(sys.argv[1], encoding="utf-8"))
    if not isinstance(new_words, list) or not new_words:
        print("new_words must be a non-empty array"); sys.exit(1)
    token = open(TOKEN_FILE).read().strip()
    base = f"https://api.github.com/repos/{REPO}/contents/{PATH}"
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json", "User-Agent": "word-db-updater"}

    req = urllib.request.Request(f"{base}?ref={BRANCH}", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            cur = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"GET failed: {e.code} {e.read().decode()}"); sys.exit(1)

    sha = cur["sha"]
    existing = json.loads(base64.b64decode(cur["content"]).decode("utf-8"))
    print(f"current db: {len(existing)} words")

    seen = {w["w"].lower() for w in existing}
    added = []
    for w in new_words:
        if w["w"].lower() not in seen:
            existing.append(w); seen.add(w["w"].lower()); added.append(w["w"])
    print(f"added: {added}")

    new_content = json.dumps(existing, ensure_ascii=False, indent=2).encode("utf-8")
    body = {"message": f"add {len(added)} words: {', '.join(added[:5])}", "content": base64.b64encode(new_content).decode(), "sha": sha, "branch": BRANCH}
    req = urllib.request.Request(base, data=json.dumps(body).encode(), headers={**headers, "Content-Type": "application/json"}, method="PUT")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"OK: {r.status}, total {len(existing)} words")
    except urllib.error.HTTPError as e:
        print(f"PUT failed: {e.code} {e.read().decode()}"); sys.exit(1)

if __name__ == "__main__":
    main()