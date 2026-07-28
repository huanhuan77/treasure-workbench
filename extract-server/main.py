#!/usr/bin/env python3
"""
文案提取器 API 服务 — Render 部署版

使用 openai-whisper 从抖音视频链接或本地文件提取语音文案。

用法：
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 10000

API 端点：
  GET  /health        健康检查
  POST /extract-link  抖音链接 → 文案
  POST /extract-file  文件上传 → 文案
"""

import os
import sys
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── 配置（Render 通过环境变量设置 PORT） ─────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8877))


# ── 模型 ──────────────────────────────────────────────────────────────────

class ExtractLinkRequest(BaseModel):
    url: str

class ExtractResponse(BaseModel):
    success: bool
    text: str
    source: str = ""
    source_type: str = ""


# ── 工具函数 ──────────────────────────────────────────────────────────────

def tail_logs(text: str, n: int = 10) -> str:
    lines = text.strip().split("\n")
    return "\n".join(lines[-n:])


async def run_script(script_path: Path, args: list, timeout: int = 300) -> tuple[int, str, str]:
    """
    运行技能脚本，返回 (returncode, stdout, stderr)
    """
    cmd = [sys.executable, str(script_path)] + args
    print(f"  >> 运行: {' '.join(str(a) for a in cmd)}")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(SCRIPT_DIR),
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        return -1, "", f"Timeout after {timeout}s"

    return (
        proc.returncode or 0,
        stdout.decode("utf-8", errors="replace"),
        stderr.decode("utf-8", errors="replace"),
    )


def find_output_md(output_dir: Path) -> str | None:
    """在输出目录中查找最新的 transcript_*.md"""
    if not output_dir.exists():
        return None
    md_files = sorted(
        output_dir.glob("transcript_*.md"),
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    if md_files:
        return md_files[0].read_text("utf-8", errors="replace")
    return None


# ── FastAPI 应用 ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"文案提取器 API 启动 | 端口: {PORT} | 输出: {OUTPUT_DIR}")
    yield
    print("服务关闭")


app = FastAPI(title="文案提取器 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── API 端点 ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """根路径返回 API 文档说明"""
    return {
        "name": "文案提取器 API",
        "version": "1.0.0",
        "endpoints": {
            "GET  /health": "健康检查",
            "POST /extract-link": "抖音视频链接 → 文案 (JSON: {url: '...'})",
            "POST /extract-file": "本地上传视频/音频 → 文案 (multipart/form-data: file=...)",
        },
        "frontend": "https://huanhuan77.github.io/treasure-workbench/#/extract",
    }


@app.get("/health")
async def health():
    # 检查 whisper 是否可用
    try:
        import whisper
        whisper_ok = True
    except ImportError:
        whisper_ok = False
    try:
        import torch
        torch_ver = torch.__version__
    except ImportError:
        torch_ver = None

    return {
        "status": "ok",
        "whisper_available": whisper_ok,
        "torch_version": torch_ver,
        "output_dir": str(OUTPUT_DIR),
    }


@app.post("/extract-link", response_model=ExtractResponse)
async def extract_link(req: ExtractLinkRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(400, "url 不能为空")

    print(f"\n[extract-link] {url}")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    req_output = OUTPUT_DIR / f"link_{ts}"
    req_output.mkdir(exist_ok=True)

    script = SCRIPT_DIR / "fetch_douyin_video.py"
    rc, out, err = await run_script(script, [url, "--output", str(req_output)], timeout=600)

    print(f"  returncode={rc}")
    if out:
        print(f"  stdout: {tail_logs(out)}")
    if err:
        print(f"  stderr: {tail_logs(err)}")

    if rc != 0:
        raise HTTPException(500, f"脚本执行失败:\n{tail_logs(err or out, 15)}")

    md = find_output_md(req_output)
    if md:
        return ExtractResponse(success=True, text=md.strip(), source=url, source_type="douyin")

    return ExtractResponse(
        success=True,
        text=out.strip() or "（执行完成，未输出文案）",
        source=url,
        source_type="douyin",
    )


@app.post("/extract-file", response_model=ExtractResponse)
async def extract_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "文件名为空")

    print(f"\n[extract-file] {file.filename}")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    req_output = OUTPUT_DIR / f"file_{ts}"
    req_output.mkdir(exist_ok=True)

    ext = Path(file.filename).suffix or ".mp4"
    saved_path = req_output / f"input{ext}"
    content = await file.read()
    saved_path.write_bytes(content)
    print(f"  saved: {saved_path} ({len(content)} bytes)")

    script = SCRIPT_DIR / "transcribe_local.py"
    rc, out, err = await run_script(script, [str(saved_path), "--output", str(req_output)], timeout=600)

    print(f"  returncode={rc}")
    if out:
        print(f"  stdout: {tail_logs(out)}")
    if err:
        print(f"  stderr: {tail_logs(err)}")

    if rc != 0:
        raise HTTPException(500, f"脚本执行失败:\n{tail_logs(err or out, 15)}")

    md = find_output_md(req_output)
    if md:
        return ExtractResponse(success=True, text=md.strip(), source=file.filename, source_type="local")

    return ExtractResponse(
        success=True,
        text=out.strip() or "（执行完成，未输出文案）",
        source=file.filename,
        source_type="local",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
