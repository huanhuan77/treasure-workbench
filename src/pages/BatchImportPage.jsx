import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { generateTitle } from '../utils/copyGenerator'
import { DEFAULT_SENSITIVE_WORDS } from '../utils/copyGenerator'
import { parseBulkCopies } from '../utils/helpers'
import { inputStyle, btnPrimary, btnGhost } from '../components/Modal'

// 导入时自动套用的兜底话题（产品未单独配置话题时使用）
const DEFAULT_IMPORT_TOPICS = ['#好物推荐', '#亲测分享', '#强烈推荐', '#仙女都在喝什么']

export function BatchImportPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { products, addCopies } = useStore()
  const { show } = useToast()
  const product = products.find(p => p.id === id)
  const [text, setText] = useState('')

  if (!product) {
    return (
      <div className="app-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-sub)' }}>产品不存在</div>
      </div>
    )
  }

  const list = parseBulkCopies(text)
  const ordered = list.filter(i => i.hasOrder).length
  const used = list.filter(i => i.used).length

  const handleImport = () => {
    if (list.length === 0) { show('没有解析到文案', 'error'); return }
    // 话题优先级：文本自带 > 产品级(product.topics) > 兜底通用，保证新导入文案自动带话题
    const baseTopics = product.topics && product.topics.length ? product.topics : DEFAULT_IMPORT_TOPICS
    const enriched = list.map((item) => ({
      content: item.content,
      title: generateTitle(item.content, product.name, product.brand, DEFAULT_SENSITIVE_WORDS),
      topics: item.topics && item.topics.length ? item.topics : baseTopics,
      hasOrder: item.hasOrder,
    }))
    addCopies(product.id, enriched)
    show(`已导入 ${enriched.length} 条文案`, 'success')
    navigate(-1)
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>批量导入文案</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>{product.name}</p>
        </div>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px', minHeight: 0 }}>
        <textarea
          placeholder="格式：多条文案之间用空行分隔；&#10;👍=出单、✅=用过（标记会自动去掉）"
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
          style={{
            ...inputStyle, minHeight: '120px', resize: 'none',
            lineHeight: 1.6, fontFamily: 'inherit', fontSize: '14px',
          }}
        />

        {/* 解析预览/提示 */}
        {list.length === 0 ? (
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(156,163,175,0.08)', fontSize: '12px', color: 'var(--text-sub)' }}>
            💡 多条文案之间用<b>空行</b>分隔；末尾一行 <code style={{ background: 'rgba(0,0,0,0.06)', padding: '0 4px', borderRadius: '3px' }}>#话题1 #话题2</code> 套用全部
          </div>
        ) : (
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', fontSize: '12px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>📊 解析预览</span>
              <span style={{ color: 'var(--text-sub)' }}>共 <b style={{ color: '#6366f1' }}>{list.length}</b> 条</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {ordered > 0 && <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>🔥 出单 {ordered}</span>}
              {used > 0 && <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', fontWeight: 600 }}>✓ 用过 {used}</span>}
              {ordered === 0 && used === 0 && <span style={{ color: 'var(--gray-400)' }}>未标记状态</span>}
              <div style={{ fontSize: '11px', color: 'var(--primary)', marginBottom: '6px' }}>🏷️ 将自动添加话题：{(product.topics && product.topics.length ? product.topics : DEFAULT_IMPORT_TOPICS).map(t => t.replace(/^#/, '')).join(' ')}</div>
            </div>
            {list.map((item, i) => (
              <div key={i} style={{
                padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.6)',
                fontSize: '11px', color: 'var(--text-main)', display: 'flex', gap: '6px', alignItems: 'flex-start',
                borderLeft: `3px solid ${item.hasOrder ? '#dc2626' : item.used ? '#16a34a' : '#d1d5db'}`, marginBottom: '4px',
              }}>
                <span style={{ color: '#9ca3af', flexShrink: 0 }}>#{i + 1}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.content.slice(0, 80)}{item.content.length > 80 ? '…' : ''}
                </span>
                <span style={{ flexShrink: 0 }}>
                  {item.hasOrder && <span style={{ padding: '1px 4px', borderRadius: '3px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '10px' }}>🔥</span>}
                  {item.used && <span style={{ padding: '1px 4px', borderRadius: '3px', background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: '10px' }}>✓</span>}
                </span>
              </div>
            ))}
          </div>
        )}
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
        <button style={{ ...btnPrimary, flex: 2 }} onClick={handleImport} disabled={list.length === 0}>导入 {list.length > 0 ? `${list.length} 条` : ''}</button>
      </div>
    </div>
  )
}
