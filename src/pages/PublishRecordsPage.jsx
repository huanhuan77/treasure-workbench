import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../utils/accounts'
import { SwipeRow } from '../components/SwipeRow'
import { DraggableFab } from '../components/DraggableFab'

const chipBase = {
  padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

// 解析 YYYY/MM/DD 或 YYYY-MM-DD
function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
// 月份区间：返回 [startTs, endTs)；空字符串返回 null
function monthBounds(ym) {
  if (!ym) return null
  const m = String(ym).match(/^(\d{4})-(\d{1,2})$/)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2])
  if (!y || !mo || mo < 1 || mo > 12) return null
  const s = new Date(y, mo - 1, 1).getTime()
  const e = new Date(y, mo, 1).getTime()
  return [s, e]
}
function monthLabel(ym) {
  const m = String(ym).match(/^(\d{4})-(\d{1,2})$/)
  if (!m) return String(ym)
  return `${m[1]}年${Number(m[2])}月`
}

export function PublishRecordsPage() {
  const navigate = useNavigate()
  const { publishRecords, samples, deletePublishRecord } = useStore()
  const { show } = useToast()
  const [accFilter, setAccFilter] = useState([])   // 账号多选筛选
  const [prodFilter, setProdFilter] = useState([])  // 产品多选筛选（按样品名分组）
  const [month, setMonth] = useState('')           // 月份筛选 YYYY-MM
  const [showProdPicker, setShowProdPicker] = useState(false) // 产品筛选展开

  const sampleMap = useMemo(() => Object.fromEntries((samples || []).map((s) => [s.id, s])), [samples])
  const records = useMemo(
    () => [...(publishRecords || [])].sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))),
    [publishRecords],
  )
  // 产品筛选选项：所有出现过的样品名（去重）
  const prodOptions = useMemo(() => {
    const set = new Set()
    for (const r of records) {
      const sm = sampleMap[r.sampleId]
      if (sm && sm.name) set.add(sm.name)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
  }, [records, sampleMap])
  const toggleAcc = (a) => setAccFilter((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
  const toggleProd = (n) => setProdFilter((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))

  // 时间筛选 + 账号筛选 + 产品筛选
  const bounds = monthBounds(month)
  const filtered = useMemo(() => records.filter((r) => {
    if (accFilter.length && !(r.accounts || []).some((a) => accFilter.includes(a))) return false
    if (bounds) {
      const t = parseTs(r.publishDate)
      if (t === null || t < bounds[0] || t >= bounds[1]) return false
    }
    if (prodFilter.length) {
      const sm = sampleMap[r.sampleId]
      if (!sm || !prodFilter.includes(sm.name)) return false
    }
    return true
  }), [records, accFilter, bounds, prodFilter, sampleMap])

  // 当前月份下拉里可用的月份（来自有日期的记录），新→旧
  const monthOptions = useMemo(() => {
    const set = new Set()
    for (const r of records) {
      const t = parseTs(r.publishDate)
      if (t === null) continue
      const d = new Date(t)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      set.add(ym)
    }
    return [...set].sort().reverse()
  }, [records])

  const handleDelete = (r) => {
    if (confirm('删除该发布记录？')) { deletePublishRecord(r.id); show('已删除', 'success') }
  }

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh', color: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 'calc(18px + var(--safe-top)) 20px 14px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(236,72,153,0.12)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111' }}>视频发布记录</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#b3888f' }}>共 {records.length} 条 · 当前筛选 {filtered.length} 条</p>
        </div>
      </header>

      {/* 账号筛选 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 16px 4px', flexShrink: 0 }}>
        <button onClick={() => setAccFilter([])} style={{
          ...chipBase,
          borderColor: accFilter.length === 0 ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: accFilter.length === 0 ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: accFilter.length === 0 ? '#fff' : 'var(--text-sub)',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const sel = accFilter.includes(a)
          const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
          return (
            <button key={a} onClick={() => toggleAcc(a)} style={{
              ...chipBase,
              borderColor: sel ? col.c : 'rgba(0,0,0,0.06)',
              background: sel ? col.bg : '#fff',
              color: sel ? col.c : 'var(--text-main)',
            }}>{a}</button>
          )
        })}
      </div>

      {/* 产品筛选 + 月份筛选 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '4px 16px 8px', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => setShowProdPicker((v) => !v)} style={{
          ...chipBase,
          borderColor: prodFilter.length ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: prodFilter.length ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: prodFilter.length ? '#fff' : 'var(--text-main)',
        }}>📦 产品{prodFilter.length ? ` · ${prodFilter.length}` : ''}</button>
        <button onClick={() => setMonth('')} style={{
          ...chipBase,
          borderColor: month === '' && accFilter.length === 0 && prodFilter.length === 0 ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: month === '' && accFilter.length === 0 && prodFilter.length === 0 ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: month === '' && accFilter.length === 0 && prodFilter.length === 0 ? '#fff' : 'var(--text-sub)',
        }}>全部时间</button>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            border: month ? 'none' : '1px solid rgba(0,0,0,0.06)',
            background: month ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
            color: month ? '#fff' : 'var(--text-main)', cursor: 'pointer',
          }}
        >
          <option value="">📅 按月份</option>
          {monthOptions.map((ym) => (
            <option key={ym} value={ym} style={{ color: '#111' }}>{monthLabel(ym)}</option>
          ))}
        </select>
      </div>

      {/* 产品多选展开面板 */}
      {showProdPicker && (
        <div style={{ padding: '4px 16px 8px', background: 'rgba(255,255,255,0.6)', borderTop: '1px dashed rgba(244,114,182,0.25)', borderBottom: '1px dashed rgba(244,114,182,0.25)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}>按产品多选</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setProdFilter([])} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer' }}>清空</button>
              <button onClick={() => setShowProdPicker(false)} style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff', cursor: 'pointer' }}>完成</button>
            </div>
          </div>
          {prodOptions.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', padding: '8px 0' }}>暂无产品数据</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {prodOptions.map((n) => {
                const sel = prodFilter.includes(n)
                return (
                  <button key={n} onClick={() => toggleProd(n)} style={{
                    fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px',
                    border: sel ? 'none' : '1px solid rgba(0,0,0,0.10)',
                    background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                    color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer',
                  }}>{n}</button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 列表：独立滚动 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px calc(88px + var(--safe-bottom, 0px))', WebkitOverflowScrolling: 'touch' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎬</div>
            <p style={{ fontSize: '14px', margin: 0 }}>{records.length === 0 ? '暂无发布记录' : '当前筛选下暂无记录'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((r) => {
              const sm = sampleMap[r.sampleId]
              const q = Number(r.qty) > 0 ? Number(r.qty) : 1
              return (
                <SwipeRow key={r.id} onDelete={() => handleDelete(r)} radius={12}>
                <div style={{ position: 'relative', background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '12px 14px' }}>
                  {/* 右上角 ❌ 删除 */}
                  <button onClick={() => handleDelete(r)} aria-label="删除发布记录" style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '26px', height: '26px', borderRadius: '50%',
                    border: 'none', background: 'rgba(239,68,68,0.10)', color: '#dc2626',
                    fontSize: '13px', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>❌</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '34px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sm ? sm.name : '（样品已删除）'}</span>
                        {q > 1 && <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#f472b6,#ec4899)', padding: '1px 8px', borderRadius: '8px' }}>×{q}</span>}
                      </div>
                    </div>
                  </div>
                  {/* 账号与发布时间同一行：账号在前，时间紧跟其后（靠右对齐，不单独占一行） */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {(r.accounts && r.accounts.length ? r.accounts : getAccounts(sm || {})).map((a) => (
                      <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
                    ))}
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>📅 {r.publishDate}</span>
                  </div>
                </div>
                </SwipeRow>
              )
            })}
          </div>
        )}
      </div>

      <DraggableFab storageKey="publish-record" onClick={() => navigate('/publish-record/new')} round>
        {/* 加号+圆圈：与待办页一致，用 SVG 而非文字「＋」，避免圆内偏位 */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" style={{ display: 'block' }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </DraggableFab>
    </div>
  )
}
