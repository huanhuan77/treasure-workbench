import { useState, useMemo, useRef } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'
import { formatDate, todayStr, deadlineDesc, addDays } from '../utils/helpers'

// 样品状态（去掉投流/出单后改为手动选择）
const STATUS = {
  unpublished: { label: '未发布', emoji: '⚪️', color: '#64748b', bg: 'rgba(100,116,139,0.14)', stripe: '#cbd5e1' },
  published:    { label: '已发布', emoji: '🟢', color: '#059669', bg: 'rgba(16,185,129,0.14)', stripe: '#34d399' },
  hit:          { label: '爆单', emoji: '🔥', color: '#e11d48', bg: 'rgba(244,63,94,0.13)', stripe: '#fb7185' },
  abandoned:    { label: '放弃', emoji: '🚫', color: '#94a3b8', bg: 'rgba(148,163,184,0.16)', stripe: '#94a3b8' },
}
const STATUS_ORDER = ['hit', 'published', 'unpublished', 'abandoned']
const STATUS_LIST = STATUS_ORDER.map((k) => ({ key: k, ...STATUS[k] }))

const ACCOUNTS = ['大号', '小号', '小小号']
const ACCOUNT_NICK = { '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }
const ACCOUNT_COLOR = {
  '大号': { c: '#c2410c', bg: 'rgba(251,146,60,0.16)' },
  '小号': { c: '#1d4ed8', bg: 'rgba(59,130,246,0.16)' },
  '小小号': { c: '#7e22ce', bg: 'rgba(168,85,247,0.16)' },
}

function acctChipStyle(active, label, color, bg) {
  return {
    padding: '6px 13px', borderRadius: '18px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
    background: active ? color : 'rgba(255,255,255,0.45)',
    color: active ? '#fff' : 'var(--text-sub)',
    border: active ? 'none' : '1px solid rgba(255,255,255,0.5)',
  }
}

// 排序：按状态优先级，同状态按收货时间倒序、再按名称
function sortSamples(samples) {
  return [...samples].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a.status)
    const ib = STATUS_ORDER.indexOf(b.status)
    if (ia !== ib) return ia - ib
    const ra = a.receiveDate || ''
    const rb = b.receiveDate || ''
    if (ra !== rb) return rb.localeCompare(ra)
    return (a.name || '').localeCompare(b.name || '')
  })
}

export function SamplesPage() {
  const { samples, addSample, deleteSample, updateSample } = useStore()
  const { show } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('大号')
  const [searchKeyword, setSearchKeyword] = useState('')

  const sorted = useMemo(() => sortSamples(samples), [samples])
  const filtered = useMemo(() => {
    if (filter === 'all') return sorted
    return sorted.filter((s) => s.status === filter)
  }, [sorted, filter])
  const accountFiltered = useMemo(() => {
    let r = filtered
    if (accountFilter !== 'all') r = r.filter((s) => s.account === accountFilter)
    if (searchKeyword.trim()) r = r.filter((s) => s.name.toLowerCase().includes(searchKeyword.trim().toLowerCase()))
    return r
  }, [filtered, accountFilter, searchKeyword])

  const acctStats = useMemo(() => {
    const stats = {}
    for (const a of ACCOUNTS) stats[a] = samples.filter((s) => s.account === a).length
    return stats
  }, [samples])

  const statusStats = useMemo(() => {
    const stats = {}
    for (const k of STATUS_ORDER) stats[k] = 0
    // 只统计当前所选账号的数据
    const ss = accountFilter === 'all' ? samples : samples.filter((s) => s.account === accountFilter)
    ss.forEach((s) => { if (STATUS[s.status]) stats[s.status]++ })
    return stats
  }, [samples, accountFilter])

  const total = samples.length

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
      setShowAdd(true)
    }
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(20px + var(--safe-top)) 20px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>样品记录</h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
          共 {accountFilter === 'all' ? total : acctStats[accountFilter] || 0} 个样品
          {' · '}{STATUS_LIST.filter((s) => statusStats[s.key] > 0).map((s) => `${s.emoji}${statusStats[s.key]}`).join('  ')}
        </p>
      </header>

      {/* 状态筛选 */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 16px 6px', overflowX: 'auto' }}>
        {[{ key: 'all', label: '全部', emoji: '📋' }, ...STATUS_LIST].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 13px', borderRadius: '18px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
              background: f.key === 'all' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : (filter === f.key ? STATUS[f.key].color : 'rgba(255,255,255,0.5)'),
              color: filter === f.key ? '#fff' : 'var(--text-sub)',
              border: filter === f.key ? 'none' : '1px solid rgba(255,255,255,0.6)',
              boxShadow: filter === f.key ? '0 4px 12px rgba(244,114,182,0.25)' : 'none',
            }}
          >{f.emoji} {f.label}{f.key !== 'all' ? ` ${statusStats[f.key] || 0}` : ` ${total}`}</button>
        ))}
      </div>

      {/* 账号筛选 */}
      <div style={{ display: 'flex', gap: '8px', padding: '6px 16px 12px', overflowX: 'auto' }}>
        <button onClick={() => setAccountFilter('all')} style={acctChipStyle(accountFilter === 'all', '全部', '#ec4899', 'rgba(244,114,182,0.16)')}>全部 {total}</button>
        {ACCOUNTS.map((a) => {
          const col = ACCOUNT_COLOR[a]
          return (
            <button key={a} onClick={() => setAccountFilter(a)} style={acctChipStyle(accountFilter === a, ACCOUNT_NICK[a], col.c, col.bg)}>
              {ACCOUNT_NICK[a]} {acctStats[a] || 0}
            </button>
          )
        })}
      </div>

      {/* 搜索 */}
      <div style={{ padding: '0 16px 10px' }}>
        <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="🔍 搜索产品名称…"
          style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px', borderRadius:'14px',
            border:'1px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.45)',
            fontSize:'13px', outline:'none', fontFamily:'inherit', color:'var(--text-main)' }}
        />
      </div>

      <div style={{ padding: '4px 16px calc(90px + var(--safe-bottom, 0px))' }}>
        {accountFiltered.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏷️</div>
            <p style={{ fontSize: '14px', margin: 0 }}>暂无样品记录</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {accountFiltered.map((s) => {
              const st = STATUS[s.status] || STATUS.unpublished
              const dl = deadlineDesc(s.deadline)
              const dlColor = dl && dl.includes('过期') ? '#fb7185' : dl && dl.includes('今天') ? '#fb923c' : 'var(--text-sub)'
              const ac = ACCOUNT_COLOR[s.account] || { c: '#8b6f7a', bg: 'rgba(255,255,255,0.5)' }
              return (
                <div key={s.id} style={{ ...glassStyle, padding: '12px 14px 10px 14px', position: 'relative', borderLeft: `3px solid ${st.stripe}` }}>
                  {/* 第一行：产品名 + 账号 + 状态徽章 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto', minWidth: '40px' }}>{s.name}</h3>
                      {s.account && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: ac.bg, color: ac.c, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{ACCOUNT_NICK[s.account]}</span>}
                    </div>
                    <span style={{ fontSize: '11px', color: '#fff', background: st.color, padding: '2px 8px', borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{st.label}</span>
                  </div>
                  {/* 第二行：日期 + 编辑 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--text-sub)' }}>
                    {s.receiveDate && <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>📅{formatDate(s.receiveDate)}</span>}
                    {s.deadline && s.status === 'unpublished' && <span style={{ color: dlColor, whiteSpace: 'nowrap', flexShrink: 0 }}>⏰{formatDate(s.deadline)}{dl ? ` ${dl}` : ''}</span>}
                    <button onClick={() => setEditing(s)} style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '11px', fontWeight: 500, background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>编辑</button>
                  </div>

                  {/* 备注（可选） */}
                  {s.remark && (
                    <div style={{ fontSize: '12px', color: 'var(--text-main)', background: 'rgba(255,255,255,0.55)', padding: '6px 10px', borderRadius: '8px', lineHeight: 1.45, marginTop: '6px', border: '1px solid rgba(255,255,255,0.5)' }}>
                      {s.remark}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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

function SampleForm({ sample, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    name: sample?.name || '',
    account: sample?.account || '',
    status: sample?.status || 'unpublished',
    receiveDate: sample?.receiveDate || todayStr(),
    deadline: sample?.deadline || (sample ? '' : addDays(todayStr(), 15)),
    remark: sample?.remark || '',
  })
  // 截止时间是否被用户手动改过（未手动改时，随收货时间自动 +15 天）
  const [deadlineTouched, setDeadlineTouched] = useState(!!sample?.deadline)

  const onReceiveChange = (v) => {
    setForm((f) => {
      const next = { ...f, receiveDate: v }
      if (!deadlineTouched && v) next.deadline = addDays(v, 15)
      return next
    })
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={sample ? '编辑样品' : '添加样品'}
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
        <input style={inputStyle} placeholder="样品名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
      </Field>

      <Field label="所属账号">
        <div style={{ position: 'relative' }}>
          <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} style={{
            ...inputStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: '36px',
            color: form.account ? 'var(--text-main)' : 'var(--text-sub)',
          }}>
            <option value="">请选择</option>
            {ACCOUNTS.map((a) => <option key={a} value={a}>{a}（{ACCOUNT_NICK[a]}）</option>)}
          </select>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-sub)', fontSize: '12px' }}>▾</span>
        </div>
      </Field>

      <Field label="状态">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {STATUS_LIST.map((s) => (
            <button
              key={s.key}
              onClick={() => setForm({ ...form, status: s.key })}
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
