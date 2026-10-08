import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { SamplePickerPage } from '../components/SamplePickerPage'
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

const fieldBox = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', padding: '13px 14px', borderRadius: '10px',
  background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
  fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', boxSizing: 'border-box',
}

// 新增出单：账号 Tab 切换，每个账号下独立选产品，保存时一次性存所有账号
export function NewOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { samples, addOrder } = useStore()
  const { show } = useToast()

  const init = location.state || {}
  const initSample = init.sampleId || ''
  const initAccount = init.account || ACCOUNTS[0]

  const [activeAccount, setActiveAccount] = useState(initAccount)
  const [date, setDate] = useState(init.date || todayStr())
  // 每个账号独立的产品条目：{ [account]: [{ sampleId }] }
  const [entriesByAccount, setEntriesByAccount] = useState(() => {
    const init = {}
    for (const a of ACCOUNTS) init[a] = []
    if (initSample && initAccount) init[initAccount] = [{ sampleId: initSample }]
    return init
  })
  const [showSamples, setShowSamples] = useState(false)
  const [activeEntryIdx, setActiveEntryIdx] = useState(0)
  const [sampleQuery, setSampleQuery] = useState('')
  const [sampleCategory, setSampleCategory] = useState('')
  const [pickedIds, setPickedIds] = useState(() => new Set())

  const currentEntries = entriesByAccount[activeAccount] || []

  // 可选样品：当前账号下「已发布」的样品
  const candidateSamples = useMemo(() => {
    if (!activeAccount) return []
    return (samples || []).filter((sm) => isSelectableForOrder(sm.status) && hasAccount(sm, activeAccount))
  }, [samples, activeAccount])

  const filteredSamples = useMemo(() => {
    const q = sampleQuery.trim().toLowerCase()
    const usedElsewhere = new Set(currentEntries.map((e, i) => (i === activeEntryIdx ? null : e.sampleId)).filter(Boolean))
    const base = candidateSamples.filter((s) => !usedElsewhere.has(s.id))
    const byCat = sampleCategory ? base.filter((s) => (s.category || '') === sampleCategory) : base
    const list = q ? byCat.filter((s) => (s.name || '').toLowerCase().includes(q)) : byCat
    return [...list].sort((a, b) => {
      const cur = currentEntries[activeEntryIdx]?.sampleId
      if (a.id === cur) return -1
      if (b.id === cur) return 1
      return 0
    })
  }, [candidateSamples, sampleQuery, sampleCategory, currentEntries, activeEntryIdx])

  const closeSamplePicker = () => { setShowSamples(false); setSampleQuery(''); setSampleCategory(''); setPickedIds(new Set()) }
  const openSamplePicker = (idx) => {
    setActiveEntryIdx(idx)
    setSampleQuery('')
    setPickedIds(new Set([currentEntries[idx]?.sampleId].filter(Boolean)))
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

  // 更新当前账号的 entries
  const updateCurrentEntries = (updater) => {
    setEntriesByAccount((prev) => ({
      ...prev,
      [activeAccount]: updater(prev[activeAccount] || []),
    }))
  }

  const addEntry = () => updateCurrentEntries((prev) => [...prev, { sampleId: '' }])
  const removeEntry = (idx) => updateCurrentEntries((prev) => prev.filter((_, i) => i !== idx))
  const updateEntry = (idx, patch) => updateCurrentEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)))

  const confirmMultiPick = () => {
    if (pickedIds.size === 0) { closeSamplePicker(); return }
    const pickedArr = candidateSamples.filter((s) => pickedIds.has(s.id)).map((s) => s.id)
    if (pickedArr.length === 0) { closeSamplePicker(); return }
    updateCurrentEntries((prev) => {
      const idx = Math.min(activeEntryIdx, prev.length)
      const before = prev.slice(0, idx)
      const after = prev.slice(idx + 1).filter((e) => !pickedIds.has(e.sampleId))
      return [
        ...before,
        ...pickedArr.map((id) => ({ sampleId: id })),
        ...after,
      ]
    })
    closeSamplePicker()
  }

  const chosenSamples = currentEntries.map((e) => (samples || []).find((s) => s.id === e.sampleId) || null)

  // 统计所有账号有多少条有效记录
  const totalValid = useMemo(() => {
    let n = 0
    for (const a of ACCOUNTS) {
      n += (entriesByAccount[a] || []).filter((e) => e.sampleId).length
    }
    return n
  }, [entriesByAccount])

  const handleSave = () => {
    if (totalValid === 0) { show('请至少选择 1 个产品', 'error'); return }
    let count = 0
    for (const a of ACCOUNTS) {
      const valid = (entriesByAccount[a] || []).filter((e) => e.sampleId)
      for (const e of valid) {
        const sm = (samples || []).find((s) => s.id === e.sampleId)
        addOrder({
          name: (sm?.name || '').trim(),
          date,
          account: a,
          sampleId: e.sampleId,
          productId: sm?.productId || '',
          qty: 1,
        })
        count++
      }
    }
    show(`已记 ${count} 条出单`, 'success')
    navigate(-1)
  }

  const sectionTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }

  if (showSamples) {
    return (
      <SamplePickerPage
        title="选择样品"
        onBack={closeSamplePicker}
        query={sampleQuery}
        onQueryChange={setSampleQuery}
        category={sampleCategory}
        onCategoryChange={setSampleCategory}
        count={pickedIds.size}
        showBulk={filteredSamples.length > 0}
        onSelectAll={() => setPickedIds((prev) => new Set([...prev, ...filteredSamples.map((s) => s.id)]))}
        onClear={() => setPickedIds(new Set())}
        confirmText={`确定${pickedIds.size > 0 ? ` · 已选 ${pickedIds.size}` : ''}`}
        confirmDisabled={pickedIds.size === 0}
        onConfirm={confirmMultiPick}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {candidateSamples.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>该账号下暂无可出单的样品（需已发布）</div>
          ) : filteredSamples.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>没有匹配的样品</div>
          ) : (
            filteredSamples.map((s) => {
              const sel = pickedIds.has(s.id)
              return (
                <button key={s.id} onClick={() => togglePicked(s.id)} style={{
                  display: 'flex', alignItems: 'center', width: '100%', gap: '10px',
                  padding: '12px 6px', borderRadius: '8px', border: 'none',
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
      </SamplePickerPage>
    )
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          记一笔出单{getDateLabel(date) ? `（${getDateLabel(date)}）` : ''}
        </h1>
      </header>

      <div style={{ padding: '12px 16px' }}>
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

        {/* 账号 Tab 切换 */}
        <div style={{
          display: 'flex', gap: '0', background: '#fff', borderRadius: '12px',
          border: '1.5px solid rgba(0,0,0,0.08)', padding: '4px', marginBottom: '14px',
        }}>
          {ACCOUNTS.map((a) => {
            const active = activeAccount === a
            const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(124,58,237,0.12)' }
            const cnt = (entriesByAccount[a] || []).filter((e) => e.sampleId).length
            return (
              <button key={a} onClick={() => setActiveAccount(a)} style={{
                flex: 1, padding: '10px 4px', borderRadius: '8px', border: 'none',
                background: active ? col.bg : 'transparent',
                color: active ? col.c : 'var(--text-sub)',
                fontSize: '13px', fontWeight: active ? 700 : 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                transition: 'all 0.15s',
              }}>
                {a}
                {cnt > 0 && <span style={{
                  fontSize: '10px', fontWeight: 700,
                  background: active ? col.c : '#e5e7eb',
                  color: active ? '#fff' : '#6b7280',
                  borderRadius: '999px', padding: '1px 6px', minWidth: '16px', textAlign: 'center',
                }}>{cnt}</span>}
              </button>
            )
          })}
        </div>

        {/* 当前账号的产品列表 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>关联产品（可多选）</span>
            <button onClick={addEntry} style={{
              flexShrink: 0, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
              border: '1.5px solid rgba(244,114,182,0.35)', background: '#fff', color: 'var(--primary)', cursor: 'pointer',
            }}>＋ 添加</button>
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>只能选「{activeAccount}」已发布的样品</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentEntries.length === 0 && (
              <div style={{ fontSize: '12px', color: '#9ca3af', padding: '16px', textAlign: 'center', background: '#fff', border: '1.5px dashed rgba(0,0,0,0.10)', borderRadius: '10px' }}>
                点上方「＋ 添加」新增一条产品
              </div>
            )}
            {currentEntries.map((e, idx) => {
              const sm = chosenSamples[idx]
              const canDelete = currentEntries.length > 0
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px', padding: '10px 12px',
                }}>
                  <button onClick={() => openSamplePicker(idx)} style={{
                    flex: 1, minWidth: 0, textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '14px', color: sm ? 'var(--text-main)' : '#9ca3af',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sm ? sm.name : '点击选择产品'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    aria-label="删除该产品"
                    title="删除该产品"
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(0,0,0,0.06)',
                      background: '#fff', color: '#9ca3af', cursor: 'pointer', flexShrink: 0, padding: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
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
        }}>保存{totalValid > 0 ? `（${totalValid}条）` : ''}</button>
      </div>

    </div>
  )
}
