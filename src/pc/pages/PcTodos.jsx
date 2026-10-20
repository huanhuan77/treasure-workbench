import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const titleRef = useRef(null)
  // 编辑某条待办（内容 + 截止日期），与手机端 TodoPage 的编辑一致
  const [editing, setEditing] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDue, setEditDue] = useState('')

  const openEdit = (t) => {
    setEditing(t)
    setEditTitle(typeof t.title === 'string' || typeof t.title === 'number' ? String(t.title) : '')
    setEditDue(typeof t.due === 'string' ? t.due : '')
  }
  const saveEdit = () => {
    if (!editing) return
    const next = editTitle.trim()
    if (!next) { show('内容不能为空', 'error'); return }
    updateTodo(editing.id, { title: next, due: editDue })
    setEditing(null)
    show('已保存', 'success')
  }

  // 从总览待办卡的「新增」跳过来（/pc/todos?add=1）：自动聚焦顶部输入框，直接开打；
  // 用完清掉参数，刷新不会再抢焦点。
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setFilter('undone')
    titleRef.current?.focus()
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const undone = (todos || []).filter((t) => t && !t.done).length
  const done = (todos || []).filter((t) => t && t.done).length

  const list = useMemo(() => {
    // 数据自愈：过滤掉空项/非对象，避免脏数据在渲染时崩溃（与手机版一致）
    const arr = (todos || []).filter((t) => t && typeof t === 'object')
    const picked = filter === 'all' ? arr : arr.filter((t) => (filter === 'done' ? t.done : !t.done))
    // 排序：**置顶的最前**（用户新增）→ 未完成在前 → 有截止日的按日期升序 → 其余按新建倒序
    return [...picked].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
      if (!!a.done !== !!b.done) return a.done ? 1 : -1
      const ad = typeof a.due === 'string' ? a.due : ''
      const bd = typeof b.due === 'string' ? b.due : ''
      if (ad && bd) return ad < bd ? -1 : ad > bd ? 1 : 0
      if (ad) return -1
      if (bd) return 1
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  }, [todos, filter])

  // 置顶：写 todos[].pinned（随本地存储 + 云同步），置顶的排最前
  const togglePin = (t) => {
    updateTodo(t.id, { pinned: !t.pinned })
    show(!t.pinned ? '已置顶这条待办' : '已取消置顶', 'success')
  }

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
      </div>

      <div className="pcv-body">
        {/* 状态筛选从顶栏挪下来了（用户：「不要放在顶部」）——
            它是「看哪些待办」的列表视图切换，跟列表放一起更顺，
            顶栏只留标题，也不再和右上角的全站云备份按钮挤在一行。
            样式沿用其它页的筛选条（.pcv-accountbar + .pcv-seg）。 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
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
        {/* 新增：内联一行，回车即添加 */}
        <div className="pcv-card" style={{ marginBottom: 14 }}>
          {/* 输入行整体靠左：任务输入框不再 flex:1 铺满整行（用户反馈「输入框太长」），
              固定 420px 上限，日期与按钮紧跟其后 */}
          <div className="pcv-card-b" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              ref={titleRef}
              className="pcv-input"
              style={{ flex: '0 1 420px', minWidth: 220, maxWidth: 420 }}
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
              <div
                key={t.id}
                className="pcv-copyitem"
                // 置顶的左侧加一条粉色竖条 + 淡粉底，长期可见（与文案置顶同一套视觉）
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  ...(t.pinned ? { boxShadow: 'inset 3px 0 0 #b8517f', background: '#fdf9fb' } : null),
                }}
              >
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
                {/* 标题不再 flex:1：否则截止日期被推到整行最右端，一屏宽下要横跨半屏才看得到
                    （用户反馈）。改成「标题 + 日期」紧挨着，剩余空白放到它们后面 */}
                <span style={{
                  flex: '0 1 auto', minWidth: 0, maxWidth: '70%', fontSize: 14,
                  color: t.done ? '#9aa0a9' : '#333a45',
                  textDecoration: t.done ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{typeof t.title === 'string' || typeof t.title === 'number' ? t.title : ''}</span>
                {!t.done && <DueTag due={t.due} />}
                {/* 「编辑 / 删除」紧跟日期靠左（用户反馈：原来被 spacer 顶到整行最右端，
                    一屏宽下要横跨半屏去点）。剩余空白留在按钮后面。
                    再右移 30px（用户要求）：和日期之间留出一点呼吸，不再紧贴着 */}
                {/* 置顶：钉在最前（用户新增功能），已置顶时图标变实心粉色 */}
                <button
                  onClick={() => togglePin(t)}
                  title={t.pinned ? '取消置顶' : '置顶这条待办'}
                  style={{
                    marginLeft: 30, flexShrink: 0, padding: '2px 4px', border: 'none', background: 'transparent',
                    cursor: 'pointer', lineHeight: 0, color: t.pinned ? '#b8517f' : '#c9cdd4',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
                    <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                  </svg>
                </button>
                <button
                  className="pcv-btn-text"
                  style={{ marginLeft: 8, flexShrink: 0 }}
                  title="编辑内容与截止日期"
                  onClick={() => openEdit(t)}
                >编辑</button>
                <button className="pcv-x" title="删除" onClick={() => setDelId(t.id)}>×</button>
                <div style={{ flex: 1 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑待办：内容 + 截止日期 */}
      {editing && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>编辑待办</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              <div className="pcv-field-label">内容</div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                value={editTitle}
                autoFocus
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit() }}
              />
              <div className="pcv-field-label" style={{ marginTop: 14 }}>截止日期</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="pcv-input"
                  type="date"
                  style={{ width: 170 }}
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                />
                {editDue && (
                  <button className="pcv-btn-text" onClick={() => setEditDue('')}>清除日期</button>
                )}
              </div>
            </div>
            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="pcv-btn" style={{ marginLeft: 8 }} onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}

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
