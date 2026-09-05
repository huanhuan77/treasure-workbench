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
import { needPublishReminder, daysSincePublish, lastPublishText } from '../utils/publish'
import { SAMPLE_STATUS, SAMPLE_STATUS_ORDER, SAMPLE_STATUS_LIST } from '../utils/sampleStatus'

// 状态枚举统一从 sampleStatus.js 导入（SAMPLE_STATUS / SAMPLE_STATUS_ORDER / SAMPLE_STATUS_LIST）

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
  const [filter, setFilter] = useState(() => sessionStorage.getItem('samples_filter') || 'un_arrived')
  // 账号选择弹窗
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [accountDraft, setAccountDraft] = useState('all')
  const [accountSearch, setAccountSearch] = useState('')
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
  // 排序已迁移到弹窗内，外部不再需要 sortHint 变量
  // 隐藏样品卡上的账号标签（隐私/展示场景），全局开关持久化到本地
  const [hideAccount, setHideAccount] = useState(isAccountsHidden)
  const toggleHideAccount = () => {
    const next = !hideAccount
    setHideAccount(next)
    setAccountsHidden(next)
  }

  // 补记发布快捷入口：跳到发布记录页并预填样品（及归属账号）
  const handleQuickPublish = (s) => {
    sessionStorage.setItem('samples_scroll', String(window.scrollY))
    sessionStorage.setItem('samples_filter', filter)
    sessionStorage.setItem('samples_account', accountFilter)
    navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })
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

  const statusStats = useMemo(() => {
    const stats = {}
    for (const k of SAMPLE_STATUS_ORDER) stats[k] = 0
    // 只统计当前所选账号的数据
    const ss = accountFilter === 'all' ? samples : samples.filter((s) => getAccounts(s).includes(accountFilter))
    ss.forEach((s) => { if (SAMPLE_STATUS[s.status]) stats[s.status]++ })
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
        {/* 第一行：标题 + 搜索框 + 隐藏账号（搜索框旁边） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>样品记录</h1>
          <div style={{ flex: 1 }} />
          <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索产品名称…"
            style={{ width: 'min(42vw, 180px)', boxSizing:'border-box', padding:'6px 12px', borderRadius:'999px',
              border:'1px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.5)',
              fontSize:'13px', outline:'none', fontFamily:'inherit', color:'var(--text-main)' }}
          />
          <button onClick={toggleHideAccount} title={hideAccount ? '点击显示账号标签' : '点击隐藏账号标签'} style={{
            padding: '5px 11px', borderRadius: '999px', border: '1px solid rgba(99,102,241,0.35)',
            background: hideAccount ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.5)',
            color: hideAccount ? '#4f46e5' : 'var(--text-sub)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {hideAccount ? '🙈 隐藏' : '👁 显示'}
          </button>
        </div>
        {/* 第二行：全部账号 + 排序方式 同一行横滚 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', overflowX: 'auto' }}>
          <button onClick={() => { setAccountDraft(accountFilter); setAccountSearch(''); setAccountModalOpen(true) }} title="选择账号" style={{
            padding: '5px 13px', borderRadius: '999px',
            border: '1px solid rgba(244,114,182,0.35)',
            background: accountFilter === 'all' ? 'rgba(255,255,255,0.5)' : 'rgba(244,114,182,0.12)',
            color: accountFilter === 'all' ? 'var(--text-sub)' : '#ec4899',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
          }}>
            <span style={{ fontSize: '11px' }}>👤</span>
            <span>{accountFilter === 'all' ? '全部账号' : accountFilter}</span>
            <span style={{ fontSize: '9px', opacity: .7 }}>▾</span>
          </button>
          {SORT_OPTIONS.map((o) => {
            const active = sortKey === o.key
            const dateActive = active && o.key !== 'custom'
            return (
              <button key={o.key} onClick={() => handleSortClick(o.key)} style={{
                flex: '0 0 auto', padding: '5px 12px', borderRadius: '999px',
                border: active ? '1.5px solid var(--primary)' : '1px solid rgba(244,114,182,0.3)',
                background: active ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'rgba(255,255,255,0.5)',
                color: active ? '#fff' : 'var(--text-sub)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0,
              }}>
                <span>{o.label}</span>
                {dateActive && <span style={{ fontSize: '10px', opacity: .9 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </button>
            )
          })}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>
          共 {Object.values(statusStats).reduce((a,b) => a + b, 0)} 个样品
          {' · '}{SAMPLE_STATUS_LIST.filter((s) => statusStats[s.key] > 0).map((s) => `${s.icon}${statusStats[s.key]}`).join('  ')}
        </p>
      </header>

      {/* 状态分组卡：一排横滚，每张显示该状态汇总（点选切换 filter） */}
      <div style={{ display: 'flex', gap: '8px', padding: '2px 16px 6px', overflowX: 'auto' }}>
        {SAMPLE_STATUS_LIST.map((f) => {
          const cnt = statusStats[f.key] || 0
          const active = filter === f.key
          // 底部说明按状态语义
          const hint = {
            un_arrived: '还在路上',
            arrived: '已到货·未拍摄',
            shot: '已拍·待发',
            published: '已发视频',
            abandoned: '已放弃',
          }[f.key] || ''
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flex: '0 0 auto', minWidth: '124px',
                padding: '10px 12px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                background: 'rgba(255,255,255,0.65)',
                border: active ? `1.5px solid ${f.color}` : '1px solid rgba(255,255,255,0.7)',
                boxShadow: active ? `0 4px 12px ${f.color}26` : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}>{f.icon} {f.label}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{cnt}</div>
              <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-sub)' }}>{hint}</div>
            </button>
          )
        })}
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
                  const st = SAMPLE_STATUS[s.status] || SAMPLE_STATUS.un_arrived
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
                    onQuickPublish={handleQuickPublish}
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

      {/* 排序方式已外置为头部第三行常显 chips（见 header） */}

      {/* 账号选择弹窗（仿抖音选号样式：标题居中+取消/确定+搜索框+单选列表） */}
      <Modal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} title="账号">
        <div style={{ margin: '-8px -22px 0' }}>
          {/* 列表 */}
          <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            {[{ key: 'all', name: '全部账号', color: '#ec4899', initial: '全' },
              ...ACCOUNTS.map((a) => ({ key: a, name: a, color: ACCOUNT_COLOR[a].c, initial: a.slice(0, 1) }))]
              .map((o, idx, arr) => (
                <button key={o.key} onClick={() => setAccountDraft(o.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 22px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                  borderTop: idx > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                }}>
                  <span style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: o.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 700,
                  }}>{o.initial}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {o.name}
                      {o.key !== 'all' && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(124,58,237,0.12)', color: '#7c3aed', fontWeight: 700 }}>LV1</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      {o.key === 'all' ? `共 ${Object.values(statusStats).reduce((a, b) => a + b, 0)} 个样品` : `共 ${(samples || []).filter((s) => getAccounts(s).includes(o.key)).length} 个样品`}
                    </div>
                  </div>
                  {/* 右侧圆圈单选 */}
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    border: accountDraft === o.key ? `6px solid ${o.color}` : '2px solid #d1d5db',
                    boxSizing: 'border-box',
                    transition: 'border 0.15s',
                  }} />
                </button>
              ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', padding: '12px 22px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={() => setAccountModalOpen(false)} style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              background: 'rgba(0,0,0,0.04)', color: 'var(--text-sub)', border: 'none',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>取消</button>
            <button onClick={() => {
              setAccountFilter(accountDraft)
              setFilter('un_arrived')
              sessionStorage.setItem('samples_account', accountDraft)
              setAccountModalOpen(false)
            }} style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
            }}>确定</button>
          </div>
        </div>
      </Modal>

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
              const n = (Array.isArray(data.accounts) ? data.accounts : []).filter(Boolean).length
              show(n > 1 ? `已按 ${n} 个账号拆分为 ${n} 条样品` : '已添加', 'success')
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
function SortableSampleCard({ s, st, dl, dlColor, acList, swipedId, setSwipedId, hideAccount, dragEnabled, onEdit, onDelete, onQuickPublish }) {
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
            {s.deadline && (s.status === 'un_arrived' || s.status === 'arrived') && <span style={{ color: dlColor, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>⏰{formatDate(s.deadline)}{dl ? ` ${dl}` : ''}</span>}
            {(s.commission || 5) > 5 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: '#fef3c7', color: '#d97706', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>💰佣金{s.commission}%</span>}
          </div>
          {/* 备注 */}
          {s.remark && (
            <div style={{ paddingLeft: '28px', marginTop: '6px', fontSize: '12px', color: 'var(--text-main)' }}>
              {s.remark}
            </div>
          )}
          {/* 发布信息 / N天未发提醒 / 补记发布快捷入口 */}
          {(s.publishCount > 0 || needPublishReminder(s)) && (
            <div style={{ paddingLeft: '28px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {s.publishCount > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-sub)', whiteSpace: 'nowrap', flexShrink: 0 }}>📹 已发 {s.publishCount} 次 · {lastPublishText(s)}</span>
              )}
              {needPublishReminder(s) && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>⚠ {daysSincePublish(s) === Infinity ? '从未发布' : `${daysSincePublish(s)}天未发`}</span>
              )}
              {needPublishReminder(s) && (
                <button onClick={(e) => { e.stopPropagation(); onQuickPublish && onQuickPublish(s) }} style={{
                  fontSize: '11px', fontWeight: 700, color: '#fff', background: '#ec4899', border: 'none',
                  padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}>补记发布</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SampleForm({ sample, onClose, onSave, onDelete }) {
  const { products } = useStore()
  const [form, setForm] = useState({
    name: sample?.name || '',
    account: sample?.account || (Array.isArray(sample?.accounts) && sample.accounts[0]) || '',
    accounts: Array.isArray(sample?.accounts) && sample.accounts.length ? sample.accounts : (sample?.account ? [sample.account] : []),
    status: sample?.status || 'un_arrived',
    receiveDate: sample?.receiveDate || todayStr(),
    deadline: sample?.deadline || (sample ? '' : addDays(todayStr(), 15)),
    remark: sample?.remark || '',
    commission: sample?.commission || 5,
    orderDate: sample?.orderDate || '',
    productId: sample?.productId || '',
    isArrived: sample?.isArrived ?? false,
  })
  // 截止时间是否被用户手动改过（未手动改时，随收货时间自动 +15 天）
  const [deadlineTouched, setDeadlineTouched] = useState(!!sample?.deadline)

  // 新建时：多选账号=拆分成多条样品；编辑时：只能改这一条的归属（单选）
  const toggleAccountSel = (a) => {
    setForm((f) => {
      if (sample) return { ...f, accounts: f.accounts[0] === a ? [] : [a] }
      return { ...f, accounts: f.accounts.includes(a) ? f.accounts.filter((x) => x !== a) : [...f.accounts, a] }
    })
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
    const isOrder = form.status === 'published'
    const f = { ...form, name: form.name.trim(), account: form.accounts[0] || '', accounts: [...form.accounts] }
    if (!isOrder) f.orderDate = ''
    onSave(f)
  }

  const productOptions = (products || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))

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

      <Field label={sample ? '归属账号（单条样品仅归属 1 个账号）' : '归属账号（可多选，选几个账号就生成几条样品）'}>
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
        {!sample && form.accounts.length > 1 && (
          <div style={{
            marginTop: '8px', fontSize: '12px', lineHeight: 1.5, fontWeight: 600, color: '#be185d',
            background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)',
            borderRadius: '10px', padding: '8px 10px',
          }}>
            将拆分为 <b>{form.accounts.length}</b> 条样品（{form.accounts.join(' / ')}），各账号的发布条数与出单独立统计、互不干扰。
          </div>
        )}
      </Field>

      <Field label="关联产品（选填）">
        <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} style={{ ...inputStyle, appearance: 'none', backgroundImage: 'none' }}>
          <option value="">未关联</option>
          {productOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
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
          {SAMPLE_STATUS_LIST.map((s) => (
            <button
              key={s.key}
              onClick={() => setForm((f) => {
                const order = s.key === 'published'
                return { ...f, status: s.key, orderDate: order ? f.orderDate : '' }
              })}
              style={{
                padding: '11px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                background: form.status === s.key ? s.color : 'rgba(255,255,255,0.5)',
                color: form.status === s.key ? '#fff' : 'var(--text-sub)',
                border: form.status === s.key ? 'none' : '1px solid rgba(255,255,255,0.6)',
              }}
            >{s.icon} {s.label.replace('🔥 ', '')}</button>
          ))}
        </div>
      </Field>

      {(form.status === 'published') && (
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
