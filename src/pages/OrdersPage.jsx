import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost } from '../components/Modal'

// 归属账号（与样品/收支保持一致）
const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#c2410c', bg: 'rgba(251,146,60,0.16)' },
  '晚梨不吃梨': { c: '#1d4ed8', bg: 'rgba(59,130,246,0.16)' },
  '努力成为富婆': { c: '#7e22ce', bg: 'rgba(168,85,247,0.16)' },
}

// 把 YYYY/MM/DD 或 YYYY-MM-DD 解析成可排序时间戳
function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
// 时间筛选区间：返回 [startTs, endTs)；'all' 返回 null（不过滤）
function rangeBounds(range) {
  const now = new Date()
  if (range === 'today') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return [s, s + 86400000]
  }
  if (range === 'yesterday') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime()
    return [s, s + 86400000]
  }
  if (range === '7d') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime()
    return [s, Date.now() + 86400000] // 含今天
  }
  if (range === '30d') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).getTime()
    return [s, Date.now() + 86400000]
  }
  if (range === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return [s, Date.now() + 86400000]
  }
  return null // all
}
// 统一显示佣金率：X%
const fmtPct = (p) => (p ? `${p}%` : '—')
const fmtQty = (q) => (q && q > 1 ? `${q}单` : '1单')
// 显示日期（可能为空则"未填日期"）
function dispDate(v) {
  if (!v) return '未填日期'
  return String(v).replace(/-/g, '/')
}

function PageHeader({ title, onBack, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f1f5f9', flex: 1 }}>{title}</h1>
      {right}
    </div>
  )
}

// 新增 / 编辑表单（弹窗内）
function OrderFormModal({ open, onClose, editing, onSave }) {
  const [name, setName] = useState(editing?.name || '')
  const [date, setDate] = useState(editing?.date || todayStr())
  const [account, setAccount] = useState(editing?.account || '')
  const [qty, setQty] = useState(editing?.qty ? String(editing.qty) : '1')
  const [commissionPct, setCommissionPct] = useState(editing?.commissionPct ? String(editing.commissionPct) : '')
  const [remark, setRemark] = useState(editing?.remark || '')

  const handleSave = () => {
    if (!name.trim()) { return }
    onSave({
      name: name.trim(),
      date,
      account,
      qty: Number(qty) || 1,
      commissionPct: commissionPct === '' ? 0 : (Number(commissionPct) || 0),
      remark: remark.trim(),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? '编辑出单' : '记一笔出单'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
        <Field label="品名" required>
          <input style={inputStyle} placeholder="哪个产品出单了？" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>

        <Field label="出单日期">
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="账号">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
              const sel = account === a
              return (
                <button key={a} onClick={() => setAccount(a)} style={{
                  padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
                  border: sel ? 'none' : '1px solid rgba(0,0,0,0.08)',
                  background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                  color: sel ? '#fff' : 'var(--text-main)',
                }}>{a}</button>
              )
            })}
          </div>
        </Field>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Field label="件数 / 单量" required>
            <input type="number" min="1" style={inputStyle} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="佣金 %">
            <input type="number" min="0" step="any" style={inputStyle} placeholder="如 10" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
          </Field>
        </div>

        <Field label="备注（选填）">
          <textarea style={{ ...inputStyle, minHeight: '54px', resize: 'vertical' }} placeholder="平台 / 链接 / 说明" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={onClose}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </Modal>
  )
}

export function OrdersPage() {
  const navigate = useNavigate()
  const { orders, addOrder, updateOrder, deleteOrder } = useStore()
  const { show } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)   // null=新增
  const [formSeq, setFormSeq] = useState(0)      // 每次打开自增，作 key 强制重建表单以清空上次输入
  const [accountFilter, setAccountFilter] = useState('')  // ''=全部
  const [view, setView] = useState('name')  // name=按品名分组 | list=流水
  const [range, setRange] = useState('all')  // all/today/yesterday/7d/30d/month

  const list = useMemo(() => {
    // 排序：无日期的排最后，其余按日期新→旧
    return [...(orders || [])].sort((a, b) => {
      const ta = parseTs(a?.date), tb = parseTs(b?.date)
      if (ta !== null && tb !== null) return tb - ta
      if (ta === null && tb === null) return 0
      return ta === null ? 1 : -1
    })
  }, [orders])

  // 按时间筛选 + 账号筛选
  const filtered = useMemo(() => {
    let arr = list
    if (accountFilter) arr = arr.filter((o) => o.account === accountFilter)
    const bounds = rangeBounds(range)
    if (bounds) {
      const [s, e] = bounds
      arr = arr.filter((o) => {
        const t = parseTs(o?.date)
        // 无日期的在非"全部"时不显示，避免归类困难
        return t !== null && t >= s && t < e
      })
    }
    return arr
  }, [list, accountFilter, range])

  // 汇总：跟着 range+accountFilter 走
  const summary = useMemo(() => {
    const totalEntries = filtered.length
    const totalQty = filtered.reduce((s, o) => s + (Number(o.qty) || 0), 0)
    const perAccount = {}
    for (const a of ACCOUNTS) perAccount[a] = 0
    for (const o of filtered) { if (perAccount[o.account] !== undefined) perAccount[o.account]++ }
    return { totalEntries, totalQty, perAccount }
  }, [filtered])

  // 按品名分组（仅当 view==='name' 且未选账号时，按品名看累计；选了账号也按品名看该账号下的）
  const groups = useMemo(() => {
    const map = new Map()  // key: 品名 → entries[]
    for (const o of filtered) {
      const k = o.name || '(未命名)'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(o)
    }
    const arr = []
    for (const [name, entries] of map.entries()) {
      arr.push({
        name,
        entries,
        count: entries.length,
        qty: entries.reduce((s, e) => s + (Number(e.qty) || 0), 0),
        latest: entries.find((e) => e.date)?.date || '',
      })
    }
    // 组按最新出单日期倒序（有日期的优先）
    arr.sort((a, b) => {
      const ta = a.latest ? parseTs(a.latest) : null
      const tb = b.latest ? parseTs(b.latest) : null
      if (ta !== null && tb !== null) return tb - ta
      if (ta === null && tb === null) return a.name.localeCompare(b.name, 'zh')
      return ta === null ? 1 : -1
    })
    return arr
  }, [filtered])

  const openAdd = () => { setEditing(null); setFormSeq((s) => s + 1); setModalOpen(true) }
  const openEdit = (o) => { setEditing(o); setFormSeq((s) => s + 1); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }
  const handleSave = (payload) => {
    if (!payload.name) { show('请填写品名', 'error'); return }
    if (editing) { updateOrder(editing.id, payload); show('已更新', 'success') }
    else { addOrder(payload); show('已记一笔出单', 'success') }
    closeModal()
  }
  const handleDelete = (o) => {
    if (!window.confirm(`删除「${o.name}」这笔出单记录？`)) return
    deleteOrder(o.id)
    show('已删除', 'success')
  }

  // 账号着色
  const accMeta = (a) => ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }

  return (
    <div className="app-container" style={{ background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
      <PageHeader
        title="出单记录"
        onBack={() => navigate('/')}
        right={
          <button onClick={openAdd} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: '#7c3aed', color: '#fff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>＋ 记出单</button>
        }
      />

      {/* 顶部汇总 */}
      <div style={{ padding: '12px 16px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>总单数</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fb7185', lineHeight: 1.2 }}>{summary.totalEntries}</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>累计单量</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>{summary.totalQty}</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>涉及产品</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', lineHeight: 1.2 }}>{groups.length}</div>
        </div>
      </div>

      {/* 时间筛选 tab */}
      <div style={{ padding: '10px 16px 2px', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {[
          { id: 'all', label: '全部' },
          { id: 'today', label: '今天' },
          { id: 'yesterday', label: '昨天' },
          { id: '7d', label: '近7天' },
          { id: '30d', label: '近30天' },
          { id: 'month', label: '本月' },
        ].map((r) => {
          const sel = range === r.id
          return (
            <button key={r.id} onClick={() => setRange(r.id)} style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
              border: sel ? 'none' : '1px solid #334155',
              background: sel ? '#7c3aed' : '#1e293b',
              color: sel ? '#fff' : '#94a3b8', cursor: 'pointer', flexShrink: 0,
            }}>{r.label}</button>
          )
        })}
      </div>

      {/* 账号筛选 */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setAccountFilter('')} style={{
          padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
          border: accountFilter === '' ? 'none' : '1px solid #334155',
          background: accountFilter === '' ? '#7c3aed' : '#1e293b',
          color: accountFilter === '' ? '#fff' : '#94a3b8', cursor: 'pointer',
        }}>全部 {summary.totalEntries}</button>
        {ACCOUNTS.map((a) => {
          const col = accMeta(a)
          const sel = accountFilter === a
          return (
            <button key={a} onClick={() => setAccountFilter(a)} style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
              border: sel ? 'none' : '1px solid #334155',
              background: sel ? col.c : '#1e293b',
              color: sel ? '#fff' : col.c, cursor: 'pointer',
            }}>{a} {summary.perAccount[a] || 0}</button>
          )
        })}
      </div>

      {/* 视图切换：按品名 / 流水 */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div style={{ display: 'flex', background: '#1e293b', borderRadius: '10px', padding: '3px' }}>
          {[{ id: 'name', label: '按产品' }, { id: 'list', label: '按时间' }].map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: view === v.id ? '#7c3aed' : 'transparent',
              color: view === v.id ? '#fff' : '#94a3b8',
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        {filtered.length === 0 ? (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <p style={{ fontSize: '15px', margin: 0, color: '#e2e8f0' }}>
              {orders.length === 0 ? '还没有出单记录' : (accountFilter || range !== 'all' ? '当前筛选下暂无出单' : '该账号下暂无出单')}
            </p>
            <p style={{ fontSize: '13px', margin: '6px 0 0' }}>点右上角「＋ 记出单」记下第一笔</p>
          </div>
        ) : view === 'name' ? (
          /* 按产品名分组 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {groups.map((g) => (
              <div key={g.name} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #334155', background: '#1e293b' }}>
                {/* 组头：品名 + 累计 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>累计出单 {g.count} 次 · {g.qty} 单{dispDate(g.latest) && ` · 最近 ${dispDate(g.latest)}`}</div>
                  </div>
                  <span style={{ flexShrink: 0, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: 'rgba(251,113,133,0.18)', color: '#fb7185' }}>{g.qty} 单</span>
                </div>
                {/* 组内明细 */}
                <div style={{ padding: '0 6px 6px' }}>
                  {g.entries.map((o) => {
                    const meta = accMeta(o.account)
                    return (
                      <div key={o.id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 8px',
                        borderRadius: '10px', cursor: 'pointer',
                      }} onClick={() => openEdit(o)}>
                        <span style={{ flexShrink: 0, width: '9px', height: '9px', borderRadius: '50%', background: meta.c }} />
                        <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0, minWidth: '16px' }}>{dispDate(o.date)}</span>
                        <span style={{ fontSize: '12px', color: o.account ? meta.c : '#94a3b8', flexShrink: 0 }}>{o.account || '未选账号'}</span>
                        <span style={{ flex: 1, fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.remark || ''}</span>
                        <span style={{ flexShrink: 0, fontSize: '12px', color: '#94a3b8' }}>{fmtQty(o.qty)}</span>
                        {o.commissionPct > 0 && <span style={{ flexShrink: 0, fontSize: '12px', fontWeight: 600, color: '#34d399' }}>{fmtPct(o.commissionPct)}</span>}
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(o) }} style={{ flexShrink: 0, border: 'none', background: 'transparent', color: '#f87171', fontSize: '14px', lineHeight: 1, cursor: 'pointer', padding: '2px 4px' }}>🗑</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 流水视图：每笔一行 */
          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #334155', background: '#1e293b' }}>
            {filtered.map((o, i) => {
              const meta = accMeta(o.account)
              return (
                <div key={o.id} onClick={() => openEdit(o)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                      {o.commissionPct > 0 && <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#34d399' }}>{fmtPct(o.commissionPct)}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{dispDate(o.date)}</span>
                      {o.account && <span style={{ color: meta.c }}>{o.account}</span>}
                      {o.remark && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{o.remark}</span>}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#fb7185' }}>{fmtQty(o.qty)}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(o) }} style={{ flexShrink: 0, border: 'none', background: 'transparent', color: '#f87171', fontSize: '14px', lineHeight: 1, cursor: 'pointer', padding: '2px 4px' }}>🗑</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <OrderFormModal key={formSeq} open={modalOpen} onClose={closeModal} editing={editing} onSave={handleSave} />
    </div>
  )
}
