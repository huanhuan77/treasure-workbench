import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ConfirmModal, glassStyle } from '../components/Modal'

export function SensitiveWordsPage() {
  const { sensitiveWords, addSensitiveWord, deleteSensitiveWord } = useStore()
  const { show } = useToast()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [delWord, setDelWord] = useState(null)

  const handleAdd = () => {
    const w = input.trim()
    if (!w) {
      show('请输入卡审词', 'error')
      return
    }
    if (sensitiveWords.includes(w)) {
      show('该卡审词已存在', 'error')
      return
    }
    addSensitiveWord(w)
    setInput('')
    show('已添加卡审词', 'success')
  }

  const handleDelete = () => {
    deleteSensitiveWord(delWord)
    setDelWord(null)
    show('已删除卡审词', 'success')
  }

  return (
    <div className="app-container">
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
          }}>卡审词库</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            共 {sensitiveWords.length} 个 · 生成文案时自动替换为安全表述
          </p>
        </div>
      </header>

      <div style={{ padding: '8px 16px 16px' }}>
        {/* 说明 */}
        <div style={{
          ...glassStyle,
          padding: '12px 14px',
          marginBottom: '14px',
          fontSize: '13px',
          color: 'var(--text-sub)',
          lineHeight: 1.6,
        }}>
          🚫 平台会审核贬低、歧视、违规类词汇，命中后可能被扣分 / 罚没佣金 / 封号。下方词库在生成标题、话题和文案时会自动检测并替换。
        </div>

        {/* 添加区 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="输入要添加的卡审词，如：黑奴"
            style={{
              flex: 1,
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '12px',
              padding: '11px 14px',
              fontSize: '15px',
              color: 'var(--text-main)',
              outline: 'none',
              background: '#fff',
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              flexShrink: 0,
              padding: '0 18px',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
              cursor: 'pointer',
            }}
          >添加</button>
        </div>

        {/* 词库列表 */}
        {sensitiveWords.length === 0 ? (
          <div style={{
            ...glassStyle,
            textAlign: 'center',
            padding: '50px 20px',
            color: 'var(--text-sub)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚫</div>
            <p style={{ fontSize: '14px', margin: 0 }}>词库为空，添加你的第一个卡审词</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {sensitiveWords.map((w) => (
              <div
                key={w}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fff',
                  border: '1px solid rgba(244, 114, 182, 0.18)',
                  borderRadius: '999px',
                  padding: '8px 8px 8px 14px',
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  boxShadow: '0 2px 8px rgba(244, 114, 182, 0.06)',
                }}
              >
                <span>{w}</span>
                <button
                  onClick={() => setDelWord(w)}
                  style={{
                    border: 'none',
                    background: 'rgba(244, 63, 94, 0.10)',
                    color: '#f43f5e',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    fontSize: '13px',
                    lineHeight: 1,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!delWord}
        onClose={() => setDelWord(null)}
        onConfirm={handleDelete}
        title="删除卡审词"
        message={`确定删除「${delWord || ''}」吗？`}
        confirmText="删除"
        danger
      />
    </div>
  )
}
