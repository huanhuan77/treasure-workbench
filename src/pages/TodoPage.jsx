import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ConfirmModal, Modal, Field, inputStyle, glassStyle } from '../components/Modal'
import { DueTag } from '../components/DueTag'
import { DraggableFab } from '../components/DraggableFab'

// 待办事项：独立于「每日计划」的待办池，截止日期可有可无

export function TodoPage() {
  const navigate = useNavigate()
  const { todos, addTodo, updateTodo, deleteTodo } = useStore()
  const { show } = useToast()

  const [addOpen, setAddOpen] = useState(false)  // 新增弹窗
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')       // 空 = 不设截止日期
  const [filter, setFilter] = useState('undone')  // undone / all / done
  const [delId, setDelId] = useState(null)

  // 数据自愈：过滤掉数组里的空项/非对象，避免脏数据(如某条为 null)在渲染时崩溃
  const list = (todos || []).filter((t) => t && typeof t === 'object')

  // 未完成在前 → 组内：有截止日的按日期升序在前，无截止日的在后
  const sorted = useMemo(() => {
    return [...list].sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1
      const ad = typeof a.due === 'string' ? a.due : ''
      const bd = typeof b.due === 'string' ? b.due : ''
      if (ad && bd) return ad < bd ? -1 : ad > bd ? 1 : 0
      if (ad) return -1
      if (bd) return 1
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  }, [list])

  const shown = sorted.filter((t) => {
    if (filter === 'undone') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const undoneCount = list.filter((t) => !t.done).length

  const openAdd = () => {
    setTitle('')
    setDue('')
    setAddOpen(true)
  }

  const handleAdd = () => {
    const v = title.trim()
    if (!v) { show('请输入待办内容', 'error'); return }
    addTodo({ title: v, due })
    setAddOpen(false)
    setTitle('')
    setDue('')
    show('已添加待办', 'success')
  }

  const handleToggle = (t) => {
    updateTodo(t.id, { done: !t.done })
  }

  const handleDelete = () => {
    deleteTodo(delId)
    setDelId(null)
    show('已删除', 'success')
  }

  const FILTERS = [
    { key: 'undone', label: `未完成 ${undoneCount}` },
    { key: 'all', label: `全部 ${list.length}` },
    { key: 'done', label: `已完成 ${list.length - undoneCount}` },
  ]

  return (
    <div className="app-container">
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 12px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate(-1)} style={{
          border: 'none', background: 'rgba(236,72,153,0.10)', color: 'var(--primary)',
          width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px',
          cursor: 'pointer', flexShrink: 0,
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            待办清单
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            {undoneCount} 条未完成 · 截止日期可不填
          </p>
        </div>
      </header>

      <div style={{ padding: '8px 16px calc(96px + var(--safe-bottom, 0px))' }}>
        {/* 筛选 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: '6px 14px', borderRadius: '10px', border: '1px solid', fontSize: '12.5px', cursor: 'pointer',
                color: active ? '#fff' : '#6b7280',
                background: active ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                borderColor: active ? 'transparent' : '#e5e7eb',
                fontWeight: active ? 700 : 500,
              }}>{f.label}</button>
            )
          })}
        </div>

        {/* 列表 */}
        {shown.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {filter === 'done' ? '还没有已完成的待办' : list.length === 0 ? '还没有待办，点右下角 ＋ 加一条' : '没有未完成的待办啦'}
            </p>
            {list.length === 0 && (
              <button onClick={openAdd} style={{
                marginTop: '16px', padding: '10px 22px', border: 'none', borderRadius: '12px',
                fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer',
                background: 'linear-gradient(135deg,#f472b6,#ec4899)',
              }}>＋ 新增待办</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shown.map((t) => (
              <div key={t.id} style={{
                background: '#fff', borderRadius: '12px', padding: '11px 12px',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div
                  onClick={() => handleToggle(t)}
                  style={{
                    flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer',
                    border: `2px solid ${t.done ? '#10b981' : '#c4b5fd'}`,
                    background: t.done ? '#10b981' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '12px', fontWeight: 700, lineHeight: 1,
                  }}
                >{t.done ? '✓' : ''}</div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '14.5px', fontWeight: 500, minWidth: 0, flexShrink: 1,
                    color: t.done ? '#94a3b8' : 'var(--text-main)',
                    textDecoration: t.done ? 'line-through' : 'none',
                    wordBreak: 'break-all',
                  }}>{typeof t.title === 'string' || typeof t.title === 'number' ? t.title : ''}</span>
                  {/* 已完成的待办不再显示截止/过期时间 */}
                  {!t.done && <DueTag due={t.due} />}
                </div>
                <button onClick={() => setDelId(t.id)} style={{
                  flexShrink: 0, border: 'none', background: 'rgba(244,63,94,0.10)', color: '#f43f5e',
                  width: '26px', height: '26px', borderRadius: '50%', fontSize: '14px', lineHeight: 1, cursor: 'pointer',
                }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增弹窗 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="新增待办" center>
        <Field label="要做的事">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="如：联系品牌方寄样"
            style={inputStyle}
          />
        </Field>
        <Field label="截止日期（可不填）">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            style={{
              flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
              background: 'rgba(252,231,243,0.6)', color: 'var(--text-sub)', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
            }}
            onClick={() => setAddOpen(false)}
          >取消</button>
          <button
            style={{
              flex: 1, padding: '12px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
              fontSize: '15px', fontWeight: 600, boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
            }}
            onClick={handleAdd}
          >添加</button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={handleDelete}
        title="删除待办"
        message="确定删除这条待办吗？"
        confirmText="删除"
        danger
      />

      <DraggableFab storageKey="todo" onClick={openAdd} round hidden={addOpen}>
        {/* 用 SVG 而非文字「＋」：文字受字体基线影响会偏上，SVG 才是真正的几何居中 */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" style={{ display: 'block' }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </DraggableFab>
    </div>
  )
}
