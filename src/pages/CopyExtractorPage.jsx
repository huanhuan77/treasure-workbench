import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function isValidDouyinUrl(text) {
  return /(v\.douyin\.com|www\.douyin\.com|douyin\.com\/video)/i.test(text)
}

function extractShareLink(text) {
  // 尝试从分享文案中提取链接
  const match = text.match(/https?:\/\/v\.douyin\.com\/[a-zA-Z0-9]+/i)
  return match ? match[0] : text
}

// ── 组件 ──────────────────────────────────────────────────────────────────────

export function CopyExtractorPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('link')     // 'link' | 'upload'
  const [linkInput, setLinkInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState('idle')  // 'idle' | 'loading' | 'done' | 'error'
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  // ── API 地址（优先使用 localStorage 中的自定义地址，否则默认本地） ──
  const [apiBase, setApiBase] = useState(
    () => localStorage.getItem('extract_api_base') || 'http://localhost:8877'
  )
  const [showSettings, setShowSettings] = useState(false)

  // 重置状态
  const resetResult = useCallback(() => {
    setResult('')
    setStatus('idle')
    setCopied(false)
  }, [])

  // 处理文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      resetResult()
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
      resetResult()
    }
  }

  // 提取文案（链接模式）
  const handleExtractLink = async () => {
    const input = linkInput.trim()
    if (!input) {
      show('请先粘贴抖音视频链接', 'error')
      return
    }
    if (!isValidDouyinUrl(input)) {
      show('请粘贴有效的抖音视频链接', 'error')
      return
    }

    const url = extractShareLink(input)
    setStatus('loading')
    setResult('')
    setCopied(false)

    try {
      // 尝试连接本地 API 服务
      const resp = await fetch(`${apiBase}/extract-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(120000),
      })

      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(err || `服务响应异常 (${resp.status})`)
      }

      const data = await resp.json()
      setResult(data.text || '（未提取到文案）')
      setStatus('done')
      show('文案提取完成！', 'success')
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        setResult('⏳ 处理超时，视频可能较长或网络较慢，请重试')
      } else {
        setResult(`⚠️ 提取失败: ${err.message}\n\n是否本地 API 服务未启动？请稍后在设置中配置 API 地址。`)
      }
      setStatus('error')
      show('提取失败', 'error')
    }
  }

  // 提取文案（上传模式）
  const handleExtractFile = async () => {
    if (!selectedFile) {
      show('请先选择一个视频或音频文件', 'error')
      return
    }

    setStatus('loading')
    setResult('')
    setCopied(false)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const resp = await fetch(`${apiBase}/extract-file`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(300000), // 5 分钟超时
      })

      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(err || `服务响应异常 (${resp.status})`)
      }

      const data = await resp.json()
      setResult(data.text || '（未提取到文案）')
      setStatus('done')
      show('文案提取完成！', 'success')
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        setResult('⏳ 处理超时，视频较长或服务器繁忙')
      } else {
        setResult(`⚠️ 提取失败: ${err.message}`)
      }
      setStatus('error')
      show('提取失败', 'error')
    }
  }

  // 复制结果
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      show('已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = result
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      show('已复制到剪贴板', 'success')
    }
  }

  // 文件大小格式化
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────────────

  const linkColor = (target) =>
    target === mode ? 'var(--primary)' : 'var(--gray-400)'
  const linkBg = (target) =>
    target === mode ? 'rgba(244, 114, 182, 0.10)' : 'transparent'

  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* 头部 */}
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            border: 'none',
            background: 'rgba(236, 72, 182, 0.10)',
            color: 'var(--primary)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            fontSize: '20px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >←</button>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-main)',
            letterSpacing: '-0.3px',
          }}>文案提取器</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            抖音视频链接或本地上传，一键提取语音文案
          </p>
        </div>
        {/* 设置按钮 */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: showSettings ? 'rgba(244, 114, 182, 0.10)' : 'transparent',
            color: showSettings ? 'var(--primary)' : 'var(--gray-400)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            fontSize: '20px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >⚙️</button>
      </header>

      <div style={{ padding: '0 16px 16px' }}>
        {/* 模式切换 */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(255,255,255,0.35)',
          borderRadius: '14px',
          padding: '3px',
          marginBottom: '14px',
        }}>
          <button
            onClick={() => { setMode('link'); resetResult() }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: '11px',
              fontSize: '14px',
              fontWeight: mode === 'link' ? 600 : 500,
              color: linkColor('link'),
              background: linkBg('link'),
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >🔗 粘贴链接</button>
          <button
            onClick={() => { setMode('upload'); resetResult() }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: '11px',
              fontSize: '14px',
              fontWeight: mode === 'upload' ? 600 : 500,
              color: linkColor('upload'),
              background: linkBg('upload'),
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >📁 上传视频</button>
        </div>

        {/* API 设置面板 */}
        {showSettings && (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '14px',
            padding: '14px',
            marginBottom: '12px',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              后端 API 地址
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={apiBase}
                onChange={(e) => {
                  setApiBase(e.target.value)
                  localStorage.setItem('extract_api_base', e.target.value)
                }}
                placeholder="http://localhost:8877"
                style={{
                  flex: 1,
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  background: '#fff',
                }}
              />
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--text-sub)',
              lineHeight: 1.5,
            }}>
              💡 GitHub Pages 部署时修改为 Render 后端地址，例如 <code>https://your-app.onrender.com</code>
            </div>
          </div>
        )}

        {/* 输入区域 */}
        {mode === 'link' ? (
          <div>
            <textarea
              value={linkInput}
              onChange={(e) => { setLinkInput(e.target.value); resetResult() }}
              placeholder="粘贴抖音视频链接或分享文案&#10;例如: https://v.douyin.com/xxxxx"
              rows={3}
              style={{
                width: '100%',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--text-main)',
                outline: 'none',
                background: '#fff',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <ExtractButton
              loading={status === 'loading'}
              onClick={handleExtractLink}
              disabled={!linkInput.trim()}
            />
          </div>
        ) : (
          <div>
            {/* 拖拽/选择区域 */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${selectedFile ? 'var(--primary)' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: '14px',
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: selectedFile ? 'rgba(244, 114, 182, 0.05)' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎬</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>
                    {formatSize(selectedFile.size)}
                  </div>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'var(--primary)',
                  }}>
                    点击更换文件
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📤</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                    点击选择或拖拽文件
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>
                    支持 MP4, MOV, AVI, MP3, WAV, M4A 等格式
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a,.flac,.ogg,.aac"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <ExtractButton
              loading={status === 'loading'}
              onClick={handleExtractFile}
              disabled={!selectedFile}
            />
          </div>
        )}

        {/* 加载指示器 */}
        {status === 'loading' && (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--gray-200)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
              正在提取文案，请稍候...
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--gray-400)',
              marginTop: '4px',
            }}>
              视频较长时可能需要几分钟
            </div>
          </div>
        )}

        {/* 结果区域 */}
        {result && (
          <div style={{
            animation: 'fadeIn 0.3s ease',
            marginTop: '4px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: status === 'error' ? 'var(--danger)' : 'var(--text-main)',
              }}>
                {status === 'error' ? '⚠️ 提取失败' : '📝 提取结果'}
              </span>
              {status === 'done' && (
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: copied ? 'var(--success)' : 'var(--primary)',
                    background: copied
                      ? 'rgba(52, 211, 153, 0.10)'
                      : 'rgba(244, 114, 182, 0.10)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✅ 已复制' : '📋 复制文案'}
                </button>
              )}
            </div>
            <pre style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '14px',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: status === 'error' ? 'var(--danger)' : 'var(--text-main)',
              margin: 0,
              maxHeight: '400px',
              overflowY: 'auto',
              border: status === 'error'
                ? '1px solid rgba(251, 113, 133, 0.2)'
                : '1px solid rgba(0,0,0,0.06)',
              fontFamily: 'inherit',
            }}>
              {result}
            </pre>
          </div>
        )}
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ── 提取按钮子组件 ──────────────────────────────────────────────────────────

function ExtractButton({ loading, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        marginTop: '12px',
        padding: '14px 0',
        border: 'none',
        borderRadius: '14px',
        fontSize: '16px',
        fontWeight: 600,
        color: '#fff',
        background: disabled
          ? 'linear-gradient(135deg, #ccc 0%, #bbb 100%)'
          : 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? '⏳ 提取中...' : '🚀 提取文案'}
    </button>
  )
}
