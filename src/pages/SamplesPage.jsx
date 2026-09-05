import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'
import { formatDate, todayStr, deadlineDesc, addDays } from '../utils/helpers'
import { isAccountsHidden, setAccountsHidden } from '../utils/accountVis'

// 样品状态：已发布拆为「出单 / 未出单」
const STATUS = {
  unpublished:    { label: '未发布',     emoji: '⚪️',  color: '#64748b', bg: 'rgba(100,116,139,0.14)', stripe: '#cbd5e1' },
  published_paid: { label: '已发布·出单', emoji: '🟢💰', color: '#059669', bg: 'rgba(16,185,129,0.14)',  stripe: '#34d399' },
  published_free: { label: '已发布·未出单', emoji: '🟢',  color: '#0d9488', bg: 'rgba(20,184,166,0.14)', stripe: '#2dd4bf' },
  hit:            { label: '🔥爆单',     emoji: '🔥',   color: '#e11d48', bg: 'rgba(244,63,94,0.13)',   stripe: '#fb7185' },
  abandoned:      { label: '放弃',       emoji: '🚫',   color: '#94a3b8', bg: 'rgba(148,163,184,0.16)', stripe: '#94a3b8' },
}
const STATUS_ORDER = ['unpublished', 'hit', 'published_paid', 'published_free', 'abandoned']
const STATUS_LIST = STATUS_ORDER.map((k) => ({ key: k, ...STATUS[k] }))

const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#c2410c', bg: 'rgba(251,146,60,0.16)' },
  '晚梨不吃梨': { c: '#1d4ed8', bg: 'rgba(59,130,246,0.16)' },
  '努力成为富婆': { c: '#7e22ce', bg: 'rgba(168,85,247,0.16)' },
}

// 兼容旧数据：老样品只有 account（字符串），新样品有 accounts（数组）
function getAccounts(s) {
  if (Array.isArray(s?.accounts) && s.accounts.length) return s.accounts
  return s?.account ? [s.account] : []
}

function acctChipStyle(active, label, color) {
  return {
    padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
    background: active ? color : 'rgba(255,255,255,0.45)',
    color: active ? '#fff' : 'var(--text-sub)',
    border: active ? 'none' : '1px solid rgba(255,255,255,0.5)',
  }
}

// 排序方式：custom=默认（可拖动自定义顺序），其余按日期字段排序
// defaultDir：收货日期默认最新在前；截止日期默认最紧急（最早）在前
const SORT_OPTIONS = [
  { key: 'custom', label: '默认' },
  { key: 'receiveDate', label: '收货日期', defaultDir: 'desc' },
  { key: 'deadline', label: '截止日期', defaultDir: 'asc' },
]

export function SamplesPage() {
  const navigate = useNavigate()
  const { samples, addSample, deleteSample, updateSample, reorderSamples } = useStore()
  const { show } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [swipedId, setSwipedId] = useState(null)
  const [filter, setFilter] = useState(() => sessionStorage.getItem('samples_filter') || 'unpublished')
  const [accountFilter, setAccountFilter] = useState(() => {
    const v = sessionStorage.getItem('samples_account') || ''
    const map = { '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }
    return map[v] || v || 'all'
  })
  const [searchKeyword, setSearchKeyword] = useState('')
  // 排序：默认＝自定义顺序（可拖动）；也可按收货日期/截止日期排序
  const [sortKey, setSortKey] = useState('custom')
  const [sortDir, setSortDir] = useState('desc')
  const handleSortClick = (key) => {
    if (key === 'custom') { setSortKey('custom'); setSortDir('desc'); return }
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))  // 再点一次切换升降序
      return
    }
    const opt = SORT_OPTIONS.find((o) => o.key === key)
    setSortKey(key)
    setSortDir(opt?.defaultDir || 'desc')
  }
  const isDateSort = sortKey !== 'custom'
  // 当前排序效果的文字说明（避免 ↓↑ 含义歧义）
  const sortHint = sortKey === 'receiveDate'
    ? (sortDir === 'desc' ? '最新收货在前' : '最早收货在前')
    : (sortDir === 'asc' ? '最紧急在前' : '最晚截止在前')
  // 隐藏样品卡上的账号标签（隐私/展示场景），全局开关持久化到本地
  const [hideAccount, setHideAccount] = useState(isAccountsHidden)
  const toggleHideAccount = () => {
    const next = !hideAccount
    setHideAccount(next)
    setAccountsHidden(next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = displayed.findIndex(s => s.id === active.id)
    const newIndex = displayed.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    reorderSamples(arrayMove(displayed.map(s => s.id), oldIndex, newIndex))
  }

  // 恢复滚动位置和筛选状态（从编辑/新增页返回时）
  useEffect(() => {
    const saved = sessionStorage.getItem('samples_scroll')
    const savedFilter = sessionStorage.getItem('samples_filter')
    const savedAccount = sessionStorage.getItem('samples_account')
    if (saved) {
      sessionStorage.removeItem('samples_scroll')
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved))
      })
    }
    if (savedFilter) {
      sessionStorage.removeItem('samples_filter')
    }
    if (savedAccount) {
      sessionStorage.removeItem('samples_account')
    }
  }, [])

  const sorted = useMemo(() => samples, [samples])
  const filtered = useMemo(() => {
    if (filter === 'all') return sorted
    return sorted.filter((s) => s.status === filter)
  }, [sorted, filter])
  const accountFiltered = useMemo(() => {
    let r = filtered
    if (accountFilter !== 'all') r = r.filter((s) => getAccounts(s).includes(accountFilter))
    if (searchKeyword.trim()) r = r.filter((s) => s.name.toLowerCase().includes(searchKeyword.trim().toLowerCase()))
    return r
  }, [filtered, accountFilter, searchKeyword])

  // 按所选方式排序；custom 时保持 store 顺序（可拖动自定义）
  const displayed = useMemo(() => {
    if (sortKey === 'custom') return accountFiltered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...accountFiltered].sort((a, b) => {
      const va = a[sortKey] || ''
      const vb = b[sortKey] || ''
      if (!va && !vb) return (a.name || '').localeCompare(b.name || '')
      if (!va) return 1   // 缺日期的排最后
      if (!vb) return -1
      return va.localeCompare(vb) * dir
    })
  }, [accountFiltered, sortKey, sortDir])

  const acctStats = useMemo(() => {
    const stats = {}
    for (const a of ACCOUNTS) stats[a] = samples.filter((s) => getAccounts(s).includes(a)).length
    return stats
  }, [samples])

  const statusStats = useMemo(() => {
    const stats = {}
    for (const k of STATUS_ORDER) stats[k] = 0
    // 只统计当前所选账号的数据
    const ss = accountFilter === 'all' ? samples : samples.filter((s) => getAccounts(s).includes(accountFilter))
    ss.forEach((s) => { if (STATUS[s.status]) stats[s.status]++ })
    return stats
  }, [samples, accountFilter])


  // 悬浮+按钮可拖动
  const [fabPos, setFabPos] = useState(() => {
    try { const d = localStorage.getItem('sampleFabPos'); if (d) return JSON.parse(d) } catch(e) {}
    return { x: 0, y: 0 }
  })
  const fabPosRef = useRef(fabPos)
  const fabRef = useRef(null)
  const dragInfo = useRef(null)
  const [fabDragging, setFabDragging] = useState(false)

  const onFabPDown = (e) => {
    e.stopPropagation()
    const r = fabRef.current.getBoundingClientRect()
    dragInfo.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false }
    setFabDragging(true)
  }
  const onFabPMove = (e) => {
    if (!dragInfo.current) return
    const dx = e.clientX - dragInfo.current.sx
    const dy = e.clientY - dragInfo.current.sy
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragInfo.current.moved = true
    const sz = 56
    let x = Math.max(8, Math.min(window.innerWidth - sz - 8, dragInfo.current.ox + dx))
    let y = Math.max(8, Math.min(window.innerHeight - sz - 8, dragInfo.current.oy + dy))
    fabPosRef.current = { x, y }
    setFabPos({ x, y })
  }
  const endFabDrag = (tap) => {
    if (!dragInfo.current) return
    const m = dragInfo.current.moved
    dragInfo.current = null
    setFabDragging(false)
    if (m) {
      try { localStorage.setItem('sampleFabPos', JSON.stringify(fabPosRef.current)) } catch(e) {}
    } else if (tap) {
      sessionStorage.setItem('samples_scroll', String(window.scrollY))
      sessionStorage.setItem('samples_filter', filter)
      sessionStorage.setItem('samples_account', accountFilter)
      navigate('/samples/new', { state: { account: accountFilter } })
    }
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 20px 10px' }}>
        {/* 标题行：左侧标题，右侧搜索 + 隐藏账号按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>样品记录</h1>
          <div style={{ flex: 1 }} />
          <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索产品名称…"
            style={{ width: 'min(52vw, 200px)', boxSizing:'border-box', padding:'6px 12px', borderRadius:'999px',
              border:'1px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.5)',
              fontSize:'13px', outline:'none', fontFamily:'inherit', color:'var(--text-main)',
              marginRight:'2px' }}
          />
          <button onClick={toggleHideAccount} title={hideAccount ? '点击显示账号标签' : '点击隐藏账号标签'} style={{
            padding: '5px 11px', borderRadius: '999px', border: '1px solid rgba(99,102,241,0.35)',
            background: hideAccount ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.5)',
            color: hideAccount ? '#4f46e5' : 'var(--text-sub)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {hideAccount ? '🙈' : '👁'}
          </button>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>
          共 {Object.values(statusStats).reduce((a,b) => a + b, 0)} 个样品
          {' · '}{STATUS_LIST.filter((s) => statusStats[s.key] > 0).map((s) => `${s.emoji}${statusStats[s.key]}`).join('  ')}
        </p>
      </header>

      {/* 账号筛选：第一行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 16px 4px', overflowX: 'auto' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)', flexShrink: 0, opacity: .7 }}>账号</span>
        <button onClick={() => { setAccountFilter('all'); setFilter('unpublished') }} style={acctChipStyle(accountFilter === 'all', '全部', '#ec4899')}>全部 {Object.values(statusStats).reduce((a,b) => a + b, 0)}</button>
        {!hideAccount && ACCOUNTS.map((a) => {
          const col = ACCOUNT_COLOR[a]
          return (
            <button key={a} onClick={() => { setAccountFilter(a); setFilter('unpublished'); sessionStorage.setItem('samples_account', a) }} style={acctChipStyle(accountFilter === a, a, col.c)}>
              {a} {acctStats[a] || 0}
            </button>
          )
        })}
      </div>

      {/* 状态筛选：第二行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 16px 4px', overflowX: 'auto' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)', flexShrink: 0, opacity: .7 }}>状态</span>
        {[{ key: 'all', label: '全部', color: '#ec4899' }, ...STATUS_LIST].map((f) => {
          const active = filter === f.key
          const cnt = f.key === 'all' ? Object.values(statusStats).reduce((a,b) => a + b, 0) : (statusStats[f.key] || 0)
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              background: active ? (f.key === 'all' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : STATUS[f.key].color) : 'rgba(255,255,255,0.5)',
              color: active ? '#fff' : 'var(--text-sub)',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.6)',
              boxShadow: active ? `0 3px 8px ${f.key === 'all' ? '#ec4899' : STATUS[f.key].color}33` : 'none',
            }}>{f.label} {cnt}</button>
          )
        })}
      </div>

      {/* 排序：一行小胶囊 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 16px 2px', overflowX: 'auto' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)', flexShrink: 0, opacity: .7 }}>排序</span>
        {SORT_OPTIONS.map((o) => {
          const active = sortKey === o.key
          return (
            <button key={o.key} onClick={() => handleSortClick(o.key)} style={{
              padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              background: active ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'rgba(255,255,255,0.5)',
              color: active ? '#fff' : 'var(--text-sub)',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.6)',
            }}>
              {o.label}{active && o.key !== 'custom' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
            </button>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-sub)', flexShrink: 0 }}>
          {sortKey === 'custom' ? '按住 ⇕ 拖动排序' : `${sortHint} · 再点切升降`}
        </span>
      </div>

      <div style={{ padding: '4px 16px calc(88px + var(--safe-bottom, 0px))' }}>
        {accountFiltered.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏷️</div>
            <p style={{ fontSize: '14px', margin: 0 }}>暂无样品记录</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayed.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayed.map((s) => {
                  const st = STATUS[s.status] || STATUS.unpublished
                  const dl = deadlineDesc(s.deadline)
                  const dlMatch = dl && dl.match(/(\d+)天/)
                  const dlDays = dlMatch ? parseInt(dlMatch[1], 10) : (dl && dl.includes('今天') ? 0 : null)
                  const dlColor = dl && dl.includes('过期') ? '#ef4444' :
                                  dlDays === 0 ? '#ef4444' :
                                  dlDays !== null && dlDays <= 3 ? '#ef4444' :
                                  dlDays !== null && dlDays <= 7 ? '#ea580c' : 'var(--text-sub)'
                  const acList = getAccounts(s).map(a => ({ name: a, ...(ACCOUNT_COLOR[a] || { c: '#8b6f7a', bg: 'rgba(255,255,255,0.5)' }) }))

                  return <SortableSampleCard key={s.id} s={s} st={st} dl={dl} dlColor={dlColor} acList={acList}
                    swipedId={swipedId} setSwipedId={setSwipedId}
                    hideAccount={hideAccount}
                    dragEnabled={!isDateSort}
                    onEdit={() => {
                      sessionStorage.setItem('samples_scroll', String(window.scrollY))
                      sessionStorage.setItem('samples_filter', filter)
                      sessionStorage.setItem('samples_account', accountFilter)
                      setSwipedId(null)
                      navigate(`/samples/${s.id}/edit`)
                    }}
                    onDelete={() => {
                      setSwipedId(null)
                      if (confirm('删除该样品？')) { deleteSample(s.id); show('已删除', 'success') }
                    }}
                  />
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 添加按钮 — 可拖动悬浮 */}
      <button
        ref={fabRef}
        onPointerDown={onFabPDown}
        onPointerMove={onFabPMove}
        onPointerUp={() => endFabDrag(true)}
        onPointerCancel={() => endFabDrag(true)}
        style={{
          position: 'fixed',
          left: (fabPos.x || window.innerWidth - 76) + 'px',
          top: (fabPos.y || window.innerHeight - 148) + 'px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
          color: '#fff',
          fontSize: '30px',
          fontWeight: 300,
          lineHeight: 1,
          boxShadow: fabDragging ? '0 12px 32px rgba(244,114,182,0.5)' : '0 8px 24px rgba(244,114,182,0.4)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          cursor: fabDragging ? 'grabbing' : 'grab',
          transition: fabDragging ? 'none' : 'box-shadow 0.2s',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >+</button>

      {(showAdd || editing) && (
        <SampleForm
          sample={editing}
          onClose={() => { setShowAdd(false); setEditing(null) }}
          onSave={(data) => {
            if (editing) {
              updateSample(editing.id, data)
              show('已更新', 'success')
            } else {
              addSample(data)
              show('已添加', 'success')
            }
            setShowAdd(false)
            setEditing(null)
          }}
          onDelete={editing ? () => { deleteSample(editing.id); setEditing(null); show('已删除', 'success') } : null}
        />
      )}
    </div>
  )
}

// 可拖拽排序的样品卡片
function SortableSampleCard({ s, st, dl, dlColor, acList, swipedId, setSwipedId, hideAccount, dragEnabled, onEdit, onDelete }) {
  const canDrag = dragEnabled !== false   // 按日期排序时禁止拖动（否则与排序结果冲突）
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id, disabled: !canDrag })
  const isSwiped = swipedId === s.id
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? '0 12px 30px rgba(244,114,182,0.28)' : undefined,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
        {/* 左滑操作按钮 */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '4px' }}>
          <button onClick={onEdit} style={{ width: '72px', height: '80%', border: 'none', background: '#6366f1', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '10px' }}>编辑</button>
          <button onClick={onDelete} style={{ width: '72px', height: '80%', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '10px' }}>删除</button>
        </div>
        {/* 可滑动内容 */}
        <div
          onClick={() => { if (isSwiped) { setSwipedId(null) } }}
          onTouchStart={(e) => { if (e.target.closest('button[aria-label="拖动排序"]')) return; const t = e.touches[0]; e.currentTarget.dataset.swipeStart = `${t.clientX},${t.clientY}`; e.currentTarget.dataset.swiping = 'false' }}
          onTouchMove={(e) => { const t = e.touches[0]; const start = (e.currentTarget.dataset.swipeStart || '').split(',').map(Number); if (!start[0]) return; const dx = t.clientX - start[0]; const dy = t.clientY - start[1]; if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) e.currentTarget.dataset.swiping = 'true' }}
          onTouchEnd={(e) => { if (e.currentTarget.dataset.swiping === 'true') { setSwipedId(prev => prev === s.id ? null : s.id) } }}
          style={{
            ...glassStyle, padding: '12px 14px 10px', borderLeft: `3px solid ${st.stripe}`,
            transition: 'transform 0.2s ease', transform: isSwiped ? 'translateX(-148px)' : 'translateX(0)',
            position: 'relative', zIndex: 1, cursor: 'pointer',
          }}
        >
          {/* ⇕ 拖动按钮（左侧边缘） */}
          <button
            {...(canDrag ? attributes : {})}
            {...(canDrag ? listeners : {})}
            onPointerDown={(e) => { e.stopPropagation(); if (canDrag) listeners?.onPointerDown?.(e) }}
            onTouchStart={(e) => { e.stopPropagation(); if (canDrag) listeners?.onTouchStart?.(e) }}
            aria-label="拖动排序"
            disabled={!canDrag}
            title={canDrag ? '拖动排序' : '按日期排序时不可拖动'}
            style={{
              position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)',
              width: '24px', height: '32px',
              border: 'none', background: 'transparent', color: 'var(--gray-400)',
              fontSize: '20px', lineHeight: 1, cursor: canDrag ? 'grab' : 'default',
              touchAction: canDrag ? 'none' : 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', opacity: canDrag ? 1 : 0.25,
            }}
          >⇕</button>
          {/* 第一行：产品名 + 账号 + 状态 */}
          <div style={{ paddingLeft: '28px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto', minWidth: '40px' }}>{s.name}</h3>
            {acList.length > 0 && (
              hideAccount
                ? <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: 'rgba(148,163,184,0.16)', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>***</span>
                : acList.map((a) => (
                    <span key={a.name} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: a.bg, color: a.c, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{a.name}</span>
                  ))
            )}
            <div style={{ flex: 1 }} />
            {st && <span style={{ fontSize: '11px', color: '#fff', background: st.color, padding: '2px 8px', borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{st.label}</span>}
          </div>
          {/* 第二行：日期 + 截止时间 */}
          <div style={{ paddingLeft: '28px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-sub)' }}>
            {s.receiveDate && <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>📅{formatDate(s.receiveDate)}</span>}
            {s.deadline && s.status === 'unpublished' && <span style={{ color: dlColor, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>⏰{formatDate(s.deadline)}{dl ? ` ${dl}` : ''}</span>}
            {(s.commission || 5) > 5 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: '#fef3c7', color: '#d97706', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>💰佣金{s.commission}%</span>}
          </div>
          {/* 备注 */}
          {s.remark && (
            <div style={{ paddingLeft: '28px', marginTop: '6px', fontSize: '12px', color: 'var(--text-main)' }}>
              {s.remark}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SampleForm({ sample, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    name: sample?.name || '',
    account: sample?.account || (Array.isArray(sample?.accounts) && sample.accounts[0]) || '',
    accounts: Array.isArray(sample?.accounts) && sample.accounts.length ? sample.accounts : (sample?.account ? [sample.account] : []),
    status: sample?.status || 'unpublished',
    receiveDate: sample?.receiveDate || todayStr(),
    deadline: sample?.deadline || (sample ? '' : addDays(todayStr(), 15)),
    remark: sample?.remark || '',
    commission: sample?.commission || 5,
    orderDate: sample?.orderDate || '',
  })
  // 截止时间是否被用户手动改过（未手动改时，随收货时间自动 +15 天）
  const [deadlineTouched, setDeadlineTouched] = useState(!!sample?.deadline)

  const toggleAccountSel = (a) => {
    setForm((f) => ({
      ...f,
      accounts: f.accounts.includes(a) ? f.accounts.filter((x) => x !== a) : [...f.accounts, a],
    }))
  }

  const onReceiveChange = (v) => {
    setForm((f) => {
      const next = { ...f, receiveDate: v }
      if (!deadlineTouched && v) next.deadline = addDays(v, 15)
      return next
    })
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const isOrder = form.status === 'published_paid' || form.status === 'hit'
    const f = { ...form, name: form.name.trim(), account: form.accounts[0] || '', accounts: [...form.accounts] }
    if (!isOrder) f.orderDate = ''
    onSave(f)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={sample ? '编辑样品' : '添加样品'}
      inline
      footer={
        <div style={{ display: 'flex', gap: '10px' }}>
          {onDelete && (
            <button style={{ ...btnGhost, color: '#fb7185', flex: '0 0 auto', width: 'auto', padding: '12px 16px' }} onClick={onDelete}>删除</button>
          )}
          <button style={btnGhost} onClick={onClose}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      }
    >
      <Field label="产品名称" required>
        <input style={inputStyle} placeholder="样品名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>

      <Field label="归属账号（可多选）">
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ACCOUNTS.map((a) => {
            const selected = form.accounts.includes(a)
            return (
              <button key={a} type="button" onClick={() => toggleAccountSel(a)} style={{
                flex: '0 0 auto', minWidth: '92px',
                padding: '10px 14px', borderRadius: '999px',
                border: selected ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
                background: selected ? 'linear-gradient(135deg, #f472b6, #ec4899)' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: selected ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
                textAlign: 'center', minHeight: '40px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: selected ? '#fff' : 'var(--text-main)', whiteSpace: 'nowrap' }}>{a}</span>
                {selected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="佣金（%）">
        <input type="number" value={form.commission === 5 ? '' : form.commission} onChange={(e) => {
          const v = e.target.value === '' ? 5 : parseInt(e.target.value)
          setForm({ ...form, commission: isNaN(v) ? 5 : v })
        }} placeholder="5（默认不显示）"
          style={{ ...inputStyle }} />
      </Field>

      <Field label="状态">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {STATUS_LIST.map((s) => (
            <button
              key={s.key}
              onClick={() => setForm((f) => {
                const order = s.key === 'published_paid' || s.key === 'hit'
                return { ...f, status: s.key, orderDate: order ? f.orderDate : '' }
              })}
              style={{
                padding: '11px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                background: form.status === s.key ? s.color : 'rgba(255,255,255,0.5)',
                color: form.status === s.key ? '#fff' : 'var(--text-sub)',
                border: form.status === s.key ? 'none' : '1px solid rgba(255,255,255,0.6)',
              }}
            >{s.emoji} {s.label.replace('🔥 ', '')}</button>
          ))}
        </div>
      </Field>

      {(form.status === 'published_paid' || form.status === 'hit') && (
        <Field label="出单日期（选填，用于近出单统计）">
          <input type="date" style={inputStyle} value={form.orderDate || ''} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
        </Field>
      )}

      <Field label="收货时间">
        <input type="date" style={inputStyle} value={form.receiveDate} onChange={(e) => onReceiveChange(e.target.value)} />
      </Field>

      <Field label="截止时间（默认收货 +15 天）">
        <input type="date" style={inputStyle} value={form.deadline} onChange={(e) => { setDeadlineTouched(true); setForm({ ...form, deadline: e.target.value }) }} />
      </Field>

      <Field label="备注">
        <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="备注信息" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
      </Field>
    </Modal>
  )
}
