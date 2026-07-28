# -*- coding: utf-8 -*-
import os, sys, json, subprocess, tempfile, uuid, re, requests
from flask import Flask, request, jsonify, send_file, after_this_request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 抖音水印位置预设
POSITIONS = {
    'bottom-right': {'x': 'main_w-160', 'y': 'main_h-60', 'w': 150, 'h': 50},
    'bottom-center': {'x': 'main_w/2-75', 'y': 'main_h-80', 'w': 150, 'h': 70},
    'top-right': {'x': 'main_w-160', 'y': 10, 'w': 150, 'h': 50},
    'center': {'x': 'main_w/2-125', 'y': 'main_h/2-125', 'w': 250, 'h': 250},
}

def download_video(url):
    """下载视频，返回本地路径。url 可以是纯链接或抖音分享文本（自动提取 URL）"""
    # 从分享文本中提取 URL（跳过中文/标点）
    m = re.search(r'https?://[^\s\u4e00-\u9fff]+', url)
    if m:
        url = m.group(0)
    # 去除末尾标点
    url = url.rstrip('。.,;!?')
    name = uuid.uuid4().hex + '.mp4'
    tmp = os.path.join(tempfile.gettempdir(), name)
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://www.douyin.com/',
    }
    r = requests.get(url, headers=headers, stream=True, timeout=30, allow_redirects=True)
    r.raise_for_status()
    with open(tmp, 'wb') as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)
    return tmp

def get_video_size(video_path):
    """用 ffprobe 获取视频宽高"""
    cmd = [
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    stream = data['streams'][0]
    return stream['width'], stream['height']

def remove_watermark(input_path, output_path, position='auto'):
    """使用 FFmpeg delogo 去水印"""
    if position == 'auto':
        w, h = get_video_size(input_path)
        pos = {
            'x': str(w - 160),
            'y': str(h - 70),
            'w': '150',
            'h': '60',
        }
    else:
        pos = POSITIONS.get(position, POSITIONS['bottom-right'])

    filter_str = f"delogo=x={pos['x']}:y={pos['y']}:w={pos['w']}:h={pos['h']}:show=0"

    cmd = [
        'ffmpeg', '-i', input_path,
        '-vf', filter_str,
        '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
        '-c:a', 'copy',
        '-y', output_path
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
    except subprocess.CalledProcessError as e:
        cmd2 = [
            'ffmpeg', '-i', input_path,
            '-vf', filter_str,
            '-c:v', 'h264', '-crf', '23', '-preset', 'fast',
            '-c:a', 'copy',
            '-y', output_path
        ]
        subprocess.run(cmd2, check=True, capture_output=True, text=True, timeout=120)

    return output_path

@app.route('/api/download-video', methods=['POST'])
def handle_download_video():
    """直接下载视频，返回原始文件"""
    data = request.get_json()
    if not data or not data.get('url'):
        return jsonify({'error': '请提供视频链接'}), 400

    url = data['url'].strip()
    try:
        input_path = download_video(url)
        out_name = 'video_' + uuid.uuid4().hex + '.mp4'
        output_path = os.path.join(OUTPUT_DIR, out_name)
        os.rename(input_path, output_path)
        return jsonify({
            'url': f'/api/download/{out_name}',
            'message': '下载成功',
            'filename': out_name,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/remove-watermark', methods=['POST'])
def handle_remove_watermark():
    data = request.get_json()
    if not data or not data.get('url'):
        return jsonify({'error': '请提供视频链接'}), 400

    url = data['url'].strip()
    position = data.get('position', 'auto')

    try:
        input_path = download_video(url)
        out_name = 'no_watermark_' + uuid.uuid4().hex + '.mp4'
        output_path = os.path.join(OUTPUT_DIR, out_name)
        remove_watermark(input_path, output_path, position)
        try: os.remove(input_path)
        except: pass
        return jsonify({
            'url': f'/api/download/{out_name}',
            'message': '处理成功',
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<filename>')
def download_file(filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'error': '文件不存在'}), 404

    @after_this_request
    def cleanup(resp):
        try:
            os.remove(filepath)
        except:
            pass
        return resp

    return send_file(filepath, mimetype='video/mp4', as_attachment=True, download_name='video.mp4')

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'ffmpeg': True})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    print(f'服务启动: http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=True)
