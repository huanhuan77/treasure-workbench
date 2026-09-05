import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'

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
// 佣金(元)估算：按 件数 × 单价? —— 无单价字段，这里佣金% 作为附加信息展示即可，不强行算金额
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', flex: 1 }}>{title}</h1>
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

  const list = useMemo(() => {
    // 排序：无日期的排最后，其余按日期新→旧
    return [...(orders || [])].sort((a, b) => {
      const ta = parseTs(a?.date), tb = parseTs(b?.date)
      if (ta !== null && tb !== null) return tb - ta
      if (ta === null && tb === null) return 0
      return ta === null ? 1 : -1
    })
  }, [orders])

  const filtered = useMemo(
    () => (accountFilter ? list.filter((o) => o.account === accountFilter) : list),
    [list, accountFilter]
  )

  // 汇总：总单数(条)、累计件数、涉及账号
  const summary = useMemo(() => {
    const totalEntries = list.length
    const totalQty = list.reduce((s, o) => s + (Number(o.qty) || 0), 0)
    const perAccount = {}
    for (const a of ACCOUNTS) perAccount[a] = 0
    for (const o of list) { if (perAccount[o.account] !== undefined) perAccount[o.account]++ }
    return { totalEntries, totalQty, perAccount }
  }, [list])

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
    <div className="app-container">
      <PageHeader
        title="出单记录"
        onBack={() => navigate('/')}
        right={
          <button onClick={openAdd} style={{
            padding: '8px 16px', borderRadius: '999px', border: 'none',
            background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(244,114,182,0.3)',
          }}>＋ 记出单</button>
        }
      />

      {/* 顶部汇总 */}
      <div style={{ padding: '12px 16px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>总单数</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#e11d48', lineHeight: 1.2 }}>{summary.totalEntries}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>累计单量</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>{summary.totalQty}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>涉及产品</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', lineHeight: 1.2 }}>{groups.length}</div>
        </div>
      </div>

      {/* 账号筛选 */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setAccountFilter('')} style={{
          padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
          background: accountFilter === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'rgba(255,255,255,0.6)',
          color: accountFilter === '' ? '#fff' : 'var(--text-sub)',
        }}>全部 {summary.totalEntries}</button>
        {ACCOUNTS.map((a) => {
          const col = accMeta(a)
          const sel = accountFilter === a
          return (
            <button key={a} onClick={() => setAccountFilter(a)} style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: sel ? col.c : 'rgba(255,255,255,0.6)',
              color: sel ? '#fff' : col.c,
              boxShadow: sel ? `0 2px 8px ${col.c}55` : 'none',
            }}>{a} {summary.perAccount[a] || 0}</button>
          )
        })}
      </div>

      {/* 视图切换：按品名 / 流水 */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div style={{ display: 'flex', background: 'rgba(244,114,182,0.06)', borderRadius: '10px', padding: '3px' }}>
          {[{ id: 'name', label: '按产品' }, { id: 'list', label: '按时间' }].map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: view === v.id ? '#fff' : 'transparent',
              color: view === v.id ? 'var(--primary)' : 'var(--text-sub)',
              boxShadow: view === v.id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        {filtered.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '60px 24px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <p style={{ fontSize: '15px', margin: 0, color: 'var(--text-main)' }}>{orders.length === 0 ? '还没有出单记录' : '该账号下暂无出单'}</p>
            <p style={{ fontSize: '13px', margin: '6px 0 0' }}>点右上角「＋ 记出单」记下第一笔</p>
          </div>
        ) : view === 'name' ? (
          /* 按产品名分组 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {groups.map((g) => (
              <div key={g.name} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.55)' }}>
                {/* 组头：品名 + 累计 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>累计出单 {g.count} 次 · {g.qty} 单{dispDate(g.latest) && ` · 最近 ${dispDate(g.latest)}`}</div>
                  </div>
                  <span style={{ flexShrink: 0, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: 'rgba(225,29,72,0.10)', color: '#e11d48' }}>{g.qty} 单</span>
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
                        <span style={{ fontSize: '12px', color: 'var(--text-sub)', flexShrink: 0, minWidth: '16px' }}>{dispDate(o.date)}</span>
                        <span style={{ fontSize: '12px', color: o.account ? meta.c : 'var(--text-sub)', flexShrink: 0 }}>{o.account || '未选账号'}</span>
                        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.remark || ''}</span>
                        <span style={{ flexShrink: 0, fontSize: '12px', color: 'var(--text-sub)' }}>{fmtQty(o.qty)}</span>
                        {o.commissionPct > 0 && <span style={{ flexShrink: 0, fontSize: '12px', fontWeight: 600, color: '#059669' }}>{fmtPct(o.commissionPct)}</span>}
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(o) }} style={{ flexShrink: 0, border: 'none', background: 'transparent', color: '#ef4444', fontSize: '14px', lineHeight: 1, cursor: 'pointer', padding: '2px 4px' }}>🗑</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 流水视图：每笔一行 */
          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.55)' }}>
            {filtered.map((o, i) => {
              const meta = accMeta(o.account)
              return (
                <div key={o.id} onClick={() => openEdit(o)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.04)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                      {o.commissionPct > 0 && <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#059669' }}>{fmtPct(o.commissionPct)}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{dispDate(o.date)}</span>
                      {o.account && <span style={{ color: meta.c }}>{o.account}</span>}
                      {o.remark && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{o.remark}</span>}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#e11d48' }}>{fmtQty(o.qty)}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(o) }} style={{ flexShrink: 0, border: 'none', background: 'transparent', color: '#ef4444', fontSize: '14px', lineHeight: 1, cursor: 'pointer', padding: '2px 4px' }}>🗑</button>
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
