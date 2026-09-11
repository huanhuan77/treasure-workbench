import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../utils/accounts'
import { SwipeRow } from '../components/SwipeRow'
import { DraggableFab } from '../components/DraggableFab'
import { ConfirmModal } from '../components/Modal'

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
  const [expanded, setExpanded] = useState('')   // 展开查看全部日期的分组 key
  const [delGroup, setDelGroup] = useState(null) // 待确认删除的分组

  const sampleMap = useMemo(() => Object.fromEntries((samples || []).map((s) => [s.id, s])), [samples])
  const records = useMemo(
    () => [...(publishRecords || [])].sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))),
    [publishRecords],
  )
  // 快捷时段与月份下拉互斥：选 preset 清 month，选 month 清 preset
  const toggleDatePreset = (p) => { setDatePreset((cur) => (cur === p ? '' : p)); if (p) setMonth('') }
  const pickMonth = (ym) => { setMonth(ym); setDatePreset('') }
  const resetDate = () => { setDatePreset(''); setMonth('') }

  // 时间筛选 + 账号筛选，再按「同一产品 + 同一账号」合并成一条（日期收进 dates）
  const bounds = presetBounds(datePreset) || monthBounds(month)
  const groups = useMemo(() => {
    const arr = records.filter((r) => {
      if (account && !(r.accounts || []).includes(account)) return false
      if (bounds) {
        const t = parseTs(r.publishDate)
        if (t === null || t < bounds[0] || t >= bounds[1]) return false
      }
      return true
    })
    // 一条记录可能挂多个账号 → 按 (产品, 账号) 拆开，各自成组
    const map = new Map()
    for (const r of arr) {
      const sm = sampleMap[r.sampleId]
      const name = sm ? sm.name : '（样品已删除）'
      const keyBase = r.sampleId || name
      const accs = (r.accounts && r.accounts.length) ? r.accounts : getAccounts(sm || {})
      const list = accs.length ? accs : ['']
      for (const a of list) {
        const k = `${keyBase}::${a}`
        if (!map.has(k)) map.set(k, { key: k, name, account: a, records: [] })
        map.get(k).records.push(r)
      }
    }
    return [...map.values()]
      .map((g) => {
        const dates = [...new Set(g.records.map((r) => r.publishDate).filter(Boolean))].sort().reverse()
        const qty = g.records.reduce((s, r) => s + (Number(r.qty) > 0 ? Number(r.qty) : 1), 0)
        return { ...g, dates, qty, legacy: g.records.some((r) => r.legacy) }
      })
      // 发布次数多的置顶；其次按最近发布日期倒序
      .sort((a, b) => b.records.length - a.records.length
        || String(b.dates[0] || '').localeCompare(String(a.dates[0] || '')))
  }, [records, sampleMap, account, bounds])
  // 合并后覆盖的记录条数（去重，一条挂两账号会出现在两组里）
  const filteredCount = useMemo(
    () => new Set(groups.flatMap((g) => g.records.map((r) => r.id))).size,
    [groups],
  )

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

  // 删除整组：该产品在该账号下的全部发布记录（一条记录挂多账号时按 id 去重）
  const doDeleteGroup = (g) => {
    const ids = [...new Set(g.records.map((r) => r.id))]
    ids.forEach((id) => deletePublishRecord(id))
    show(ids.length > 1 ? `已删除 ${ids.length} 条发布记录` : '已删除', 'success')
    setDelGroup(null)
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
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#b3888f' }}>共 {records.length} 条 · 当前筛选 {filteredCount} 条（{groups.length} 组）</p>
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
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', padding: '10px 16px calc(88px + var(--safe-bottom, 0px))', WebkitOverflowScrolling: 'touch' }}>
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎬</div>
            <p style={{ fontSize: '14px', margin: 0 }}>{records.length === 0 ? '暂无发布记录' : '当前筛选下暂无记录'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {groups.map((g) => {
              const isOpen = expanded === g.key
              const n = g.records.length            // 该产品在该账号下发布了几次
              const canExpand = n > 1
              const accColor = ACCOUNT_COLOR[g.account] || { bg: 'rgba(0,0,0,0.06)', c: '#64748b' }
              return (
                <SwipeRow key={g.key} onDelete={() => setDelGroup(g)} radius={12}>
                <div
                  onClick={() => { if (canExpand) setExpanded(isOpen ? '' : g.key) }}
                  style={{ position: 'relative', background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '12px 14px', cursor: canExpand ? 'pointer' : 'default' }}
                >
                  {/* 右上角 细线灰× 圆形删除（删整组） */}
                  <button onClick={(e) => { e.stopPropagation(); setDelGroup(g) }} aria-label="删除发布记录" style={{
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
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                        {g.legacy && <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 700, color: '#0891b2', background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.28)', padding: '1px 6px', borderRadius: '8px' }}>历史</span>}
                        {g.qty > 1 && <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#f472b6,#ec4899)', padding: '1px 8px', borderRadius: '8px' }}>×{g.qty}</span>}
                      </div>
                    </div>
                  </div>
                  {/* 账号 + 最近发布日期 + 共几次 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {g.account && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: accColor.bg, color: accColor.c, fontWeight: 600, whiteSpace: 'nowrap' }}>{g.account}</span>
                    )}
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>📅 {g.dates[0] || '—'}</span>
                    {canExpand && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ec4899', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        共 {n} 次 {isOpen ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  {/* 展开：列出全部发布日期 */}
                  {canExpand && isOpen && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(236,72,153,0.18)' }}>
                      {g.dates.map((d) => (
                        <span key={d} style={{ fontSize: '11px', color: '#9ca3af', background: 'rgba(236,72,153,0.07)', border: '1px solid rgba(236,72,153,0.14)', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>📅 {d}</span>
                      ))}
                    </div>
                  )}
                </div>
                </SwipeRow>
              )
            })}
          </div>
        )}
      </div>

      {/* 删除确认（整组删除，弹窗里写清共几条） */}
      <ConfirmModal
        open={!!delGroup}
        onClose={() => setDelGroup(null)}
        onConfirm={() => delGroup && doDeleteGroup(delGroup)}
        title="删除发布记录"
        message={delGroup ? (() => {
          const ids = [...new Set(delGroup.records.map((r) => r.id))]
          const acc = delGroup.account ? `「${delGroup.account}」` : ''
          return ids.length > 1
            ? `确定删除「${delGroup.name}」在${acc}下的 ${ids.length} 条发布记录吗？`
            : `确定删除「${delGroup.name}」在${acc}的这条发布记录吗？`
        })() : ''}
        confirmText="删除"
        danger
        compact
      />

      <DraggableFab storageKey="publish-record" onClick={() => navigate('/publish-record/new')} round>
        {/* 加号+圆圈：与待办页一致，用 SVG 而非文字「＋」，避免圆内偏位 */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" style={{ display: 'block' }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </DraggableFab>
    </div>
  )
}
