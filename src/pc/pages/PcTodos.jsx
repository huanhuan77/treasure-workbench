import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { DueTag } from '../../components/DueTag'

// PC 版待办清单。
// 数据与语义照抄手机版 TodoPage：store 的 todos / addTodo / updateTodo / deleteTodo，
// 三种筛选（未完成 / 全部 / 已完成）。
// PC 侧差异：新增改成**列表顶部的内联输入行**（不再弹窗），少一次点击；
// 行用 .pcv-copyitem（已有样式），勾选/删除都在行内。
export function PcTodos() {
  const { todos, addTodo, updateTodo, deleteTodo } = useStore()
  const { show } = useToast()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [filter, setFilter] = useState('undone')
  const [delId, setDelId] = useState(null)

  const undone = (todos || []).filter((t) => t && !t.done).length
  const done = (todos || []).filter((t) => t && t.done).length

  const list = useMemo(() => {
    // 数据自愈：过滤掉空项/非对象，避免脏数据在渲染时崩溃（与手机版一致）
    const arr = (todos || []).filter((t) => t && typeof t === 'object')
    const picked = filter === 'all' ? arr : arr.filter((t) => (filter === 'done' ? t.done : !t.done))
    // 排序与手机版一致：未完成在前 → 有截止日的按日期升序 → 其余按新建倒序
    return [...picked].sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1
      const ad = typeof a.due === 'string' ? a.due : ''
      const bd = typeof b.due === 'string' ? b.due : ''
      if (ad && bd) return ad < bd ? -1 : ad > bd ? 1 : 0
      if (ad) return -1
      if (bd) return 1
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  }, [todos, filter])

  const add = () => {
    if (!title.trim()) { show('请输入待办内容', 'error'); return }
    addTodo({ title, due })
    setTitle('')
    setDue('')
    show('已添加', 'success')
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">待办清单</div>
          <div className="pcv-sub">{undone} 未完成 · {done} 已完成</div>
        </div>
        <div className="pcv-spacer" />
        <div className="pcv-seg">
          <button className={filter === 'undone' ? 'on' : ''} onClick={() => setFilter('undone')}>
            <span>未完成</span><span className="pcv-count">{undone}</span>
          </button>
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            <span>全部</span><span className="pcv-count">{undone + done}</span>
          </button>
          <button className={filter === 'done' ? 'on' : ''} onClick={() => setFilter('done')}>
            <span>已完成</span><span className="pcv-count">{done}</span>
          </button>
        </div>
      </div>

      <div className="pcv-body">
        {/* 新增：内联一行，回车即添加 */}
        <div className="pcv-card" style={{ marginBottom: 14 }}>
          <div className="pcv-card-b" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="pcv-input"
              style={{ flex: 1, minWidth: 240 }}
              placeholder="如：联系品牌方寄样"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            />
            <input
              className="pcv-input"
              type="date"
              style={{ width: 150 }}
              value={due}
              onChange={(e) => setDue(e.target.value)}
              title="截止日期（可不填）"
            />
            <button className="pcv-btn" onClick={add}>添加</button>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="pcv-card">
            <div className="pcv-empty">
              {filter === 'done' ? '还没有已完成的待办' : filter === 'all' ? '还没有待办，在上面加一条' : '没有未完成的待办'}
            </div>
          </div>
        ) : (
          <div className="pcv-card">
            {list.map((t) => (
              <div key={t.id} className="pcv-copyitem" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => updateTodo(t.id, { done: !t.done })}
                  title={t.done ? '标记为未完成' : '标记为已完成'}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
                    border: `1.5px solid ${t.done ? '#10b981' : '#c4b5fd'}`,
                    background: t.done ? '#10b981' : 'transparent',
                    color: '#fff', fontSize: 11, lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{t.done ? '✓' : ''}</button>
                <span style={{
                  flex: 1, minWidth: 0, fontSize: 13,
                  color: t.done ? '#9aa0a9' : '#333a45',
                  textDecoration: t.done ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{typeof t.title === 'string' || typeof t.title === 'number' ? t.title : ''}</span>
                {!t.done && <DueTag due={t.due} />}
                <button className="pcv-x" title="删除" onClick={() => setDelId(t.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { deleteTodo(delId); setDelId(null); show('已删除', 'success') }}
        title="删除待办"
        message="确定删除这条待办吗？"
        confirmText="删除"
        danger
      />
    </>
  )
}
