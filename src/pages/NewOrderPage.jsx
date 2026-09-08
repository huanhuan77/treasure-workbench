import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, inputStyle } from '../components/Modal'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts, hasAccount } from '../utils/accounts'
import { isSelectableForOrder } from '../utils/publish'

function getDateLabel(dateStr) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const chipBase = {
  padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
  border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
}
const fieldBox = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', padding: '13px 14px', borderRadius: '10px',
  background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
  fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', boxSizing: 'border-box',
}
const qtyBtn = {
  width: '30px', height: '30px', borderRadius: '8px', border: '1.5px solid rgba(0,0,0,0.08)',
  background: '#fff', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', padding: 0,
}

// 新增出单（独立页，支持一次记多个产品，每行独立数量）。整单归属一个账号。
export function NewOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { samples, addOrder } = useStore()
  const { show } = useToast()

  const init = location.state || {}
  const initSample = init.sampleId || ''
  const initAccount = init.account || ''

  const [account, setAccount] = useState(initAccount)              // 整单归属账号（单选）
  const [date, setDate] = useState(init.date || todayStr())         // 出单日期
  const [remark, setRemark] = useState('')                          // 整单备注（选填）
  // 多个产品 + 各自数量（行结构）：{ sampleId, qty }
  const [entries, setEntries] = useState(
    initSample ? [{ sampleId: initSample, qty: '1' }] : [{ sampleId: '', qty: '1' }]
  )
  const [showSamples, setShowSamples] = useState(false)
  const [activeEntryIdx, setActiveEntryIdx] = useState(0)
  const [sampleQuery, setSampleQuery] = useState('')

  // 可选样品：所选账号下「已发布」的样品（规则与旧弹窗一致）
  const candidateSamples = useMemo(() => {
    if (!account) return []
    return (samples || []).filter((sm) => isSelectableForOrder(sm.status) && hasAccount(sm, account))
  }, [samples, account])

  // 按名称模糊匹配；已选样品置顶；过滤掉其它 entry 已选过的（一次出单避免同产品重复行）
  const filteredSamples = useMemo(() => {
    const q = sampleQuery.trim().toLowerCase()
    const usedElsewhere = new Set(entries.map((e, i) => (i === activeEntryIdx ? null : e.sampleId)).filter(Boolean))
    const base = candidateSamples.filter((s) => !usedElsewhere.has(s.id))
    const list = q ? base.filter((s) => (s.name || '').toLowerCase().includes(q)) : base
    return [...list].sort((a, b) => {
      const cur = entries[activeEntryIdx]?.sampleId
      if (a.id === cur) return -1
      if (b.id === cur) return 1
      return 0
    })
  }, [candidateSamples, sampleQuery, entries, activeEntryIdx])

  const closeSamplePicker = () => { setShowSamples(false); setSampleQuery('') }
  const openSamplePicker = (idx) => {
    if (!account) { show('请先选择账号', 'error'); return }
    setActiveEntryIdx(idx)
    setSampleQuery('')
    setShowSamples(true)
  }

  // 切换账号：清掉可能不属于新账号的已选样品行
  const onPickAccount = (a) => {
    setAccount(a)
    setEntries((prev) => prev.map((e) => {
      if (!e.sampleId) return e
      const sm = (samples || []).find((x) => x.id === e.sampleId)
      if (sm && !hasAccount(sm, a)) return { ...e, sampleId: '' }
      return e
    }))
  }

  // 增删改 entry 行
  const addEntry = () => setEntries((prev) => [...prev, { sampleId: '', qty: '1' }])
  const removeEntry = (idx) => setEntries((prev) => prev.filter((_, i) => i !== idx))
  const updateEntry = (idx, patch) => setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  const pickSampleForEntry = (idx, sampleId) => {
    updateEntry(idx, { sampleId })
    closeSamplePicker()
  }

  const chosenSamples = entries.map((e) => (samples || []).find((s) => s.id === e.sampleId) || null)

  const handleSave = () => {
    if (!account) { show('请选择账号', 'error'); return }
    const valid = entries.filter((e) => e.sampleId && Number(e.qty) >= 1)
    if (valid.length === 0) { show('请至少选择 1 个产品并填写数量', 'error'); return }
    for (const e of valid) {
      const sm = (samples || []).find((s) => s.id === e.sampleId)
      addOrder({
        name: (sm?.name || '').trim(),
        date,
        account,
        sampleId: e.sampleId,
        productId: sm?.productId || '',
        qty: Math.max(1, Number(e.qty) || 1),
        remark: remark.trim(),
      })
    }
    show(`已记 ${valid.length} 条出单`, 'success')
    navigate(-1)
  }

  const sectionTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }
  const col = ACCOUNT_COLOR[account] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          记一笔出单{getDateLabel(date) ? `（${getDateLabel(date)}）` : ''}
        </h1>
      </header>

      <div style={{ padding: '12px 16px' }}>
        {/* 出单账号：整单单选 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>出单账号</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
              const selected = account === a
              const c = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
              return (
                <button key={a} onClick={() => onPickAccount(a)} style={{
                  ...chipBase,
                  minWidth: '92px',
                  borderColor: selected ? c.c : 'rgba(0,0,0,0.06)',
                  background: selected ? c.bg : '#fff',
                  color: selected ? c.c : 'var(--text-main)',
                  boxShadow: selected ? `0 4px 14px ${c.c}26` : 'none',
                }}>{a}{selected && <span style={{ color: c.c, fontSize: '12px', fontWeight: 700 }}>✓</span>}</button>
              )
            })}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>整笔出单归属到一个账号，下面所有产品都属于该账号</div>
        </div>

        {/* 出单日期 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>出单日期</div>
          <input
            type="date"
            value={date}
            onChange={(e) => { if (e.target.value) setDate(e.target.value) }}
            style={fieldBox}
          />
        </div>

        {/* 多产品行：每行一个样品 + 各自数量 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>关联产品 & 出单数量（可多选，每产品独立计数）</span>
            <button onClick={addEntry} style={{
              flexShrink: 0, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
              border: '1.5px solid rgba(244,114,182,0.35)', background: '#fff', color: 'var(--primary)', cursor: 'pointer',
            }}>＋ 添加</button>
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>只能选「{account || '所选账号'}」已发布的样品</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {entries.map((e, idx) => {
              const sm = chosenSamples[idx]
              const canDelete = entries.length > 1
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px', padding: '10px 12px',
                }}>
                  {/* 样品名 */}
                  <button onClick={() => openSamplePicker(idx)} style={{
                    flex: 1, minWidth: 0, textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '14px', color: sm ? 'var(--text-main)' : '#9ca3af',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sm ? sm.name : '点击选择产品'}
                  </button>
                  {/* 出单数量 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button type="button" onClick={() => updateEntry(idx, { qty: String(Math.max(1, (Number(e.qty) || 1) - 1)) })} style={qtyBtn}>−</button>
                    <input
                      type="number" min="1" step="1"
                      value={e.qty}
                      onChange={(ev) => {
                        const n = parseInt(ev.target.value, 10)
                        if (Number.isNaN(n) || n < 1) updateEntry(idx, { qty: '' })
                        else updateEntry(idx, { qty: String(n) })
                      }}
                      onBlur={() => { if (Number(e.qty) < 1) updateEntry(idx, { qty: '1' }) }}
                      style={{
                        width: '46px', height: '30px', textAlign: 'center', fontSize: '14px', fontWeight: 700,
                        border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', background: '#fff',
                        color: 'var(--text-main)', boxSizing: 'border-box',
                      }}
                    />
                    <button type="button" onClick={() => updateEntry(idx, { qty: String((Number(e.qty) || 1) + 1) })} style={qtyBtn}>＋</button>
                  </div>
                  {/* 删除该行（仅 1 行时禁用） */}
                  <button
                    onClick={() => canDelete && removeEntry(idx)}
                    disabled={!canDelete}
                    aria-label="删除该产品"
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      border: 'none',
                      background: canDelete ? 'rgba(239,68,68,0.10)' : 'rgba(0,0,0,0.04)',
                      color: canDelete ? '#dc2626' : '#cbd5e1',
                      fontSize: '14px', cursor: canDelete ? 'pointer' : 'not-allowed', flexShrink: 0, padding: 0,
                    }}
                  >×</button>
                </div>
              )
            })}
          </div>
        </div>

        {/* 备注：整单 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>备注（选填）</div>
          <textarea
            placeholder="平台 / 链接 / 说明"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            style={{ ...inputStyle, minHeight: '56px', resize: 'vertical' }}
          />
        </div>
      </div>

      {/* 底部保存 */}
      <div style={{ padding: '12px 16px 24px', display: 'flex', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{
          flex: 1, padding: '14px 0', borderRadius: '12px',
          border: '1.5px solid rgba(0,0,0,0.1)', background: '#f9fafb',
          color: 'var(--text-sub)', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
        }}>取消</button>
        <button onClick={handleSave} style={{
          flex: 2, padding: '14px 0', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
        }}>保存出单记录</button>
      </div>

      {/* 样品选择弹层（仅已发布） */}
      <Modal open={showSamples} onClose={closeSamplePicker} title="选择样品">
        <div style={{ padding: '0 0 10px' }}>
          <input
            autoFocus
            placeholder="搜索样品名称…"
            value={sampleQuery}
            onChange={(e) => setSampleQuery(e.target.value)}
            style={{ ...fieldBox, borderColor: sampleQuery ? 'rgba(244,114,182,0.6)' : 'rgba(0,0,0,0.08)' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '55vh', overflowY: 'auto' }}>
          {candidateSamples.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>该账号下暂无可出单的样品（需已发布）</div>
          ) : filteredSamples.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>没有匹配的样品</div>
          ) : (
            filteredSamples.map((s) => {
              const sel = s.id === entries[activeEntryIdx]?.sampleId
              return (
                <button key={s.id} onClick={() => pickSampleForEntry(activeEntryIdx, s.id)} style={{
                  display: 'flex', alignItems: 'center', width: '100%', gap: '10px',
                  padding: '11px 6px', borderRadius: '8px', border: 'none',
                  background: sel ? 'rgba(22,163,74,0.08)' : 'transparent', color: 'var(--text-main)',
                  textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <span style={{
                    width: '22px', height: '22px', minWidth: '22px', borderRadius: '6px',
                    border: sel ? 'none' : '2px solid #d1d5db',
                    background: sel ? '#16a34a' : 'transparent',
                    color: '#fff', fontSize: '14px', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{sel ? '✓' : ''}</span>
                  <span style={{ flex: 1, fontSize: '15px', fontWeight: sel ? 600 : 500 }}>{s.name}</span>
                  {getAccounts(s).map((a) => <span key={a} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600 }}>{a}</span>)}
                </button>
              )
            })
          )}
        </div>
      </Modal>
    </div>
  )
}
