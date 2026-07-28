# 视频去水印后端 - 一键部署指南

## 方式一：Render（推荐，2 分钟搞定）

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/huanhuan77/treasure-workbench)

或者手动操作：

1. 打开 https://dashboard.render.com
2. 点 **New +** → **Blueprint**
3. 连接你的 GitHub 仓库 `treasure-workbench`
4. Render 会自动识别 `render.yaml`，点 **Apply**
5. 等 2 分钟部署完成

部署后得到地址：`https://xxx.onrender.com`

## 方式二：Railway

1. 打开 https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. 选择 `treasure-workbench`
4. 设置 Start Command: `cd watermark-server && python main.py`
5. 添加环境变量 `PORT=5002`

## 方式三：VPS / 自己服务器

```bash
git clone https://github.com/huanhuan77/treasure-workbench.git
cd treasure-workbench/watermark-server
pip install -r requirements.txt
apt install ffmpeg
python main.py
```

## 前端配置

部署完成后，在 GitHub Pages 打开去水印页面，点 ⚙️ 服务配置，填入后端地址即可。
