#!/usr/bin/env python3
# Modified: skip Python 3.13 version check

import os, sys, shutil, subprocess, platform, json, re
from pathlib import Path

SKILL_DIR = Path(r"C:\Users\Administrator\.workbuddy\skills\douyin-transcribe-lz")
VENV_DIR = SKILL_DIR / "venv"
CONFIG_FILE = SKILL_DIR / ".env_config.json"

MIRRORS = {
    "aliyun": {"url": "https://mirrors.aliyun.com/pypi/simple/", "trusted": True},
    "pypi": {"url": "https://pypi.org/simple/", "trusted": False},
    "tsinghua": {"url": "https://pypi.tuna.tsinghua.edu.cn/simple/", "trusted": True},
}

def info(m): print(f"\033[36m[INFO]\033[0m {m}")
def success(m): print(f"\033[32m[OK]\033[0m   {m}")
def warn(m): print(f"\033[33m[WARN]\033[0m {m}")
def error(m): print(f"\033[31m[ERR]\033[0m  {m}")

def main():
    force = "--force" in sys.argv
    mirror = "aliyun"
    for arg in sys.argv[1:]:
        if arg.startswith("--mirror="):
            mirror = arg.split("=", 1)[1]

    print("=" * 60)
    print("  douyin-transcribe-lz 环境配置工具 (Python3.13 patched)")
    print("=" * 60)
    print()

    info(f"当前 Python: {sys.executable} ({sys.version.split()[0]})")

    # 使用当前 Python (跳过版本检查)
    base_python = sys.executable

    # 创建 venv
    print()
    info("创建虚拟环境...")
    if VENV_DIR.exists():
        if force:
            shutil.rmtree(VENV_DIR)
            info(f"已删除旧的 venv")
        else:
            info(f"venv 已存在，如需重建请用 --force")
            # 尝试使用已有 venv
            if sys.platform == "win32":
                venv_python = str(VENV_DIR / "Scripts" / "python.exe")
            else:
                venv_python = str(VENV_DIR / "bin" / "python")
            if os.path.exists(venv_python):
                success(f"使用已有 venv: {venv_python}")
                save_config(venv_python, mirror)
                return

    result = subprocess.run(
        [base_python, "-m", "venv", str(VENV_DIR)],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        error(f"创建 venv 失败:\n{result.stderr}")
        sys.exit(1)
    success(f"venv 已创建: {VENV_DIR}")

    if sys.platform == "win32":
        venv_python = str(VENV_DIR / "Scripts" / "python.exe")
    else:
        venv_python = str(VENV_DIR / "bin" / "python")

    # 升级 pip
    info("升级 pip 和 setuptools...")
    subprocess.run(
        [venv_python, "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel",
         "-i", MIRRORS[mirror]["url"],
         "--trusted-host", MIRRORS[mirror]["url"].split("://")[1].split("/")[0]],
        check=False
    )

    install_base = [venv_python, "-m", "pip", "install",
                    "-i", MIRRORS[mirror]["url"],
                    "--trusted-host", MIRRORS[mirror]["url"].split("://")[1].split("/")[0]]

    packages_ordered = [
        ("numpy (<2)", ["numpy<2"]),
        ("requests, imageio[ffmpeg]", ["requests", "imageio[ffmpeg]"]),
        ("playwright", ["playwright"]),
        ("openai-whisper", ["openai-whisper"]),
    ]

    all_ok = True
    for step_name, pkgs in packages_ordered:
        info(f"安装 {step_name}...")
        result = subprocess.run(install_base + pkgs, capture_output=True, text=True)
        if result.returncode != 0:
            err_lines = result.stderr.strip().split("\n")
            error(f"{step_name} 安装失败:\n" + "\n".join(err_lines[-5:]))
            all_ok = False
            break
        success(f"{step_name} 安装完成")

    if not all_ok:
        error("\n部分依赖安装失败，尝试换源: --mirror=pypi 或 --mirror=tsinghua")
        sys.exit(1)

    success("所有依赖包安装完成")

    # 安装 Chromium
    print()
    info("安装 Chromium...")
    subprocess.run([venv_python, "-m", "playwright", "install", "chromium"],
                   capture_output=True, text=True)

    # 验证
    print()
    info("验证所有包...")
    verify_script = """
import sys
errors = []
for mod_name in ['torch', 'whisper', 'playwright', 'requests', 'imageio_ffmpeg']:
    try:
        mod = __import__(mod_name)
        print(f"  OK: {mod_name} {getattr(mod, '__version__', '')}")
    except Exception as e:
        errors.append(f"{mod_name}: {e}")
if errors:
    print("FAIL:", "; ".join(errors))
    sys.exit(1)
else:
    print("All imports successful")
"""
    verify_result = subprocess.run([venv_python, "-c", verify_script],
                                   capture_output=True, text=True, timeout=30)
    if verify_result.returncode != 0:
        error(f"验证失败:\n{verify_result.stdout}\n{verify_result.stderr}")
        sys.exit(1)
    print(verify_result.stdout)
    success("所有依赖验证通过！")

    save_config(venv_python, mirror)
    print()
    print("=" * 60)
    print("  [OK] 环境配置完成!")
    print("=" * 60)

def save_config(venv_python, mirror):
    config = {
        "venv_python": venv_python,
        "venv_dir": str(VENV_DIR.resolve()),
        "mirror": mirror,
        "created_at": __import__("datetime").datetime.now().isoformat(),
        "platform": platform.platform(),
        "python_version": sys.version.split()[0],
    }
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    info(f"配置已保存: {CONFIG_FILE}")

if __name__ == "__main__":
    main()
