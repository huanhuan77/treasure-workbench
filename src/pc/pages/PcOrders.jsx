import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { OrderDialog } from '../components/OrderDialog'
import { todayStr } from '../../utils/helpers'
import {
  ACCOUNTS, ACCOUNT_COLOR, accountWithPlatform, accountLabel,
  mapAccount, isVideoAccount,
} from '../../utils/accounts'

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const pad = (n) => String(n).padStart(2, '0')
const normDate = (v) => (v ? String(v).replace(/\//g, '-') : '')
const ymOf = (ds) => (ds ? ds.slice(0, 7) : '')
const qtyOf = (o) => (Number(o.qty) > 0 ? Number(o.qty) : 1)

// PC 版出单记录 · 月历视图。
// 按日期聚合：格子列当天产品与条数，鼠标悬停格子弹出当天明细浮层，可编辑/删除/删除当天。
// 本地台账只存佣金百分比，不展示佣金金额（用户确认）。
export function PcOrders() {
  const { show } = useToast()
  const { orders, deleteOrder, hiddenAccounts } = useStore()
  const [accountFilter, setAccountFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [prefill, setPrefill] = useState(null)

  // 从总览指标卡「新增」跳过来（/pc/orders?add=1）时直接打开记出单弹窗，随后清掉参数
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setOrderOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // 归一日期 + 账号
  const clean = useMemo(
    () => (orders || []).map((o) => ({ ...o, date: normDate(o.date), account: mapAccount(o.account) })),
    [orders],
  )

  const filtered = useMemo(() => {
    let arr = clean
    if (accountFilter) arr = arr.filter((o) => o.account === accountFilter)
    if (productFilter.trim()) arr = arr.filter((o) => (o.name || '').includes(productFilter.trim()))
    return arr
  }, [clean, accountFilter, productFilter])

  // 按日期聚合
  const byDay = useMemo(() => {
    const m = new Map()
    for (const o of filtered) {
      if (!o.date) continue
      if (!m.has(o.date)) m.set(o.date, [])
      m.get(o.date).push(o)
    }
    return m
  }, [filtered])

  const dates = useMemo(() => [...byDay.keys()].sort(), [byDay])

  // 顶部统计（当前筛选全量，不分月份）
  const totalQty = filtered.reduce((s, o) => s + qtyOf(o), 0)
  const totalCount = filtered.length
  const dyQty = filtered.filter((o) => !isVideoAccount(o.account)).reduce((s, o) => s + qtyOf(o), 0)
  const videoQty = filtered.filter((o) => isVideoAccount(o.account)).reduce((s, o) => s + qtyOf(o), 0)

  const latest = dates[dates.length - 1] || todayStr()
  const [viewYM, setViewYM] = useState(ymOf(latest))
  const [selDate, setSelDate] = useState(latest)

  const [vy, vm] = viewYM.split('-').map(Number)
  const firstWeek = new Date(vy, vm - 1, 1).getDay()
  const dim = new Date(vy, vm, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeek; i += 1) cells.push(null)
  for (let d = 1; d <= dim; d += 1) cells.push(`${vy}-${pad(vm)}-${pad(d)}`)
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

  const selEntries = byDay.get(selDate) || []
  const today = todayStr()

  // 当月统计
  const monthQty = dates.filter((d) => ymOf(d) === viewYM).reduce((s, d) => s + byDay.get(d).reduce((x, o) => x + qtyOf(o), 0), 0)
  const monthDays = dates.filter((d) => ymOf(d) === viewYM).length

  const openEdit = (o) => { setEditing(o); setModalOpen(true) }
  const delEntry = (o) => {
    if (!window.confirm(`删除「${o.name}」这笔出单记录？`)) return
    deleteOrder(o.id)
    show('已删除', 'success')
  }
  const delDay = (entries) => {
    if (!window.confirm(`删除 ${selDate} 的 ${entries.length} 笔出单？`)) return
    entries.forEach((e) => deleteOrder(e.id))
    show('已删除该天的出单', 'success')
  }

  const accountOptions = ACCOUNTS

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">出单记录</div>
          <div className="pcv-sub">{filtered.length} 笔 · 共 {totalQty} 件</div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 200 }}
          placeholder="搜索产品名…"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          title="按产品名搜索（包含匹配）"
        />
        {productFilter && <button className="pcv-btn-text" onClick={() => setProductFilter('')} title="清空搜索">×</button>}
        <button className="pcv-btn" onClick={() => { setPrefill(accountFilter ? { account: accountFilter, date: selDate } : { date: selDate }); setOrderOpen(true) }}>记出单</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        {/* 账号筛选 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none', flexWrap: 'wrap' }}>
          <button className={accountFilter === '' ? 'on' : ''} onClick={() => setAccountFilter('')}>全部账号</button>
          {accountOptions.map((a) => (
            <button key={a} className={accountFilter === a ? 'on' : ''} onClick={() => setAccountFilter(a)}>{accountWithPlatform(a, hiddenAccounts)}</button>
          ))}
        </div>

        {/* 顶部统计卡 */}
        <div className="ordcal-stats">
          <div className="ordcal-stat"><span className="ordcal-stat-label">总出单</span><div className="ordcal-stat-main"><b>{totalQty}</b><span className="ordcal-stat-sub">{totalCount} 笔</span></div></div>
          <div className="ordcal-stat"><span className="ordcal-stat-label">抖音</span><div className="ordcal-stat-main"><b>{dyQty}</b><span className="ordcal-stat-sub">件</span></div></div>
          <div className="ordcal-stat"><span className="ordcal-stat-label">视频号</span><div className="ordcal-stat-main"><b>{videoQty}</b><span className="ordcal-stat-sub">件</span></div></div>
          <div className="ordcal-stat"><span className="ordcal-stat-label">本月</span><div className="ordcal-stat-main"><b>{monthQty}</b><span className="ordcal-stat-sub">{monthDays} 天有出单</span></div></div>
        </div>

        <div className="ordcal-main">
          {/* 月历 */}
          <div className="ordcal-cal">
            <div className="ordcal-nav">
              <span className="ordcal-ym">{vy} 年 {vm} 月</span>
              <div className="pcv-spacer" />
              <button className="ordcal-today" onClick={() => { setViewYM(ymOf(today)); setSelDate(today) }}>今天</button>
              <button
                className="ordcal-today ordcal-today--danger"
                disabled={selEntries.length === 0}
                title="删除选中当天的全部出单"
                onClick={() => delDay(selEntries)}
              >删除当天</button>
              <button className="ordcal-arrow" title="上月" onClick={() => shiftMonth(-1)}>‹</button>
              <button className="ordcal-arrow" title="下月" onClick={() => shiftMonth(1)}>›</button>
            </div>

            <div className="ordcal-weekrow">
              {WEEK.map((w) => <div key={w} className="ordcal-week">{w}</div>)}
            </div>
            <div className="ordcal-grid">
              {cells.map((d, i) => {
                if (!d) return <div key={`e${i}`} className="ordcal-cell ordcal-cell--off" />
                const inMonth = ymOf(d) === viewYM
                const cur = byDay.get(d)
                const isSel = d === selDate
                const isToday = d === today
                return (
                  <div
                    key={d}
                    className={`ordcal-cell ${isSel ? 'ordcal-cell--sel' : ''} ${!inMonth ? 'ordcal-cell--off' : ''} ${isToday ? 'ordcal-cell--today' : ''}`}
                    onClick={() => setSelDate(d)}
                  >
                    <span className="ordcal-day">{Number(d.slice(8))}</span>
                    {cur && cur.map((o) => {
                      const col = ACCOUNT_COLOR[o.account] || {}
                      return (
                        <div
                          key={o.id}
                          className="ordcal-item"
                          title={`${o.account || '未指定'} · ${o.name || '(未命名)'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="ordcal-dot" style={{ background: col.c || '#c1c7cf' }} />
                          <span className="ordcal-item-acc">{accountLabel(o.account, hiddenAccounts) || '—'}</span>
                          <span className="ordcal-item-name">{o.name || '(未命名)'}</span>
                          <span className="ordcal-item-qty">×{qtyOf(o)}</span>
                          <span className="ordcal-item-act">
                            <button className="ordcal-mini" title="编辑" onClick={() => openEdit(o)}>✎</button>
                            <button className="ordcal-mini ordcal-mini--danger" title="删除这一笔" onClick={() => delEntry(o)}>×</button>
                          </span>
                        </div>
                      )
                    })}
                    {cur && cur.length > 0 && (
                      <div
                        className={`ordcal-pop ${i % 7 === 6 ? 'ordcal-pop--right' : ''} ${Math.floor(i / 7) >= 4 ? 'ordcal-pop--up' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="ordcal-pop-head">
                          <span className="ordcal-pop-date">{Number(d.slice(5, 7))}月{Number(d.slice(8))}日 {WEEK[new Date(`${d}T00:00:00`).getDay()]}</span>
                          <span className="ordcal-pop-meta">{cur.reduce((s, o) => s + qtyOf(o), 0)} 件 · {cur.length} 笔</span>
                        </div>
                        <div className="ordcal-pop-list">
                          {cur.map((o) => {
                            const col = ACCOUNT_COLOR[o.account] || {}
                            return (
                              <div key={o.id} className="ordcal-pop-item">
                                <span className="ordcal-dot" style={{ background: col.c || '#c1c7cf' }} />
                                <span className="ordcal-pop-acc">{accountWithPlatform(o.account, hiddenAccounts)}</span>
                                <span className="ordcal-pop-name">{o.name || '(未命名)'}</span>
                                <span className="ordcal-pop-qty">×{qtyOf(o)}</span>
                                <span className="ordcal-pop-act">
                                  <button className="ordcal-mini" title="编辑" onClick={() => openEdit(o)}>✎</button>
                                  <button className="ordcal-mini ordcal-mini--danger" title="删除这一笔" onClick={() => delEntry(o)}>×</button>
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        <div className="ordcal-pop-foot">
                          <button className="ordcal-pop-del" onClick={() => delDay(cur)}>删除当天</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="ordcal-foot">本月：{monthQty} 单 · {monthDays} 天有出单</div>
          </div>
        </div>
      </div>

      {/* 编辑单笔出单 */}
      {modalOpen && editing && (
        <OrderDialog
          editing={editing}
          onClose={() => { setModalOpen(false); setEditing(null); setPrefill(null) }}
        />
      )}

      {/* 记出单（新增） */}
      {orderOpen && (
        <OrderDialog prefill={prefill} onClose={() => { setOrderOpen(false); setPrefill(null) }} />
      )}
    </>
  )
}
