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
  // 预选账号：优先显式传的 account；兼容旧入口只传 accounts 数组（取第一个）
  const initAccount = init.account || (Array.isArray(init.accounts) && init.accounts.length ? init.accounts[0] : '') || ''

  const [publishDate, setPublishDate] = useState(() => init.publishDate || new Date().toISOString().slice(0, 10))
  const [account, setAccount] = useState(initAccount)           // 发布账号：单选
  // 多个样品 + 各自数量（行结构）：{ sampleId, qty }[]
  // 至少预置 1 行（从 SamplesPage 带入 initSample 也算 1 行），空状态对用户不可见
  const [entries, setEntries] = useState(
    initSample ? [{ sampleId: initSample, qty: '1' }] : [{ sampleId: '', qty: '1' }]
  )
  const [showSamples, setShowSamples] = useState(false)
  const [activeEntryIdx, setActiveEntryIdx] = useState(0)       // 当前在选的 entry 行
  const [sampleQuery, setSampleQuery] = useState('')            // 样品搜索关键词
  const [pickedIds, setPickedIds] = useState(() => new Set())   // 弹窗内多选样品 id 临时集合

  // 可选样品：所选账号中，该账号处于「已拍摄未发布 / 已发布」的样品（按账号独立判断）
  const sampleList = useMemo(() => {
    if (!account) return []
    return (samples || []).filter((s) => {
      const execByAccount = getExecByAccount(s)
      return execByAccount[account] === 'shot' || execByAccount[account] === 'published'
    })
  }, [samples, account])
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

  const closeSamplePicker = () => { setShowSamples(false); setSampleQuery(''); setPickedIds(new Set()) }
  const openSamplePicker = (idx) => {
    if (!account) { show('请先选择发布账号', 'error'); return }
    setActiveEntryIdx(idx)
    setSampleQuery('')
    // 打开时预勾当前行已选样品
    setPickedIds(new Set([entries[idx]?.sampleId].filter(Boolean)))
    setShowSamples(true)
  }
  const togglePicked = (id) => {
    setPickedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  // 弹窗多选确认：按列表显示顺序写出多行；保留锚点之前的行；锚点之后剔除被多选包含的
  const confirmMultiPick = () => {
    if (pickedIds.size === 0) { closeSamplePicker(); return }
    const pickedArr = filteredSamples.filter((s) => pickedIds.has(s.id)).map((s) => s.id)
    if (pickedArr.length === 0) { closeSamplePicker(); return }
    setEntries((prev) => {
      const idx = Math.min(activeEntryIdx, prev.length)
      const before = prev.slice(0, idx)
      const after = prev.slice(idx + 1).filter((e) => !pickedIds.has(e.sampleId))
      return [
        ...before,
        ...pickedArr.map((id) => ({ sampleId: id, qty: '1' })),
        ...after,
      ]
    })
    closeSamplePicker()
  }

  // 切换账号：单选；清掉可能不属于新账号的已选样品行
  const onPickAccount = (a) => {
    setAccount(a)
    setEntries((prev) => prev.map((e) => {
      if (!e.sampleId) return e
      const sm = (samples || []).find((x) => x.id === e.sampleId)
      const exec = sm ? getExecByAccount(sm) : {}
      if (sm && exec[a] !== 'shot' && exec[a] !== 'published') return { ...e, sampleId: '' }
      return e
    }))
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

  const chosenSamples = entries.map((e) => sampleList.find((s) => s.id === e.sampleId) || null)

  const handleSave = () => {
    if (!account) { show('请选择一个发布账号', 'error'); return }
    const valid = entries.filter((e) => e.sampleId && (Number(e.qty) >= 1))
    if (valid.length === 0) { show('请至少选择 1 个样品并填写数量', 'error'); return }
    let lastId = null
    for (const e of valid) {
      const sm = sampleList.find((s) => s.id === e.sampleId)
      lastId = addPublishRecord({
        sampleId: e.sampleId,
        productId: sm?.productId || '',
        accounts: account ? [account] : [],
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
    <div className="app-container">
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

      <div style={{ padding: '12px 16px' }}>
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

        {/* 发布账号：单选 chip（整单归属一个账号） */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布账号</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
              const selected = account === a
              const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
              return (
                <button key={a} onClick={() => onPickAccount(a)} style={{
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
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>整次发布归属到一个账号，下面所有产品都属于该账号</div>
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
              const canDelete = entries.length > 1
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
                  {/* 删除该行（仅 1 行时禁用，保证始终至少 1 行可见） */}
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

      {/* 样品选择弹层（仅未发布/已发布），弹窗内多选 */}
      <Modal
        open={showSamples}
        onClose={closeSamplePicker}
        title="选择样品"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={closeSamplePicker}
              style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
                background: 'rgba(252, 231, 243, 0.6)', color: 'var(--text-sub)',
                fontSize: '15px', fontWeight: 500, cursor: 'pointer',
              }}
            >取消</button>
            <button
              type="button"
              onClick={confirmMultiPick}
              disabled={pickedIds.size === 0}
              style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
                background: pickedIds.size === 0
                  ? 'rgba(244,114,182,0.25)'
                  : 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: pickedIds.size === 0 ? 'not-allowed' : 'pointer',
                boxShadow: pickedIds.size === 0 ? 'none' : '0 4px 14px rgba(244,114,182,0.3)',
              }}
            >确定{pickedIds.size > 0 ? ` · 已选 ${pickedIds.size}` : ''}</button>
          </div>
        }
      >
        {/* 搜索框 */}
        <div style={{ padding: '0 0 10px' }}>
          <input
            autoFocus
            placeholder="搜索样品名称…"
            value={sampleQuery}
            onChange={(e) => setSampleQuery(e.target.value)}
            style={{ ...fieldBox, borderColor: sampleQuery ? 'rgba(244,114,182,0.6)' : 'rgba(0,0,0,0.08)' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-sub)' }}>
            <span>已勾选 <b style={{ color: 'var(--primary)' }}>{pickedIds.size}</b> 个</span>
            {filteredSamples.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPickedIds(new Set(filteredSamples.map((s) => s.id)))}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                >全选</button>
                <span style={{ color: '#d1d5db' }}>|</span>
                <button
                  type="button"
                  onClick={() => setPickedIds(new Set())}
                  style={{ background: 'none', border: 'none', color: 'var(--text-sub)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                >清空</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sampleList.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>所选账号下暂无可发布的样品（需未发布 / 已发布）</div>
          ) : filteredSamples.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>没有匹配的样品</div>
          ) : (
            filteredSamples.map((s) => {
              const sel = pickedIds.has(s.id)
              return (
                <button key={s.id} onClick={() => togglePicked(s.id)} style={{
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
