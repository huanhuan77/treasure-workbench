import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { OrderFormModal } from '../../components/OrderFormModal'
import { OrderDialog } from '../components/OrderDialog'
import { ResetButton } from '../components/ResetButton'
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

// 排序：日期、出单各**一个**按钮，点一下切升降序（见下方 toggleDateSort / toggleMostSort）。
// 原来是「日期↓、日期↑、出单最多、出单最少」四个按钮，用户要求全部合并成一个按钮切方向。

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
  // 「记出单」（新增）走 OrderDialog：账号 Tab 切换、一次可记多个账号。
  // modalOpen 只留给「编辑单笔」——一条出单只属于一个账号，没有多账号这回事。
  const [orderOpen, setOrderOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [formSeq, setFormSeq] = useState(0)

  // 从总览指标卡「新增」跳过来（/pc/orders?add=1）时直接打开记出单弹窗，随后清掉参数
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setOrderOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // 重置：产品 / 账号 / 时间范围 / 排序，回到进页面时的默认（时间范围默认「昨天」）
  const hasFilter = productFilter !== '' || accountFilter !== '' || dateRange !== 'yesterday' || sortKey !== 'dateDesc'
  const resetFilters = () => {
    setProductFilter('')
    setAccountFilter('')
    setDateRange('yesterday')
    setSortKey('dateDesc')
  }

  // 排序改成**点表头**（用户要求，把原来那排「日期 ↓ / 出单 ↓」按钮去掉）。
  // 只有「出单量」和「最近出单」两列可排 —— 正好对应原有的两个排序维度，没有新增口径。
  // 首次点某列 → 默认降序；再点同一列 → 切升序。
  const sortDirOf = (field) => {
    if (field === 'date') return sortKey === 'dateDesc' ? 'desc' : sortKey === 'dateAsc' ? 'asc' : null
    return sortKey === 'mostDesc' ? 'desc' : sortKey === 'mostAsc' ? 'asc' : null
  }
  const toggleSort = (field) => {
    const cur = sortDirOf(field)
    if (field === 'date') setSortKey(cur === 'desc' ? 'dateAsc' : 'dateDesc')
    else setSortKey(cur === 'desc' ? 'mostAsc' : 'mostDesc')
  }

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
        {/* 主操作紧跟产品下拉（与发布记录页一致，不再贴最右） */}
        <button className="pcv-btn" onClick={() => { setPrefill(null); setOrderOpen(true) }}>记出单</button>
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
          {/* inline：紧跟账号胶囊，不再被 spacer 顶到窗口最右端（与收支/追剧页一致） */}
          <ResetButton active={hasFilter} onClick={resetFilters} inline />
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 260 }}>产品</th>
                <th style={{ width: 200 }}>账号</th>
                <th style={{ width: 90 }}>笔数</th>
                <th style={{ width: 90 }} className="pcv-th-sort" onClick={() => toggleSort('most')}>
                  出单量{sortDirOf('most') ? (sortDirOf('most') === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th style={{ width: 150 }} className="pcv-th-sort" onClick={() => toggleSort('date')}>
                  最近出单{sortDirOf('date') ? (sortDirOf('date') === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
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
                              {/* 账号名不标账号主题色 —— 与样品页/发布记录页同一偏好 */}
                              <span style={{ color: '#333a45' }}>{a}</span>
                            </span>
                          ))
                        )}
                      </td>
                      {/* 笔数 / 出单量去掉加粗（用户要求）：只保留常规字重，
                          出单量仍用暗红标一下，但不靠粗体强调 */}
                      <td className="pcv-num" style={{ fontWeight: 400 }}>{g.count}</td>
                      <td className="pcv-num" style={{ fontWeight: 400, color: '#b96a66' }}>{g.qty}</td>
                      <td style={{ color: g.latest ? '#4b5563' : '#c9cdd4' }}>{g.latest ? dispDate(g.latest) : '未填日期'}</td>
                      <td>
                        <button className="pcv-btn-text" onClick={() => setExpanded(open ? '' : g.name)}>{open ? '收起明细' : '查看明细'}</button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} style={{ background: '#fafbfc', padding: '6px 14px 10px' }}>
                          {/* 明细用 grid 对齐：日期 / 条目（+ 当天操作）。
                              原来是 flex-wrap 拼在一起，「日期 chip + 账号·数量 + 改 + × + 删除该天」
                              全在一个流里，行与行之间还对不齐，用户反馈「不好看」。
                              「删除该天」放在条目后面而不是推到表格最右 —— 表格很宽时它会孤零零浮在右边。 */}
                          <div className="pcv-detaillist">
                            {byDay(g.entries).map(([date, entries]) => (
                              <div key={date} className="pcv-detailrow">
                                <span className="pcv-detaildate">{dispDate(date)}</span>
                                <span className="pcv-detailentries">
                                  {entries.map((e) => (
                                    <span key={e.id} className="pcv-detailentry">
                                      <span className="pcv-detailacct">{e.account || '未指定'}</span>
                                      {/* fmtQty 已经带「单」后缀，别再加 */}
                                      <span className="pcv-detailqty">{fmtQty(e.qty)}</span>
                                      {/* 操作统一成文字按钮：编辑 / 删除（原来一个「改」+ 一个「×」，
                                          含义不直白，也不好点） */}
                                      <button className="pcv-btn-text" style={{ marginLeft: 6 }} onClick={() => openEdit(e)}>编辑</button>
                                      <button
                                        className="pcv-btn-text"
                                        style={{ marginLeft: 8, color: '#b96a66' }}
                                        title="删除这一笔"
                                        onClick={() => delEntry(e)}
                                      >删除</button>
                                    </span>
                                  ))}
                                  <button
                                    className="pcv-btn-text"
                                    style={{ color: '#b96a66', marginLeft: 4 }}
                                    title="删除这一天的全部记录"
                                    onClick={() => delDay(g.name, date, entries)}
                                  >删除该天</button>
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            className="pcv-btn pcv-btn-ghost"
                            style={{ marginTop: 8 }}
                            onClick={() => {
                              const acc = g.entries.find((e) => e.account)?.account || ''
                              const sid = g.entries.find((e) => e.sampleId)?.sampleId || ''
                              setPrefill({ account: acc, sampleId: sid })
                              setOrderOpen(true)
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

      {/* 编辑单笔出单：复用手机版的表单弹窗（PC 上不再跳页面） */}
      <OrderFormModal
        key={formSeq}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setPrefill(null) }}
        editing={editing}
        onSave={handleSave}
        prefill={prefill}
      />

      {/* 记出单（新增）：账号 Tab 切换，一次可记多个账号 */}
      {orderOpen && (
        <OrderDialog prefill={prefill} onClose={() => { setOrderOpen(false); setPrefill(null) }} />
      )}
    </>
  )
}
