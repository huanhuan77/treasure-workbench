import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'

// ── 讯飞 ASR WebSocket 直连（纯前端，无需后端） ──────────────────────────

const XF_HOST = 'iat-api.xfyun.cn'
const XF_PATH = '/v2/iat'
let XF_WS_URL = ''

function arrayBufferToBase64(buf) {
  let s = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

async function buildXunfeiWsUrl(apiKey, apiSecret) {
  const date = new Date().toUTCString()
  const encoder = new TextEncoder()
  const signStr = `host: ${XF_HOST}\ndate: ${date}\nGET ${XF_PATH} HTTP/1.1`
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signStr))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  const auth = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${sigB64}"`
  XF_WS_URL = `${XF_URL}?authorization=${encodeURIComponent(btoa(auth))}&date=${encodeURIComponent(date)}&host=${XF_HOST}`
}

const XF_URL = `wss://${XF_HOST}${XF_PATH}`

function xunfeiTranscribe(audioBase64, appId) {
  return new Promise((resolve, reject) => {
    let resultText = ''
    let ws

    try {
      ws = new WebSocket(XF_WS_URL || XF_URL)
    } catch {
      reject(new Error('WebSocket 连接失败'))
      return
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({
        common: { app_id: appId },
        business: { language: 'zh_cn', domain: 'iat', accent: 'mandarin', vad_eos: 3000, dwa: 'wpgs' },
      }))

      const sliceSize = 12800
      const totalChunks = Math.ceil(audioBase64.length / sliceSize)
      let idx = 0

      const sendNext = () => {
        if (idx >= totalChunks) return
        const chunk = audioBase64.slice(idx * sliceSize, (idx + 1) * sliceSize)
        const isLast = idx >= totalChunks - 1
        ws.send(JSON.stringify({
          data: { status: isLast ? 2 : (idx === 0 ? 0 : 1), format: 'audio/L16;rate=16000', encoding: 'raw', audio: chunk },
        }))
        idx++
        setTimeout(sendNext, 40)
      }
      sendNext()
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.code !== 0) { ws.close(); reject(new Error(`讯飞错误 ${msg.code}: ${msg.message || ''}`)); return }
        if (msg.data?.result?.ws) {
          resultText += msg.data.result.ws.map(w => w.cw.map(c => c.w).join('')).join('')
        }
        if (msg.data?.status === 2) { ws.close(); resolve(resultText.trim()) }
      } catch { /* skip */ }
    }
    ws.onerror = () => reject(new Error('讯飞连接异常'))
    ws.onclose = (e) => { if (resultText) resolve(resultText.trim()); else reject(new Error(`连接关闭 ${e.code}`)) }

    setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.close(); if (!resultText) reject(new Error('识别超时')) }, 60000)
  })
}

// ── 工具函数 ──────────────────────────────────────────────────────────────

function extractDouyinLink(text) {
  const m = text.match(/https?:\/\/(v\.douyin\.com|www\.douyin\.com|douyin\.com\/(video|note))\/[a-zA-Z0-9_-]+/i)
  return m ? m[0] : text.match(/https?:\/\/[^\s]+douyin[^\s]*/i)?.[0] || text.trim()
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── 组件 ──────────────────────────────────────────────────────────────────

export function CopyExtractorPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('link')       // 'link' | 'upload'
  const [linkInput, setLinkInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState('idle')   // 'idle' | 'loading' | 'done' | 'error'
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState('')
  const [videoUrl, setVideoUrl] = useState('')   // 下载链接
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // ── 引擎设置（localStorage） ──
  const [engine, setEngine] = useState(() => localStorage.getItem('extract_engine') || 'xunfei')
  const [apiBase] = useState(() => localStorage.getItem('extract_api_base') || 'http://localhost:8877')
  const [xfAppId, setXfAppId] = useState(() => localStorage.getItem('extract_xf_appid') || '')
  const [xfApiKey, setXfApiKey] = useState(() => localStorage.getItem('extract_xf_apikey') || '')
  const [xfApiSecret, setXfApiSecret] = useState(() => localStorage.getItem('extract_xf_apisecret') || '')

  const saveEngine = (v) => { setEngine(v); localStorage.setItem('extract_engine', v) }
  const saveAppId = (v) => { setXfAppId(v); localStorage.setItem('extract_xf_appid', v) }
  const saveApiKey = (v) => { setXfApiKey(v); localStorage.setItem('extract_xf_apikey', v) }
  const saveSecret = (v) => { setXfApiSecret(v); localStorage.setItem('extract_xf_apisecret', v) }

  const resetResult = useCallback(() => {
    setResult(''); setStatus('idle'); setCopied(false); setProgress(''); setVideoUrl('')
  }, [])

  // ── 讯飞 ASR 浏览器直连 ──
  const transcribeWithXunfei = async (file) => {
    setProgress('🎬 加载 FFmpeg...')
    let FFmpeg, fetchFile, toBlobURL
    try {
      ;({ FFmpeg } = await import('@ffmpeg/ffmpeg'))
      ;({ fetchFile, toBlobURL } = await import('@ffmpeg/util'))
    } catch { throw new Error('FFmpeg 加载失败') }

    const ff = new FFmpeg()
    setProgress('📥 下载 FFmpeg Core (~25MB)...')
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    setProgress('🔄 提取音频并转为 16kHz PCM...')
    const inputName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] || '.mp4')
    await ff.writeFile(inputName, await fetchFile(file))
    const outName = 'audio.pcm'
    await ff.exec(['-i', inputName, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-f', 's16le', outName])

    setProgress('🗣️ 发送至讯飞语音识别...')
    const data = await ff.readFile(outName)
    const b64 = arrayBufferToBase64(data.buffer)
    await ff.deleteFile(inputName); await ff.deleteFile(outName); ff.terminate()

    await buildXunfeiWsUrl(xfApiKey, xfApiSecret)
    return await xunfeiTranscribe(b64, xfAppId)
  }

  // ── 提取文案（上传模式） ──
  const handleExtractFile = async () => {
    if (!selectedFile) { show('请选择文件', 'error'); return }
    setStatus('loading'); setResult(''); setCopied(false); setProgress('')

    try {
      const text = await transcribeWithXunfei(selectedFile)
      setResult(text || '（未识别到语音）')
      setStatus('done')
      show('文案提取完成！', 'success')
    } catch (err) {
      setResult(`⚠️ 提取失败: ${err.message}`)
      setStatus('error')
      show('提取失败', 'error')
    }
    setProgress('')
  }

  // ── 提取文案+下载（链接模式 → AI 代处理） ──
  const handleRequestProcessing = () => {
    const link = extractDouyinLink(linkInput)
    if (!link || !/(douyin)/i.test(link)) {
      show('请粘贴有效的抖音链接', 'error')
      return
    }
    setStatus('loading')
    setProgress(`📋 已将链接提交给 WorkBuddy AI 处理\n\n链接: ${link}\n\n请到对话中等待处理结果...`)
    setResult('')

    // 复制链接到剪贴板，方便用户粘贴到对话
    navigator.clipboard.writeText(`请帮我下载这个抖音视频并提取文案：${link}`)
      .then(() => show('链接已复制！粘贴到对话中即可处理', 'success'))
      .catch(() => show(`链接: ${link}`, 'info'))
  }

  // ── 复制结果 ──
  const handleCopy = async () => {
    const content = [result, videoUrl ? `\n\n📥 视频下载: ${videoUrl}` : ''].filter(Boolean).join('')
    try { await navigator.clipboard.writeText(content) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = content; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true); show('已复制', 'success'); setTimeout(() => setCopied(false), 2000)
  }

  // ── 文件处理 ──
  const handleFileSelect = (e) => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); resetResult() } }
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { setSelectedFile(f); resetResult() } }

  const tabStyle = (id) => ({
    flex: 1, padding: '10px 0', border: 'none', borderRadius: '11px',
    fontSize: '14px', fontWeight: mode === id ? 600 : 500,
    color: mode === id ? 'var(--primary)' : 'var(--gray-400)',
    background: mode === id ? 'rgba(244,114,182,0.10)' : 'transparent',
    cursor: 'pointer', transition: 'all 0.2s',
  })

  // ── 渲染 ──
  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.3s ease' }}>
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 12px', display: 'flex',
        alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate(-1)} style={{
          border: 'none', background: 'rgba(236,72,182,0.10)', color: 'var(--primary)',
          width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px',
          cursor: 'pointer', flexShrink: 0,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>抖音下载 + 文案提取</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            粘贴链接或上传视频，自动提取语音文案
          </p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} style={{
          border: 'none', background: showSettings ? 'rgba(244,114,182,0.10)' : 'transparent',
          color: showSettings ? 'var(--primary)' : 'var(--gray-400)', width: '36px', height: '36px',
          borderRadius: '50%', fontSize: '20px', cursor: 'pointer', flexShrink: 0,
        }}>⚙️</button>
      </header>

      <div style={{ padding: '0 16px 16px' }}>
        {/* 模式切换 */}
        <div style={{
          display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.35)',
          borderRadius: '14px', padding: '3px', marginBottom: '14px',
        }}>
          {[
            { id: 'link', label: '🔗 粘贴链接' },
            { id: 'upload', label: '📁 上传视频' },
          ].map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); resetResult() }} style={tabStyle(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              识别引擎
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(244,114,182,0.06)', borderRadius: '10px', padding: '3px', marginBottom: '10px' }}>
              {[{ id: 'xunfei', label: '🗣️ 讯飞 ASR' }, { id: 'backend', label: '🖥️ 后端服务' }].map(e => (
                <button key={e.id} onClick={() => saveEngine(e.id)} style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: engine === e.id ? 600 : 500,
                  color: engine === e.id ? '#fff' : 'var(--text-sub)',
                  background: engine === e.id ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
                  cursor: 'pointer',
                }}>{e.label}</button>
              ))}
            </div>

            {engine === 'xunfei' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                  去 <a href="https://console.xfyun.cn/services/iat" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>讯飞开放平台</a> 开通语音听写
                </div>
                <input value={xfAppId} onChange={e => saveAppId(e.target.value)} placeholder="AppID" style={inp} />
                <input value={xfApiKey} onChange={e => saveApiKey(e.target.value)} placeholder="APIKey" style={inp} />
                <input value={xfApiSecret} onChange={e => saveSecret(e.target.value)} placeholder="APISecret" type="password" style={inp} />
                <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                  ✅ 上传模式纯前端处理，无需后端
                </div>
              </div>
            ) : (
              <div>
                <input value={apiBase} onChange={e => localStorage.setItem('extract_api_base', e.target.value)} placeholder="http://localhost:8877" style={inp} />
                <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '6px' }}>
                  💡 需要部署后端服务（Render 或本地）
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 链接模式 ── */}
        {mode === 'link' && (
          <div>
            <textarea value={linkInput}
              onChange={e => { setLinkInput(e.target.value); resetResult() }}
              placeholder="粘贴抖音分享链接或口令&#10;例如: https://v.douyin.com/xxxxx"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px',
                padding: '14px', fontSize: '14px', lineHeight: 1.6,
                color: 'var(--text-main)', outline: 'none', background: '#fff', resize: 'none',
              }}
            />

            <button onClick={handleRequestProcessing}
              disabled={status === 'loading'}
              style={{
                width: '100%', marginTop: '12px', padding: '14px 0',
                border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600,
                color: '#fff',
                background: status === 'loading'
                  ? 'linear-gradient(135deg,#ccc,#bbb)'
                  : 'linear-gradient(135deg,#f472b6,#ec4899)',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'loading' ? '⏳ 已提交...' : '🤖 交给 AI 处理（下载+提取）'}
            </button>

            <div style={{
              marginTop: '12px',
              background: 'rgba(255,255,255,0.4)', borderRadius: '12px', padding: '12px 14px',
              fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.6,
            }}>
              <strong>💡 处理流程：</strong><br />
              1. 点击上方按钮 → 复制链接到剪贴板<br />
              2. 在 WorkBuddy 对话中粘贴，说"帮我下载这个抖音视频并提取文案"<br />
              3. 我会帮你下载无水印视频 + 提取语音文案
            </div>

            {/* AI 进度指示 */}
            {status === 'loading' && progress && (
              <div style={{
                marginTop: '12px',
                background: 'rgba(255,255,255,0.5)', borderRadius: '12px',
                padding: '14px', whiteSpace: 'pre-wrap',
                fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.6,
              }}>
                {progress}
              </div>
            )}
          </div>
        )}

        {/* ── 上传模式 ── */}
        {mode === 'upload' && (
          <div>
            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${selectedFile ? 'var(--primary)' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: '14px', padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                background: selectedFile ? 'rgba(244,114,182,0.05)' : 'rgba(255,255,255,0.3)',
              }}
            >
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎬</div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>{formatSize(selectedFile.size)}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📤</div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>点击选择或拖拽视频/音频文件</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>支持 MP4/MOV/AVI/MP3/WAV 等</div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="video/*,audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>

            {engine === 'xunfei' && (!xfAppId || !xfApiKey || !xfApiSecret) && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px', textAlign: 'center' }}>
                ⚠️ 请先在设置中填写讯飞 ASR 凭据
              </div>
            )}

            <button onClick={handleExtractFile}
              disabled={!selectedFile || status === 'loading' || (engine === 'xunfei' && (!xfAppId || !xfApiKey || !xfApiSecret))}
              style={{
                width: '100%', marginTop: '12px', padding: '14px 0',
                border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600, color: '#fff',
                background: (!selectedFile || status === 'loading')
                  ? 'linear-gradient(135deg,#ccc,#bbb)'
                  : 'linear-gradient(135deg,#f472b6,#ec4899)',
                cursor: (!selectedFile || status === 'loading') ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'loading' ? '⏳ 处理中...' : (engine === 'xunfei' ? '🚀 讯飞 ASR 提取文案' : '🚀 提取文案')}
            </button>

            <div style={{
              marginTop: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px',
              padding: '12px 14px', fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.6,
            }}>
              {engine === 'xunfei'
                ? '✅ 纯前端处理：视频 → FFmpeg.wasm 提取音频 → 讯飞 ASR 识别 → 文案'
                : '💡 需要部署后端服务（Render）才可使用'}
            </div>
          </div>
        )}

        {/* 加载进度 */}
        {status === 'loading' && progress && !progress.includes('提交') && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid var(--gray-200)',
              borderTopColor: 'var(--primary)', borderRadius: '50%',
              margin: '0 auto 10px', animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontSize: '14px', color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>{progress}</div>
          </div>
        )}

        {/* 结果 */}
        {result && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: status === 'error' ? 'var(--danger)' : 'var(--text-main)' }}>
                {status === 'error' ? '⚠️ 失败' : '📝 文案结果'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {videoUrl && (
                  <a href={videoUrl} download="douyin_video.mp4" style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                    color: '#fff', background: 'linear-gradient(135deg,#f472b6,#ec4899)',
                    textDecoration: 'none',
                  }}>📥 下载视频</a>
                )}
                {status === 'done' && (
                  <button onClick={handleCopy} style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                    color: copied ? 'var(--success)' : 'var(--primary)',
                    background: copied ? 'rgba(52,211,153,0.10)' : 'rgba(244,114,182,0.10)',
                    border: 'none', cursor: 'pointer',
                  }}>
                    {copied ? '✅ 已复制' : '📋 复制'}
                  </button>
                )}
              </div>
            </div>
            <pre style={{
              background: '#fff', borderRadius: '14px', padding: '16px',
              fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: status === 'error' ? 'var(--danger)' : 'var(--text-main)',
              margin: 0, maxHeight: '400px', overflowY: 'auto',
              border: status === 'error' ? '1px solid rgba(251,113,133,0.2)' : '1px solid rgba(0,0,0,0.06)',
              fontFamily: 'inherit',
            }}>{result}</pre>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const inp = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px',
  padding: '9px 12px', fontSize: '13px',
  color: 'var(--text-main)', outline: 'none', background: '#fff',
}
