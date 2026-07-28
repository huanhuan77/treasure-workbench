import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'

const DEFAULT_API = 'https://clubs-annie-physically-buildings.trycloudflare.com'

export function VideoDownloadPage() {
  const { show } = useToast()
  const [url, setUrl] = useState('')
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('dl_api_url') || DEFAULT_API)
  const [showConfig, setShowConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const videoRef = useRef(null)

  const handleDownload = async () => {
    if (!url.trim()) { show('请输入视频链接', 'error'); return }
    setLoading(true)
    setProgress('正在获取视频...')
    setResultUrl('')
    try {
      const res = await fetch(`${apiUrl}/api/download-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '下载失败')
      }
      const data = await res.json()
      if (data.url) {
        setResultUrl(apiUrl + data.url)
        setFileName(data.filename || 'video.mp4')
        setProgress('✅ 下载完成')
        show('视频获取成功', 'success')
      } else {
        throw new Error(data.error || '获取失败')
      }
    } catch (e) {
      setProgress('❌ ' + e.message)
      show('失败: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = fileName || 'video.mp4'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>⬇️ 视频下载</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>粘贴链接下载无水印视频</p>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 服务配置 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button onClick={() => setShowConfig(!showConfig)} style={{ border: 'none', background: 'transparent', color: 'var(--gray-400)', fontSize: '12px', cursor: 'pointer', padding: '4px 8px' }}>
            {showConfig ? '收起' : '⚙️ 服务配置'}
          </button>
        </div>
        {showConfig && (
          <div style={{ ...glassStyle, padding: '12px', marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '4px', display: 'block' }}>后端地址</label>
            <input value={apiUrl} onChange={e => { setApiUrl(e.target.value); localStorage.setItem('dl_api_url', e.target.value) }}
              placeholder={DEFAULT_API} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }} />
          </div>
        )}

        {/* 输入 */}
        <div style={{ ...glassStyle, padding: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>视频链接</label>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="粘贴视频链接，如 https://v.douyin.com/xxx"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                paddingRight: url ? '40px' : '14px',
                borderRadius: '10px', border: '1.5px solid rgba(99,102,241,0.2)',
                fontSize: '14px', outline: 'none', background: '#fff',
              }} />
            {url && (
              <button onClick={() => { setUrl(''); setResultUrl(''); setProgress('') }}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.06)', color: '#6b7280', fontSize: '16px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}>×</button>
            )}
          </div>

          <button onClick={handleDownload} disabled={loading}
            style={{
              width: '100%', padding: '14px 0', borderRadius: '10px', border: 'none',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
            }}>
            {loading ? '下载中...' : '🚀 获取视频'}
          </button>

          {progress && (
            <p style={{ marginTop: '10px', fontSize: '13px', textAlign: 'center',
              color: progress.includes('❌') ? '#e11d48' : '#059669' }}>{progress}</p>
          )}
        </div>

        {/* 结果 */}
        {resultUrl && (
          <div style={{ ...glassStyle, padding: '16px', marginTop: '12px' }}>
            <video ref={videoRef} src={resultUrl} controls
              style={{ width: '100%', borderRadius: '10px', maxHeight: '380px' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={handleSave} style={{
                flex: 1, padding: '12px 0', borderRadius: '8px', border: 'none',
                background: '#10b981', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}>⬇️ 下载到本地</button>
              <button onClick={() => { setUrl(''); setResultUrl(''); setProgress('') }}
                style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #d1d5db',
                  background: '#fff', color: '#6b7280', fontSize: '14px', cursor: 'pointer' }}>
                清除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
