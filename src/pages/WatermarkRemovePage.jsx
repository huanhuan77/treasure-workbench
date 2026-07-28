import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'

export function WatermarkRemovePage() {
  const { show } = useToast()
  const [url, setUrl] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [mode, setMode] = useState('auto')
  const [position, setPosition] = useState('bottom-right')
  const videoRef = useRef(null)

  // 水印位置预设（抖音常见位置）
  const POSITIONS = {
    'bottom-right': { label: '右下角（抖音默认）', x: 'main_w-160', y: 'main_h-60', w: 150, h: 50 },
    'bottom-center': { label: '底部居中（抖音头像）', x: 'main_w/2-75', y: 'main_h-80', w: 150, h: 70 },
    'top-right': { label: '右上角', x: 'main_w-160', y: 10, w: 150, h: 50 },
    'center': { label: '居中大图', x: 'main_w/2-125', y: 'main_h/2-125', w: 250, h: 250 },
  }

  const handleProcess = async () => {
    if (!url.trim()) { show('请输入视频链接', 'error'); return }
    setProcessing(true)
    setProgress('正在处理...')
    setResultUrl('')

    try {
      const modeParam = mode === 'auto' ? 'auto' : position
      const res = await fetch(`/api/remove-watermark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), position: modeParam }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || '处理失败')
      }
      const data = await res.json()
      if (data.url) {
        setResultUrl(data.url)
        setProgress('处理完成 ✅')
        show('去水印成功', 'success')
      } else {
        throw new Error(data.error || '处理失败')
      }
    } catch (e) {
      setProgress('处理失败: ' + e.message)
      show('处理失败: ' + e.message, 'error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>🎬 视频去水印</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>支持抖音/快手等平台视频链接</p>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 输入区域 */}
        <div style={{ ...glassStyle, padding: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>
            视频链接
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴视频链接，如 https://v.douyin.com/xxx"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px',
              borderRadius: '10px', border: '1.5px solid rgba(99,102,241,0.2)',
              fontSize: '14px', outline: 'none', background: '#fff',
              marginBottom: '12px',
            }}
          />

          {/* 去水印模式 */}
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>
            去除模式
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => setMode('auto')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
                background: mode === 'auto' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f3f4f6',
                color: mode === 'auto' ? '#fff' : '#6b7280',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >🤖 智能识别</button>
            <button
              onClick={() => setMode('manual')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
                background: mode === 'manual' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f3f4f6',
                color: mode === 'manual' ? '#fff' : '#6b7280',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >🎯 手动选择</button>
          </div>

          {/* 手动选择位置 */}
          {mode === 'manual' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>
                水印位置
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1.5px solid rgba(99,102,241,0.2)', fontSize: '14px',
                  outline: 'none', background: '#fff',
                  appearance: 'none', WebkitAppearance: 'none',
                }}
              >
                {Object.entries(POSITIONS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* 处理按钮 */}
          <button
            onClick={handleProcess}
            disabled={processing}
            style={{
              width: '100%', padding: '14px 0', borderRadius: '10px', border: 'none',
              background: processing ? '#9ca3af' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              color: '#fff', fontSize: '15px', fontWeight: 700, cursor: processing ? 'not-allowed' : 'pointer',
              boxShadow: processing ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
            }}
          >
            {processing ? '处理中...' : '🚀 开始去水印'}
          </button>

          {progress && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: progress.includes('失败') ? '#e11d48' : '#059669', textAlign: 'center' }}>
              {progress}
            </p>
          )}
        </div>

        {/* 结果预览 */}
        {resultUrl && (
          <div style={{ ...glassStyle, padding: '16px', marginTop: '12px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>预览</h3>
            <video
              ref={videoRef}
              src={resultUrl}
              controls
              style={{ width: '100%', borderRadius: '10px', maxHeight: '400px' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <a
                href={resultUrl}
                download
                style={{
                  flex: 1, display: 'block', textAlign: 'center', padding: '12px 0',
                  borderRadius: '8px', background: '#10b981', color: '#fff',
                  fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                }}
              >⬇️ 下载视频</a>
              <button
                onClick={() => { setUrl(''); setResultUrl(''); setProgress('') }}
                style={{
                  flex: '0 0 auto', padding: '12px 20px', borderRadius: '8px',
                  border: '1px solid #d1d5db', background: '#fff',
                  color: '#6b7280', fontSize: '14px', cursor: 'pointer',
                }}
              >清除</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
