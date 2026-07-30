import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { inputStyle, btnPrimary, btnGhost } from '../components/Modal'

export function EditCopyPage() {
  const navigate = useNavigate()
  const { productId, copyId } = useParams()
  const { products, updateCopy, deleteCopy } = useStore()
  const { show } = useToast()
  const product = products.find(p => p.id === productId)
  const copy = product?.copies?.find(c => c.id === copyId)

  const [content, setContent] = useState(copy?.content || '')

  useEffect(() => {
    if (copy) setContent(copy.content)
  }, [copy])

  // 键盘弹出时锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!product || !copy) {
    return (
      <div className="app-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-sub)' }}>
          文案不存在
        </div>
      </div>
    )
  }

  const handleSave = () => {
    if (!content.trim()) { show('文案内容不能为空', 'error'); return }
    updateCopy(product.id, copy.id, { content: content.trim() })
    show('文案已更新', 'success')
    navigate(-1)
  }

  const handleDelete = () => {
    if (!confirm('确定删除这条文案吗？')) return
    deleteCopy(product.id, copy.id)
    show('已删除', 'success')
    navigate(-1)
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>编辑文案</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>{product.name}</p>
        </div>
        <button onClick={handleDelete} style={{
          padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)',
          background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}>删除</button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px', minHeight: 0 }}>
        <textarea
          placeholder="文案内容..."
          value={content}
          onChange={e => setContent(e.target.value)}
          autoFocus
          style={{
            ...inputStyle, flex: 1, resize: 'none',
            lineHeight: 1.6, fontFamily: 'inherit', fontSize: '15px',
            minHeight: '60vh',
          }}
        />
      </div>

      {/* 底部固定按钮 - 始终可见 */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: '12px 16px calc(12px + var(--safe-bottom))',
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', gap: '10px',
      }}>
        <button style={{ ...btnGhost, flex: 1 }} onClick={() => navigate(-1)}>取消</button>
        <button style={{ ...btnPrimary, flex: 2 }} onClick={handleSave} disabled={!content.trim()}>保存</button>
      </div>
    </div>
  )
}