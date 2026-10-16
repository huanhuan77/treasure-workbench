import { Fragment, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { OrderFormModal } from '../../components/OrderFormModal'
import { ACCOUNT_COLOR } from '../../utils/accounts'
import { dateBounds } from '../../components/DateFilterBar'

const RANGES = [
  { key: '', label: '全部' },
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'last7', label: '近7天' },
  { key: 'thisWeek', label: '本周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
]

const SORTS = [
  { key: 'dateDesc', label: '日期 ↓' },
  { key: 'dateAsc', label: '日期 ↑' },
  { key: 'mostDesc', label: '出单最多' },
  { key: 'mostAsc', label: '出单最少' },
]

function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
const fmtQty = (q) => (q && q > 1 ? `${q} 单` : '1 单')
const dispDate = (v) => (v ? String(v).replace(/-/g, '/') : '未填日期')

// PC 版出单记录。
// 分组、筛选、排序口径与手机版 OrdersPage 一致（按品名聚合）；
// 手机版点卡片弹底部面板看明细，PC 改成行内展开，功能对齐：
// 每天的明细、单条编辑/删除、按天删除、以及「继续新增一单」。
export function PcOrders() {
  const { show } = useToast()
  const { orders, addOrder, updateOrder, deleteOrder } = useStore()
  const [accountFilter, setAccountFilter] = useState('')
  const [dateRange, setDateRange] = useState('yesterday') // 与手机版同默认值
  const [sortKey, setSortKey] = useState('dateDesc')
  const [productFilter, setProductFilter] = useState('')
  const [expanded, setExpanded] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [formSeq, setFormSeq] = useState(0)

  const list = useMemo(() => {
    return [...(orders || [])].sort((a, b) => {
      const ta = parseTs(a?.date), tb = parseTs(b?.date)
      if (ta !== null && tb !== null) return tb - ta
      if (ta === null && tb === null) return 0
      return ta === null ? 1 : -1
    })
  }, [orders])

  const filtered = useMemo(() => {
    let arr = list
    if (accountFilter) arr = arr.filter((o) => o.account === accountFilter)
    if (productFilter) arr = arr.filter((o) => (o.name || '') === productFilter)
    const bounds = dateBounds(dateRange)
    if (bounds) {
      const [s, e] = bounds
      arr = arr.filter((o) => {
        const t = parseTs(o?.date)
        return t !== null && t >= s && t < e
      })
    }
    return arr
  }, [list, accountFilter, productFilter, dateRange])

  const groups = useMemo(() => {
    const map = new Map()
    for (const o of filtered) {
      const k = o.name || '(未命名)'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(o)
    }
    const arr = []
    for (const [name, entries] of map.entries()) {
      arr.push({
        name,
        entries,
        count: entries.length,
        qty: entries.reduce((s, e) => s + (Number(e.qty) || 0), 0),
        latest: entries.find((e) => e.date)?.date || '',
        accounts: [...new Set(entries.map((e) => e.account).filter(Boolean))],
      })
    }
    const byDate = (a, b) => {
      const ta = a.latest ? parseTs(a.latest) : null
      const tb = b.latest ? parseTs(b.latest) : null
      if (ta === null && tb === null) return a.name.localeCompare(b.name, 'zh')
      if (ta === null) return 1
      if (tb === null) return -1
      if (ta === tb) return a.name.localeCompare(b.name, 'zh')
      return sortKey === 'dateAsc' ? ta - tb : tb - ta
    }
    arr.sort((a, b) => {
      if (sortKey === 'dateDesc' || sortKey === 'dateAsc') return byDate(a, b)
      const dir = sortKey === 'mostAsc' ? 1 : -1
      if (a.qty !== b.qty) return (a.qty - b.qty) * dir
      if (a.count !== b.count) return (a.count - b.count) * dir
      const ta = a.latest ? parseTs(a.latest) : null
      const tb = b.latest ? parseTs(b.latest) : null
      if (ta !== null && tb !== null) return (tb - ta) * dir
      if (ta === null && tb === null) return a.name.localeCompare(b.name, 'zh')
      return ta === null ? 1 : -1
    })
    return arr
  }, [filtered, sortKey])

  const productOptions = useMemo(
    () => [...new Set((orders || []).map((o) => o.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh')),
    [orders],
  )
  const accountOptions = useMemo(
    () => [...new Set((orders || []).map((o) => o.account).filter(Boolean))],
    [orders],
  )

  // 明细按日期分组（同一天的合并成一行）
  const byDay = (entries) => {
    const map = new Map()
    for (const e of entries) {
      const k = e.date || ''
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(e)
    }
    return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])))
  }

  const openEdit = (o) => { setEditing(o); setFormSeq((s) => s + 1); setModalOpen(true) }
  const handleSave = (payload) => {
    if (!payload.name) { show('请填写品名', 'error'); return }
    if (editing) { updateOrder(editing.id, payload); show('已更新', 'success') }
    else { addOrder(payload); show('已记一笔出单', 'success') }
    setModalOpen(false)
    setEditing(null)
  }
  const delEntry = (o) => {
    if (!window.confirm(`删除「${o.name}」这笔出单记录？`)) return
    deleteOrder(o.id)
    show('已删除', 'success')
  }
  const delDay = (name, date, entries) => {
    if (!window.confirm(`删除「${name}」${dispDate(date)} 的 ${entries.length} 笔出单？`)) return
    entries.forEach((e) => deleteOrder(e.id))
    show('已删除该天的出单', 'success')
  }

  const totalQty = filtered.reduce((s, o) => s + (Number(o.qty) || 0), 0)

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">出单记录</div>
          <div className="pcv-sub">{filtered.length} 笔 · 共 {totalQty} 单 · {groups.length} 个产品</div>
        </div>
        <div className="pcv-spacer" />
        <select className="pcv-input" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
          <option value="">全部产品</option>
          {productOptions.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="pcv-btn" onClick={() => { setEditing(null); setPrefill(null); setFormSeq((s) => s + 1); setModalOpen(true) }}>记出单</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none', flexWrap: 'wrap' }}>
          {RANGES.map((r) => (
            <button key={r.key} className={dateRange === r.key ? 'on' : ''} onClick={() => setDateRange(r.key)}>{r.label}</button>
          ))}
          <input
            type="date"
            className="pcv-input"
            style={{ padding: '4px 8px' }}
            onChange={(e) => setDateRange(e.target.value ? `day:${e.target.value}` : '')}
          />
        </div>

        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <button className={accountFilter === '' ? 'on' : ''} onClick={() => setAccountFilter('')}>全部账号</button>
          {accountOptions.map((a) => (
            <button key={a} className={accountFilter === a ? 'on' : ''} onClick={() => setAccountFilter(a)}>{a}</button>
          ))}
          {/* 排序组紧靠账号筛选右边，不再用 spacer 顶到最右（与样品页统一） */}
          <div className="pcv-sortgrp">
            {SORTS.map((s) => (
              <button key={s.key} className={sortKey === s.key ? 'on' : ''} onClick={() => setSortKey(s.key)}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 260 }}>产品</th>
                <th style={{ width: 200 }}>账号</th>
                <th style={{ width: 90 }}>笔数</th>
                <th style={{ width: 90 }}>出单量</th>
                <th style={{ width: 150 }}>最近出单</th>
                <th style={{ width: 110 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="pcv-empty">当前筛选下暂无出单</td>
                </tr>
              ) : groups.map((g) => {
                const open = expanded === g.name
                return (
                  <Fragment key={g.name}>
                    <tr>
                      <td className="pcv-name" title={g.name}>{g.name}</td>
                      <td>
                        {g.accounts.length === 0 ? (
                          <span style={{ color: '#9aa0a9' }}>—</span>
                        ) : (
                          g.accounts.map((a) => (
                            <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 10, whiteSpace: 'nowrap' }}>
                              {/* 账号名本身带账号主题色（去掉原来的小圆点） */}
                              <span style={{ color: (ACCOUNT_COLOR[a] || {}).c || '#4b5563', fontWeight: 600 }}>{a}</span>
                            </span>
                          ))
                        )}
                      </td>
                      <td className="pcv-num">{g.count}</td>
                      <td className="pcv-num" style={{ color: '#b96a66' }}>{g.qty}</td>
                      <td style={{ color: g.latest ? '#4b5563' : '#c9cdd4' }}>{g.latest ? dispDate(g.latest) : '未填日期'}</td>
                      <td>
                        <button className="pcv-btn-text" onClick={() => setExpanded(open ? '' : g.name)}>{open ? '收起明细' : '查看明细'}</button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} style={{ background: '#fafbfc', padding: '10px 14px' }}>
                          {byDay(g.entries).map(([date, entries]) => (
                            <div key={date} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '5px 0' }}>
                              <span className="pcv-chip" style={{ background: '#f0f1f4', color: '#6b7280' }}>{dispDate(date)}</span>
                              {entries.map((e) => (
                                <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, opacity: 0.55, background: (ACCOUNT_COLOR[e.account] || {}).c || '#c9cdd4' }} />
                                  <span style={{ fontSize: 12, color: '#4b5563' }}>{e.account || '未指定'} · {fmtQty(e.qty)}</span>
                                  <button className="pcv-btn-text" onClick={() => openEdit(e)}>改</button>
                                  <button className="pcv-x" title="删除这一笔" onClick={() => delEntry(e)}>×</button>
                                </span>
                              ))}
                              <button className="pcv-btn-text" style={{ color: '#b96a66' }} onClick={() => delDay(g.name, date, entries)}>删除该天</button>
                            </div>
                          ))}
                          <button
                            className="pcv-btn pcv-btn-ghost"
                            style={{ marginTop: 8 }}
                            onClick={() => {
                              const acc = g.entries.find((e) => e.account)?.account || ''
                              const sid = g.entries.find((e) => e.sampleId)?.sampleId || ''
                              setEditing(null)
                              setPrefill({ account: acc, sampleId: sid })
                              setFormSeq((s) => s + 1)
                              setModalOpen(true)
                            }}
                          >继续新增一单</button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑/新增单笔出单：复用手机版的表单弹窗（PC 上不再跳页面） */}
      <OrderFormModal
        key={formSeq}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setPrefill(null) }}
        editing={editing}
        onSave={handleSave}
        prefill={prefill}
      />
    </>
  )
}
