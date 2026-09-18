import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../utils/accounts'
import { DraggableFab } from '../components/DraggableFab'
import { ConfirmModal } from '../components/Modal'
import { DateFilterBar, dateBounds } from '../components/DateFilterBar'

const chipBase = {
  padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

// 排序按钮样式（与 DateFilterBar 的 SortChips 一致）
const sortChipStyle = (sel) => ({
  flex: '0 0 auto', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  border: sel ? 'none' : '1px solid rgba(244,114,182,0.35)',
  background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
  color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer', whiteSpace: 'nowrap',
})

// 解析 YYYY/MM/DD 或 YYYY-MM-DD
function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

export function PublishRecordsPage() {
  const navigate = useNavigate()
  const { publishRecords, samples, deletePublishRecord } = useStore()
  const { show } = useToast()
  const [account, setAccount] = useState('')    // 账号单选筛选，''=全部账号
  const [dateRange, setDateRange] = useState('') // 日期筛选：''=全部 / today|yesterday|last7|thisWeek|thisMonth|lastMonth|halfYear|thisYear / day:YYYY-MM-DD
  const [keyword, setKeyword] = useState('')     // 产品名搜索
  const [sortKey, setSortKey] = useState('dateDesc') // dateDesc | dateAsc | countDesc
  const [expanded, setExpanded] = useState('')   // 展开查看全部日期的分组 key
  const [delTarget, setDelTarget] = useState(null) // 待确认删除：{ group, date } —— 按日期删，不是删整组

  const sampleMap = useMemo(() => Object.fromEntries((samples || []).map((s) => [s.id, s])), [samples])
  const records = useMemo(
    () => [...(publishRecords || [])].sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))),
    [publishRecords],
  )

  // 时间筛选 + 账号筛选 + 产品名搜索，再按「同一产品 + 同一账号」合并成一条（日期收进 dates）
  const bounds = dateBounds(dateRange)
  const groups = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const arr = records.filter((r) => {
      if (account && !(r.accounts || []).includes(account)) return false
      if (bounds) {
        const t = parseTs(r.publishDate)
        if (t === null || t < bounds[0] || t >= bounds[1]) return false
      }
      if (kw) {
        const sm = sampleMap[r.sampleId]
        const name = String(sm ? sm.name : '')
        if (!name.toLowerCase().includes(kw)) return false
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
    const byDate = (a, b, dir) => {
      const A = String(a.dates[0] || ''), B = String(b.dates[0] || '')
      // 没有日期的排最后
      if (!A && !B) return 0
      if (!A) return 1
      if (!B) return -1
      return dir === 'asc' ? A.localeCompare(B) : B.localeCompare(A)
    }
    return [...map.values()]
      .map((g) => {
        const dates = [...new Set(g.records.map((r) => r.publishDate).filter(Boolean))].sort().reverse()
        const qty = g.records.reduce((s, r) => s + (Number(r.qty) > 0 ? Number(r.qty) : 1), 0)
        return { ...g, dates, qty, legacy: g.records.some((r) => r.legacy) }
      })
      .sort((a, b) => {
        if (sortKey === 'dateAsc') return byDate(a, b, 'asc') || (b.records.length - a.records.length)
        if (sortKey === 'countDesc') return (b.records.length - a.records.length) || byDate(a, b, 'desc')
        return byDate(a, b, 'desc') || (b.records.length - a.records.length)
      })
  }, [records, sampleMap, account, bounds, keyword, sortKey])
  // 合并后覆盖的记录条数（去重，一条挂两账号会出现在两组里）
  const filteredCount = useMemo(
    () => new Set(groups.flatMap((g) => g.records.map((r) => r.id))).size,
    [groups],
  )

  // 删除该分组里「某一个日期」的发布记录（一条记录挂多账号时按 id 去重）
  const doDeleteDate = () => {
    if (!delTarget) return
    const { group, date } = delTarget
    const ids = [...new Set(group.records.filter((r) => r.publishDate === date).map((r) => r.id))]
    ids.forEach((id) => deletePublishRecord(id))
    show(ids.length > 1 ? `已删除 ${date} 的 ${ids.length} 条发布记录` : `已删除 ${date} 的发布记录`, 'success')
    setDelTarget(null)
  }

  // 排序：单个「日期」切换按钮（点一下升序↑ 再点降序↓），保留「发布最多」
  const isDateMode = sortKey === 'dateDesc' || sortKey === 'dateAsc'
  const dateAsc = sortKey === 'dateAsc'
  const toggleDateSort = () => {
    setSortKey((prev) => (prev === 'dateDesc' ? 'dateAsc' : 'dateDesc'))
  }

  return (
    <div className="app-container scroll-lock-page" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', color: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 'calc(14px + var(--safe-top)) 16px 6px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(236,72,153,0.12)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', flexShrink: 0 }}>视频发布记录</h1>
        {/* 搜索框放标题旁边 */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#c084a0' }}>🔍</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索产品名"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 28px 7px 28px', borderRadius: '999px',
              border: '1px solid rgba(244,114,182,0.28)', background: '#fff', fontSize: '12px',
              color: 'var(--text-main)', outline: 'none',
            }}
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              aria-label="清空搜索"
              style={{
                position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(244,114,182,0.14)', color: '#db2777', fontSize: '11px', lineHeight: 1,
              }}
            >×</button>
          )}
        </div>
      </header>

      {/* 账号筛选：单行横向滚动，不换行 */}
      <div className="hide-scrollbar" style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 2px', marginTop: '7px',
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

      {/* 日期筛选：全部 / 今天 / 昨天 / 近7天 / 本周 / 本月 + 📅 日期（快捷键 / 具体某一天 / 本月·上月·近半年·本年） */}
      <DateFilterBar value={dateRange} onChange={setDateRange} />

      {/* 排序：单个「日期」切换按钮（点一下升序↑ 再点降序↓）+ 发布最多 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0, padding: '2px 16px 2px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
        <button onClick={toggleDateSort} style={sortChipStyle(isDateMode)}>
          日期 {dateAsc ? '↑' : '↓'}
        </button>
        <button onClick={() => setSortKey('countDesc')} style={sortChipStyle(sortKey === 'countDesc')}>
          发布最多
        </button>
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
              // 日期右侧的小删除按钮：只删这一天的发布记录
              const dateDelBtn = (date, big) => (
                <button
                  onClick={(e) => { e.stopPropagation(); setDelTarget({ group: g, date }) }}
                  aria-label={`删除 ${date} 的发布记录`}
                  title={`删除 ${date} 的记录`}
                  style={{
                    flexShrink: 0, padding: 0, cursor: 'pointer', lineHeight: 1,
                    width: big ? '20px' : '18px', height: big ? '20px' : '18px',
                    borderRadius: '50%', border: 'none',
                    background: 'rgba(244,63,94,0.12)', color: '#f43f5e',
                    fontSize: big ? '13px' : '12px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              )
              return (
                <div
                  key={g.key}
                  onClick={() => { if (canExpand) setExpanded(isOpen ? '' : g.key) }}
                  style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '12px 14px', cursor: canExpand ? 'pointer' : 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                        {g.qty > 1 && <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#f472b6,#ec4899)', padding: '1px 8px', borderRadius: '8px' }}>×{g.qty}</span>}
                      </div>
                    </div>
                  </div>
                  {/* 账号 + 最近发布日期（带删除） + 共几次 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {g.account && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: accColor.bg, color: accColor.c, fontWeight: 600, whiteSpace: 'nowrap' }}>{g.account}</span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>📅 {g.dates[0] || '—'}</span>
                      {g.dates[0] && dateDelBtn(g.dates[0], true)}
                    </span>
                    {canExpand && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ec4899', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        共 {n} 次 {isOpen ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  {/* 展开：列出全部发布日期，每个日期右侧可单独删除 */}
                  {canExpand && isOpen && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(236,72,153,0.18)' }}>
                      {g.dates.map((d) => (
                        <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af', background: 'rgba(236,72,153,0.07)', border: '1px solid rgba(236,72,153,0.14)', padding: '2px 6px 2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                          📅 {d}
                          {dateDelBtn(d, false)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 删除确认（按日期删，弹窗里写清哪一天几条） */}
      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDeleteDate}
        title="删除发布记录"
        message={delTarget ? (() => {
          const { group, date } = delTarget
          const ids = [...new Set(group.records.filter((r) => r.publishDate === date).map((r) => r.id))]
          const acc = group.account ? `「${group.account}」` : ''
          return ids.length > 1
            ? `确定删除「${group.name}」在${acc}于 ${date} 的 ${ids.length} 条发布记录吗？`
            : `确定删除「${group.name}」在${acc}于 ${date} 的这条发布记录吗？`
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
