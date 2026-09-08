import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, glassStyle } from '../components/Modal'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts, hasAccount } from '../utils/accounts'
import { getExecByAccount } from '../utils/sampleStatus'

function getDateLabel(dateStr) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
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

export function NewPublishRecordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { samples, addPublishRecord } = useStore()
  const { show } = useToast()

  const init = location.state || {}
  const initSample = init.sampleId || ''
  const initAccounts = Array.isArray(init.accounts) && init.accounts.length ? init.accounts : []

  const [publishDate, setPublishDate] = useState(() => init.publishDate || new Date().toISOString().slice(0, 10))
  const [accounts, setAccounts] = useState(initAccounts)        // 发布账号：多选
  // 多个样品 + 各自数量（行结构）：{ sampleId, qty }[]
  const [entries, setEntries] = useState(
    initSample ? [{ sampleId: initSample, qty: '1' }] : []
  )
  const [showSamples, setShowSamples] = useState(false)
  const [activeEntryIdx, setActiveEntryIdx] = useState(0)       // 当前在选的 entry 行
  const [sampleQuery, setSampleQuery] = useState('')            // 样品搜索关键词

  // 可选样品：所选账号中，该账号处于「已拍摄未发布 / 已发布」的样品（按账号独立判断）
  const sampleList = useMemo(() => {
    if (accounts.length === 0) return []
    return (samples || []).filter((s) => {
      const execByAccount = getExecByAccount(s)
      return accounts.some((a) => execByAccount[a] === 'shot' || execByAccount[a] === 'published')
    })
  }, [samples, accounts])
  // 按名称模糊匹配；已选样品在该账号下置顶；过滤掉其它 entry 已经选过的（同一次发布避免重复）
  const filteredSamples = useMemo(() => {
    const q = sampleQuery.trim().toLowerCase()
    const usedElsewhere = new Set(entries.map((e, i) => (i === activeEntryIdx ? null : e.sampleId)).filter(Boolean))
    const base = sampleList.filter((s) => !usedElsewhere.has(s.id))
    const list = q ? base.filter((s) => (s.name || '').toLowerCase().includes(q)) : base
    return [...list].sort((a, b) => {
      const cur = entries[activeEntryIdx]?.sampleId
      if (a.id === cur) return -1
      if (b.id === cur) return 1
      return 0
    })
  }, [sampleList, sampleQuery, entries, activeEntryIdx])

  const closeSamplePicker = () => { setShowSamples(false); setSampleQuery('') }
  const openSamplePicker = (idx) => {
    if (accounts.length === 0) { show('请先选择发布账号', 'error'); return }
    setActiveEntryIdx(idx)
    setShowSamples(true)
  }

  const toggleAccount = (a) => {
    const next = accounts.includes(a) ? accounts.filter((x) => x !== a) : [...accounts, a]
    setAccounts(next)
  }

  // 增删改 entry 行
  const addEntry = () => {
    setEntries((prev) => [...prev, { sampleId: '', qty: '1' }])
  }
  const removeEntry = (idx) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }
  const updateEntry = (idx, patch) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  }
  const pickSampleForEntry = (idx, sampleId) => {
    updateEntry(idx, { sampleId })
    closeSamplePicker()
  }

  const chosenSamples = entries.map((e) => sampleList.find((s) => s.id === e.sampleId) || null)

  const handleSave = () => {
    if (accounts.length === 0) { show('请选择至少一个发布账号', 'error'); return }
    const valid = entries.filter((e) => e.sampleId && (Number(e.qty) >= 1))
    if (valid.length === 0) { show('请至少选择 1 个样品并填写数量', 'error'); return }
    let lastId = null
    for (const e of valid) {
      const sm = sampleList.find((s) => s.id === e.sampleId)
      lastId = addPublishRecord({
        sampleId: e.sampleId,
        productId: sm?.productId || '',
        accounts: [...accounts],
        publishDate,
        qty: Math.max(1, Number(e.qty) || 1),
      })
    }
    show(`已记录 ${valid.length} 条发布`, 'success')
    navigate(-1)
    return lastId
  }

  const sectionTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          记视频发布{getDateLabel(publishDate) ? `（${getDateLabel(publishDate)}）` : ''}
        </h1>
      </header>

      <div style={{ padding: '12px 16px', flex: 1 }}>
        {/* 发布时间：可填过去日期（补记） */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布时间</div>
          <input
            type="date"
            value={publishDate}
            onChange={(e) => { if (e.target.value) setPublishDate(e.target.value) }}
            style={fieldBox}
          />
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{getDateLabel(publishDate)}</div>
        </div>

        {/* 发布账号：多选 chips */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布账号（可多选，自动归属到所选账号下）</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
              const selected = accounts.includes(a)
              const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
              return (
                <button key={a} onClick={() => toggleAccount(a)} style={{
                  ...chipBase,
                  minWidth: '92px',
                  borderColor: selected ? col.c : 'rgba(0,0,0,0.06)',
                  background: selected ? col.bg : '#fff',
                  color: selected ? col.c : 'var(--text-main)',
                  boxShadow: selected ? `0 4px 14px ${col.c}26` : 'none',
                }}>{a}{selected && <span style={{ color: col.c, fontSize: '12px', fontWeight: 700 }}>✓</span>}</button>
              )
            })}
          </div>
        </div>

        {/* 关联样品 + 发布数量：多产品行结构，每行一个样品 + 各自数量 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>关联样品 & 发布数量（可多选产品，每产品独立计数）</span>
            <button onClick={addEntry} style={{
              flexShrink: 0, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
              border: '1.5px solid rgba(244,114,182,0.35)', background: '#fff', color: 'var(--primary)', cursor: 'pointer',
            }}>＋ 添加</button>
          </div>
          {entries.length === 0 && (
            <div style={{ fontSize: '12px', color: '#9ca3af', padding: '12px', textAlign: 'center', background: '#fff', border: '1.5px dashed rgba(0,0,0,0.10)', borderRadius: '10px' }}>
              点上方「＋ 添加」或下方按钮，新增一条「样品+数量」行
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {entries.map((e, idx) => {
              const sm = chosenSamples[idx]
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px', padding: '10px 12px',
                }}>
                  {/* 产品名 */}
                  <button onClick={() => openSamplePicker(idx)} style={{
                    flex: 1, minWidth: 0, textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '14px', color: sm ? 'var(--text-main)' : '#9ca3af',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sm ? sm.name : '点击选择产品'}
                  </button>
                  {/* 发布数量 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button type="button" onClick={() => updateEntry(idx, { qty: String(Math.max(1, (Number(e.qty) || 1) - 1)) })} style={{
                      width: '30px', height: '30px', borderRadius: '8px', border: '1.5px solid rgba(0,0,0,0.08)',
                      background: '#fff', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', padding: 0,
                    }}>−</button>
                    <input
                      type="number"
                      min="1"
                      step="1"
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
                    <button type="button" onClick={() => updateEntry(idx, { qty: String((Number(e.qty) || 1) + 1) })} style={{
                      width: '30px', height: '30px', borderRadius: '8px', border: '1.5px solid rgba(0,0,0,0.08)',
                      background: '#fff', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', padding: 0,
                    }}>＋</button>
                  </div>
                  {/* 删除该行 */}
                  <button onClick={() => removeEntry(idx)} aria-label="删除该产品" style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    border: 'none', background: 'rgba(239,68,68,0.10)', color: '#dc2626',
                    fontSize: '14px', cursor: 'pointer', flexShrink: 0, padding: 0,
                  }}>×</button>
                </div>
              )
            })}
          </div>
          {entries.length === 0 && (
            <button onClick={addEntry} style={{
              width: '100%', marginTop: '10px', padding: '10px',
              border: '1.5px dashed rgba(244,114,182,0.45)', borderRadius: '10px',
              background: 'rgba(244,114,182,0.04)', color: 'var(--primary)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>＋ 添加第一个产品</button>
          )}
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
        }}>保存发布记录</button>
      </div>

      {/* 样品选择弹层（仅未发布/已发布） */}
      <Modal open={showSamples} onClose={closeSamplePicker} title="选择样品">
        {/* 搜索框 */}
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
          {sampleList.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>所选账号下暂无可发布的样品（需未发布 / 已发布）</div>
          ) : filteredSamples.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>没有匹配的样品</div>
          ) : (
            filteredSamples.map((s) => {
              const sel = s.id === entries[activeEntryIdx]?.sampleId
              return (
                <button key={s.id} onClick={() => pickSampleForEntry(activeEntryIdx, s.id)} style={{
                  display: 'flex', alignItems: 'center', width: '100%', gap: '10px',
                  padding: '11px 6px', borderRadius: '8px', border: 'none',
                  background: sel ? 'rgba(244,114,182,0.1)' : 'transparent', color: 'var(--text-main)',
                  textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <span style={{
                    width: '22px', height: '22px', minWidth: '22px', borderRadius: '6px',
                    border: sel ? 'none' : '2px solid #d1d5db',
                    background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
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
