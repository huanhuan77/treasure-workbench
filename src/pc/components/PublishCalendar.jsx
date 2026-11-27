import { useEffect, useMemo, useState } from 'react'
import { recordQty, todayStr } from '../../utils/helpers'
import { mapAccount, maskAccount, ACCOUNTS } from '../../utils/accounts'
import { ConfirmModal } from '../../components/Modal'

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const pad = (n) => String(n).padStart(2, '0')
const normDate = (v) => (v ? String(v).replace(/\//g, '-') : '')
const ymOf = (ds) => ds ? ds.slice(0, 7) : ''

// PC 发布记录 · 产品每日发布日历。
// 口径：整个产品跨账号聚合；只改当天条数，不改日期。
// records 为该产品在全部账号下的发布记录。
export function PublishCalendar({ name, records, hiddenAccounts, onClose, onSaveQty, onDeleteDate }) {
  const clean = useMemo(
    () => (records || []).map((r) => ({ ...r, publishDate: normDate(r.publishDate) })).filter((r) => r.publishDate),
    [records],
  )

  // 该产品出现过的账号（按固定顺序排），供筛选条使用
  const accountsInUse = useMemo(() => {
    const set = new Set()
    clean.forEach((r) => (r.accounts || []).map(mapAccount).filter(Boolean).forEach((a) => set.add(a)))
    return [...set].sort((a, b) => {
      const ia = ACCOUNTS.indexOf(a), ib = ACCOUNTS.indexOf(b)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  }, [clean])

  // 账号筛选：'' = 全部账号
  const [accFilter, setAccFilter] = useState('')
  const filtered = useMemo(() => {
    if (!accFilter) return clean
    return clean.filter((r) => (r.accounts || []).map(mapAccount).includes(accFilter))
  }, [clean, accFilter])

  // 按日期聚合：当天总条数 + 分账号条数 + 记录列表（随账号筛选联动）
  const byDate = useMemo(() => {
    const m = new Map()
    for (const r of filtered) {
      const cur = m.get(r.publishDate) || { qty: 0, acc: {}, list: [] }
      const q = recordQty(r.qty)
      cur.qty += q
      const accs = (r.accounts || []).map(mapAccount).filter(Boolean)
      accs.forEach((a) => { cur.acc[a] = (cur.acc[a] || 0) + q })
      cur.list.push(r)
      m.set(r.publishDate, cur)
    }
    return m
  }, [filtered])

  const dates = useMemo(() => [...byDate.keys()].sort(), [byDate])
  const totalQty = filtered.reduce((s, r) => s + recordQty(r.qty), 0)
  const activeDays = dates.length

  const latest = dates[dates.length - 1] || todayStr()
  const [viewYM, setViewYM] = useState(ymOf(latest))
  const [selDate, setSelDate] = useState(latest)
  const [qtyDraft, setQtyDraft] = useState(byDate.get(latest) ? String(byDate.get(latest).qty) : '')
  const [confirmDel, setConfirmDel] = useState(false)

  const monthQty = useMemo(
    () => dates.filter((d) => ymOf(d) === viewYM).reduce((s, d) => s + byDate.get(d).qty, 0),
    [dates, byDate, viewYM],
  )

  const [vy, vm] = viewYM.split('-').map(Number)
  const firstWeek = new Date(vy, vm - 1, 1).getDay()
  const dim = new Date(vy, vm, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeek; i += 1) cells.push(null)
  for (let d = 1; d <= dim; d += 1) cells.push(`${vy}-${pad(vm)}-${pad(d)}`)
  // 补齐下月头，凑满 6 行（灰显、不可点）
  let ny = vy, nm = vm + 1
  while (cells.length < 42) {
    if (nm > 12) { nm = 1; ny += 1 }
    const d = cells.length - firstWeek - dim + 1
    cells.push(`${ny}-${pad(nm)}-${pad(d)}`)
    nm += 1
  }

  const shiftMonth = (dir) => {
    let y = vy, m = vm + dir
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setViewYM(`${y}-${pad(m)}`)
  }

  const pickDate = (d) => {
    if (!d) return
    setSelDate(d)
    const cur = byDate.get(d)
    setQtyDraft(cur ? String(cur.qty) : '')
  }

  const sel = byDate.get(selDate)
  const selWeek = selDate ? WEEK[new Date(`${selDate}T00:00:00`).getDay()] : ''
  const accEntries = sel
    ? Object.entries(sel.acc || {}).sort((a, b) => {
        const ia = ACCOUNTS.indexOf(a[0]), ib = ACCOUNTS.indexOf(b[0])
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
    : []
  const today = todayStr()

  // 账号筛选切换 / 记录变化后，同步当天条数输入框
  useEffect(() => {
    const c = byDate.get(selDate)
    setQtyDraft(c ? String(c.qty) : '')
  }, [byDate, selDate])

  const saveQty = () => {
    if (!sel || !selDate) return
    const nq = parseInt(String(qtyDraft).replace(/[^\d]/g, ''), 10)
    if (!Number.isFinite(nq) || nq <= 0) return
    onSaveQty(selDate, nq, accFilter || null)
  }

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog pubcal" onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span className="pubcal-title">{name} · 每日发布日历</span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          {/* 统计行 */}
          <div className="pubcal-stats">
            <span><b>{totalQty}</b> 已发布总数</span>
            <span><b>{monthQty}</b> 本月更新</span>
            <span><b>{activeDays}</b> 天有记录</span>
          </div>

          {/* 月份导航 */}
          <div className="pubcal-nav">
            <span className="pubcal-ym">{vy} 年 {vm} 月</span>
            <div className="pcv-spacer" />
            <button className="pubcal-today" onClick={() => { setViewYM(ymOf(today)); pickDate(today) }}>今天</button>
            <button className="pubcal-arrow" title="上月" onClick={() => shiftMonth(-1)}>‹</button>
            <button className="pubcal-arrow" title="下月" onClick={() => shiftMonth(1)}>›</button>
          </div>

          {/* 账号筛选：全部 / 该产品出现过的账号 */}
          {accountsInUse.length > 0 && (
            <div className="pubcal-accfilter">
              <button className={!accFilter ? 'on' : ''} onClick={() => setAccFilter('')}>全部</button>
              {accountsInUse.map((a) => (
                <button key={a} className={accFilter === a ? 'on' : ''} onClick={() => setAccFilter(a)}>
                  {maskAccount(a, hiddenAccounts)}
                </button>
              ))}
            </div>
          )}

          {/* 周表头 */}
          <div className="pubcal-grid">
            {WEEK.map((w) => <div key={w} className="pubcal-week">{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} className="pubcal-cell pubcal-cell--off" />
              const inMonth = ymOf(d) === viewYM
              const cur = byDate.get(d)
              const isSel = d === selDate
              const isToday = d === today
              return (
                <button
                  key={d}
                  type="button"
                  className={`pubcal-cell ${isSel ? 'pubcal-cell--sel' : ''} ${!inMonth ? 'pubcal-cell--off' : ''} ${isToday ? 'pubcal-cell--today' : ''}`}
                  onClick={() => pickDate(d)}
                  disabled={!inMonth}
                >
                  <span className="pubcal-day">{Number(d.slice(8))}</span>
                  {cur && <span className="pubcal-qty">{cur.qty} 条</span>}
                </button>
              )
            })}
          </div>

          {/* 选中日编辑 */}
          {selDate && (
            <div className="pubcal-edit">
              <div className="pubcal-edit-head">
                <span>{selDate} {selWeek}</span>
                <span className="pubcal-edit-date">{selDate}</span>
              </div>
              <div className="pcv-field-label">当天更新条数</div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                type="number"
                min="1"
                step="1"
                value={qtyDraft}
                disabled={!sel}
                placeholder={sel ? '' : '当天无发布记录'}
                onChange={(e) => setQtyDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveQty() }}
              />
              {accEntries.length > 0 && (
                <div className="pubcal-accs">
                  {accEntries.map(([a, q]) => (
                    <span key={a} className="pubcal-acc">
                      <b>{maskAccount(a, hiddenAccounts)}</b><span>{q} 条</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pcv-dialog-f">
          <button
            className="pcv-btn pcv-btn-ghost--danger pubcal-del"
            disabled={!sel}
            onClick={() => setConfirmDel(true)}
          >删除此日</button>
          <div className="pcv-spacer" />
          <button className="pcv-btn" disabled={!sel} onClick={saveQty}>储存这天</button>
        </div>

        <ConfirmModal
          open={confirmDel}
          onClose={() => setConfirmDel(false)}
          onConfirm={() => { onDeleteDate(selDate, accFilter || null); setConfirmDel(false) }}
          title="删除发布记录"
          message={sel ? `确定删除 ${selDate}「${name}」的 ${sel.list.length} 条发布记录吗？此操作不可撤销。` : ''}
        />
      </div>
    </div>
  )
}
