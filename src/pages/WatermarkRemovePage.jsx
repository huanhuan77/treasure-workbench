import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export function WatermarkRemovePage() {
  const { show } = useToast()
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('upload') // 'upload' | 'url'
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [ffLoaded, setFfLoaded] = useState(false)
  const ffRef = useRef(null)
  const videoRef = useRef(null)
  const inputRef = useRef(null)

  // 水印位置预设
  const POSITIONS = {
    'bottom-right': { label: '右下角（抖音默认）', x: 'main_w-160', y: 'main_h-60', w: 150, h: 50 },
    'bottom-center': { label: '底部居中（抖音头像）', x: 'main_w/2-75', y: 'main_h-80', w: 150, h: 70 },
    'top-right': { label: '右上角', x: 'main_w-160', y: 10, w: 150, h: 50 },
  }
  const [position, setPosition] = useState('bottom-right')

  // 加载 FFmpeg WASM（懒加载）
  const loadFFmpeg = async () => {
    if (ffLoaded) return ffRef.current
    const ff = new FFmpeg()
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ff.on('progress', ({ progress: p }) => {
      setProgress(`处理中 ${Math.round(p * 100)}%`)
    })
    ffRef.current = ff
    setFfLoaded(true)
    return ff
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleProcessFile = async () => {
    if (!file) { show('请选择视频文件', 'error'); return }
    setProcessing(true)
    setProgress('加载 FFmpeg...')
    setResultUrl('')
    try {
      const ff = await loadFFmpeg()
      const inputName = 'input' + (file.name.match(/\.[^.]+$/) || ['.mp4'])[0]
      const outputName = 'output.mp4'
      setProgress('读取视频...')
      await ff.writeFile(inputName, await fetchFile(file))
      const pos = POSITIONS[position]
      const filter = `delogo=x=${pos.x}:y=${pos.y}:w=${pos.w}:h=${pos.h}:show=0`
      setProgress('处理中 0%')
      await ff.exec([
        '-i', inputName,
        '-vf', filter,
        '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
        '-c:a', 'copy',
        '-y', outputName,
      ])
      setProgress('导出视频...')
      const data = await ff.readFile(outputName)
      const blob = new Blob([data], { type: 'video/mp4' })
      setResultUrl(URL.createObjectURL(blob))
      setProgress('处理完成 ✅')
      show('去水印成功', 'success')
      ff.deleteFile(inputName); ff.deleteFile(outputName)
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
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>浏览器本地处理，不上传服务器</p>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 模式切换 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', padding: '3px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)' }}>
          <button onClick={() => setMode('upload')} style={{
            flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
            background: mode === 'upload' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
            color: mode === 'upload' ? '#fff' : '#6b7280',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>📁 上传文件</button>
          <button onClick={() => setMode('url')} style={{
            flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
            background: mode === 'url' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
            color: mode === 'url' ? '#fff' : '#6b7280',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>🔗 链接模式</button>
        </div>

        <div style={{ ...glassStyle, padding: '16px' }}>
          {mode === 'upload' ? (
            <>
              <div
                onClick={() => inputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(99,102,241,0.25)',
                  borderRadius: '12px', padding: '32px 16px',
                  textAlign: 'center', cursor: 'pointer', marginBottom: '12px',
                  background: file ? 'rgba(99,102,241,0.04)' : 'transparent',
                }}
              >
                <input ref={inputRef} type="file" accept="video/*" onChange={handleFileChange} hidden />
                {file ? (
                  <div>
                    <span style={{ fontSize: '32px' }}>🎬</span>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{file.name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB — 点击更换</p>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '36px' }}>📂</span>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-main)' }}>点击选择视频文件</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>支持 mp4 / mov / avi 等格式</p>
                  </div>
                )}
              </div>

              {/* 水印位置选择 */}
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>水印位置</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)} style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1.5px solid rgba(99,102,241,0.2)', fontSize: '14px',
                outline: 'none', background: '#fff', marginBottom: '12px',
                appearance: 'none', WebkitAppearance: 'none',
              }}>
                {Object.entries(POSITIONS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>

              <button onClick={handleProcessFile} disabled={processing || !file} style={{
                width: '100%', padding: '14px 0', borderRadius: '10px', border: 'none',
                background: processing ? '#9ca3af' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: (processing || !file) ? 'not-allowed' : 'pointer',
                boxShadow: processing ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
              }}>
                {processing ? progress || '处理中...' : '🚀 开始去水印'}
              </button>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-sub)' }}>
                粘贴视频下载链接，首次使用需先下载视频到本地（因浏览器限制无法直接跨域下载）
              </p>
              <div style={{
                border: '2px dashed rgba(99,102,241,0.2)', borderRadius: '12px', padding: '20px',
                textAlign: 'center', marginBottom: '10px',
              }}>
                <span style={{ fontSize: '28px' }}>⬇️</span>
                <p style={{ fontSize: '13px', color: 'var(--text-sub)', margin: '8px 0 0' }}>
                  先用浏览器打开视频链接下载到本地
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-400)', margin: '4px 0 0' }}>
                  然后切换到「上传文件」模式处理
                </p>
              </div>
            </>
          )}

          {progress && progress.includes('完成') && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: '#059669', textAlign: 'center' }}>{progress}</p>
          )}
        </div>

        {/* 结果 */}
        {resultUrl && (
          <div style={{ ...glassStyle, padding: '16px', marginTop: '12px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>✅ 去水印成功</h3>
            <video ref={videoRef} src={resultUrl} controls style={{ width: '100%', borderRadius: '10px', maxHeight: '380px' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <a href={resultUrl} download="no_watermark.mp4" style={{
                flex: 1, display: 'block', textAlign: 'center', padding: '12px 0',
                borderRadius: '8px', background: '#10b981', color: '#fff',
                fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              }}>⬇️ 下载</a>
              <button onClick={() => { setFile(null); setResultUrl(''); setProgress(''); if (inputRef.current) inputRef.current.value = '' }}
                style={{ flex: '0 0 auto', padding: '12px 20px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: '14px', cursor: 'pointer' }}>
                清除
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', fontSize: '12px', color: '#92400e', lineHeight: 1.6 }}>
          💡 <b>无需服务器</b> — 所有处理在你自己浏览器中完成，视频不上传到任何服务器。<br />
          ⚠️ 首次使用需要加载 FFmpeg 引擎（约 30MB），之后会缓存。
        </div>
      </div>
    </div>
  )
}
