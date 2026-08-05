import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { inputStyle, btnPrimary, btnGhost } from '../components/Modal'

const STORAGE_KEY = 'reading_growth_v1'

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function NotePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { show } = useToast()
  const data = loadData()
  const item = (data.items || []).find(i => i.id === id)
  const [text, setText] = useState(item?.mynotes || '')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!item) {
    return (
      <div className="app-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-sub)' }}>找不到这条记录</div>
      </div>
    )
  }

  const handleSave = () => {
    const newData = loadData()
    newData.items = newData.items.map(i => i.id === id ? { ...i, mynotes: text.trim() } : i)
    saveData(newData)
    show('笔记已保存', 'success')
    navigate(-1)
  }

  const handleDelete = () => {
    if (!text || !confirm('确定清空笔记吗？')) return
    const newData = loadData()
    newData.items = newData.items.map(i => i.id === id ? { ...i, mynotes: '' } : i)
    saveData(newData)
    setText('')
    show('笔记已清空', 'success')
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(217,119,6,0.1)', color: '#d97706', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>📝 我的笔记</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
        </div>
        {text && (
          <button onClick={handleDelete} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}>清空</button>
        )}
      </div>

      {/* 编辑区 - 占满剩余空间 */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', minHeight: 0 }}>
        {item.note && (
          <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.04)', fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>📖 {item.title}</div>
            <div>{item.note}</div>
            {item.type === '综艺' && item.watchWhere && <div style={{ marginTop: '6px', color: '#6366f1', fontWeight: 600 }}>📍 观看：{item.watchWhere}</div>}
          </div>
        )}

        <textarea
          placeholder={'写点感想…\n\n例如：\n• 这本书/综艺最打动我的观点\n• 学到的思维方式\n• 打算在生活/工作中怎么应用\n• 金句摘抄\n• 还想深入研究的点'}
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
          style={{
            ...inputStyle, flex: 1, resize: 'none',
            lineHeight: 1.7, fontFamily: 'inherit', fontSize: '15px',
            minHeight: '60vh',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-sub)', fontSize: '11px' }}>
          <span>{text.length} 字</span>
          <span>最后修改：{text ? (item.mynotes && text === item.mynotes ? '已保存' : '编辑中…') : '未写笔记'}</span>
        </div>
      </div>

      {/* 底部固定按钮 */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: '12px 16px calc(12px + var(--safe-bottom))',
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', gap: '10px',
      }}>
        <button style={{ ...btnGhost, flex: 1 }} onClick={() => navigate(-1)}>取消</button>
        <button style={{ ...btnPrimary, flex: 2 }} onClick={handleSave}>保存笔记</button>
      </div>
    </div>
  )
}