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

// 快捷时间区间：返回 [startTs, endTs)；空字符串返回 null
// today/yesterday/thisWeek(周一-周日)/thisMonth/lastMonth
function presetBounds(preset) {
  if (!preset) return null
  const d = new Date()
  // 今天 0:00 ~ 明天 0:00
  if (preset === 'today') {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
    return [s, e]
  }
  // 昨天 0:00 ~ 今天 0:00
  if (preset === 'yesterday') {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime()
    const e = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return [s, e]
  }
  // 本周（周一 0:00 -> 下周一 0:00）
  if (preset === 'thisWeek') {
    const day = d.getDay() // 0(日)~6(六)
    const offset = (day === 0 ? 6 : day - 1) // 周一为本周起点
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset).getTime()
    const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset + 7).getTime()
    return [s, e]
  }
  // 本月 1号 0:00 -> 下月 1号 0:00
  if (preset === 'thisMonth') {
    const s = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
    return [s, e]
  }
  // 上月 1号 -> 本月 1号
  if (preset === 'lastMonth') {
    const s = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime()
    const e = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    return [s, e]
  }
  return null
}

export function PublishRecordsPage() {
  const navigate = useNavigate()
  const { publishRecords, samples, deletePublishRecord } = useStore()
  const { show } = useToast()
  const [account, setAccount] = useState('')    // 账号单选筛选，''=全部账号
  const [month, setMonth] = useState('')           // 月份筛选 YYYY-MM
  const [datePreset, setDatePreset] = useState('today') // 快捷时段：默认「今天」/yesterday/thisWeek/thisMonth/lastMonth

  const sampleMap = useMemo(() => Object.fromEntries((samples || []).map((s) => [s.id, s])), [samples])
  const records = useMemo(
    () => [...(publishRecords || [])].sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))),
    [publishRecords],
  )
  // 快捷时段与月份下拉互斥：选 preset 清 month，选 month 清 preset
  const toggleDatePreset = (p) => { setDatePreset((cur) => (cur === p ? '' : p)); if (p) setMonth('') }
  const pickMonth = (ym) => { setMonth(ym); setDatePreset('') }
  const resetDate = () => { setDatePreset(''); setMonth('') }

  // 时间筛选 + 账号筛选
  const bounds = presetBounds(datePreset) || monthBounds(month)
  const filtered = useMemo(() => records.filter((r) => {
    if (account && !(r.accounts || []).includes(account)) return false
    if (bounds) {
      const t = parseTs(r.publishDate)
      if (t === null || t < bounds[0] || t >= bounds[1]) return false
    }
    return true
  }), [records, account, bounds])

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
    <div className="app-container scroll-lock-page" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', color: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 'calc(18px + var(--safe-top)) 20px 14px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(236,72,153,0.12)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111' }}>视频发布记录</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#b3888f' }}>共 {records.length} 条 · 当前筛选 {filtered.length} 条</p>
        </div>
      </header>

      {/* 账号筛选：单行横向滚动，不换行 */}
      <div className="hide-scrollbar" style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px 6px',
        flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
      }}>
        <button onClick={() => setAccount('')} style={{
          ...chipBase, flexShrink: 0,
          borderColor: account === '' ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: account === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: account === '' ? '#fff' : 'var(--text-sub)',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const sel = account === a
          const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
          return (
            <button key={a} onClick={() => setAccount(a)} style={{
              ...chipBase, flexShrink: 0,
              borderColor: sel ? col.c : 'rgba(0,0,0,0.06)',
              background: sel ? col.bg : '#fff',
              color: sel ? col.c : 'var(--text-main)',
            }}>{a}</button>
          )
        })}
      </div>

      {/* 产品筛选 + 时间筛选：左侧快捷项横向滚动，右侧「按月份」固定 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 16px 8px', flexShrink: 0 }}>
        <div className="hide-scrollbar" style={{
          flex: 1, minWidth: 0, display: 'flex', gap: '6px', alignItems: 'center',
          overflowX: 'auto', whiteSpace: 'nowrap', padding: '2px 0', WebkitOverflowScrolling: 'touch',
        }}>
          {/* 全部：与 5 个快捷时段 + 月份下拉 互斥（单选“时间范围”语义） */}
          <button onClick={resetDate} style={{
            ...chipBase, flexShrink: 0,
            borderColor: !datePreset && !month ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
            background: !datePreset && !month ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
            color: !datePreset && !month ? '#fff' : 'var(--text-sub)',
          }}>全部</button>
          {[
            { k: 'today', label: '今天' },
            { k: 'yesterday', label: '昨天' },
            { k: 'thisWeek', label: '本周' },
            { k: 'thisMonth', label: '本月' },
            { k: 'lastMonth', label: '上月' },
          ].map((it) => {
            const sel = datePreset === it.k
            return (
              <button key={it.k} onClick={() => toggleDatePreset(it.k)} style={{
                ...chipBase, flexShrink: 0,
                borderColor: sel ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                color: sel ? '#fff' : 'var(--text-main)',
              }}>{it.label}</button>
            )
          })}
        </div>
        {/* 「按月份」固定在右侧，不随快捷项横滚 */}
        <select
          value={month}
          onChange={(e) => pickMonth(e.target.value)}
          style={{
            flexShrink: 0, padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            border: month ? 'none' : '1px solid rgba(0,0,0,0.06)',
            background: month ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
            color: month ? '#fff' : 'var(--text-main)', cursor: 'pointer', maxWidth: '112px',
          }}
        >
          <option value="">📅 按月份</option>
          {monthOptions.map((ym) => (
            <option key={ym} value={ym} style={{ color: '#111' }}>{monthLabel(ym)}</option>
          ))}
        </select>
      </div>

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
                  {/* 右上角 细线灰× 圆形删除 */}
                  <button onClick={() => handleDelete(r)} aria-label="删除发布记录" style={{
                    position: 'absolute', top: '6px', right: '6px',
                    width: '30px', height: '30px', borderRadius: '50%',
                    border: '1px solid rgba(236,72,153,0.18)', background: '#fce7f3',
                    color: '#ec4899', cursor: 'pointer', padding: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
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
