import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { OrderDialog } from '../components/OrderDialog'
import { ResetButton } from '../components/ResetButton'
import { dateBounds } from '../../components/DateFilterBar'
import { ACCOUNTS, ACCOUNT_COLOR, maskAccount } from '../../utils/accounts'

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
  const { orders, updateOrder, deleteOrder, hiddenAccounts } = useStore()
  const [accountFilter, setAccountFilter] = useState('')
  const [dateRange, setDateRange] = useState('yesterday') // 与手机版同默认值
  const [sortKey, setSortKey] = useState('dateDesc')
  // 「出单数量」默认只显示总数，点开才列出每个账号（用户要求）
  const [qtyOpen, setQtyOpen] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [expanded, setExpanded] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  // 「记出单」（新增）走 OrderDialog：账号 Tab 切换、一次可记多个账号。
  // modalOpen 只留给「编辑单笔」——一条出单只属于一个账号，没有多账号这回事。
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
    // 可排序的列：最近出单 / 出单数量 / 笔数（用户要求「点击可以排序」）
  // 首次点某列 → 默认降序；再点同一列 → 切升序。
  const SORT_FIELDS = ['date', 'qty', 'count']
  const sortField = (() => {
    const m = /^(date|qty|count)(Desc|Asc)$/.exec(String(sortKey || ''))
    return m ? m[1] : 'date'
  })()
  const sortDir = /Asc$/.test(String(sortKey || '')) ? 'asc' : 'desc'
  const sortDirOf = (field) => (sortField === field ? sortDir : null)
  const toggleSort = (field) => {
    if (!SORT_FIELDS.includes(field)) return
    const cur = sortDirOf(field)
    setSortKey(cur === 'desc' ? `${field}Asc` : `${field}Desc`)
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
    // 搜索框：按产品名「包含」匹配（不再是精确等于）
    if (productFilter.trim()) arr = arr.filter((o) => (o.name || '').includes(productFilter.trim()))
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
        // 每个账号各出了多少（用户要求「列出每个账号是多少」）
        qtyByAccount: (() => {
          const m = new Map()
          for (const e of entries) {
            const a = e.account || '未指定'
            m.set(a, (m.get(a) || 0) + (Number(e.qty) > 0 ? Number(e.qty) : 1))
          }
          const rank = (x) => {
            const i = ACCOUNTS.indexOf(x)
            return i === -1 ? 999 : i
          }
          return [...m.entries()].sort((p, q) => rank(p[0]) - rank(q[0]) || q[1] - p[1])
        })(),
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
      return sortDirOf('date') === 'asc' ? ta - tb : tb - ta
    }
    arr.sort((a, b) => {
      if (sortField === 'date') return byDate(a, b)
      const dir = sortDir === 'asc' ? 1 : -1
      const key = sortField === 'count' ? 'count' : 'qty'
      if (a[key] !== b[key]) return (a[key] - b[key]) * dir
      // 数值相同 → 按最近出单倒序兜底，结果稳定
      const ta = a.latest ? parseTs(a.latest) : null
      const tb = b.latest ? parseTs(b.latest) : null
      if (ta !== null && tb !== null && ta !== tb) return tb - ta
      return a.name.localeCompare(b.name, 'zh')
    })
    return arr
  }, [filtered, sortKey])

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

  const openEdit = (o) => { setEditing(o); setModalOpen(true) }
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
  // 表格底部合计行（用户要求「加个总数」）
  const totalCount = filtered.length

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">出单记录</div>
          <div className="pcv-sub">{filtered.length} 笔 · 共 {totalQty} 件 · {groups.length} 个产品</div>
        </div>
        <div className="pcv-spacer" />
        {/* 产品筛选：直接一个搜索框（用户要求「改成搜索框」），边输边筛，不用展开下拉 */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            className="pcv-input"
            style={{ width: 200 }}
            placeholder="搜索产品名…"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            title="按产品名搜索（包含匹配）"
          />
          {productFilter && (
            <button className="pcv-btn-text" onClick={() => setProductFilter('')} title="清空搜索">×</button>
          )}
        </div>
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
          {/* 「重置」靠左：紧跟日期选择器之后（去掉 spacer，不再顶到行尾） */}
          <ResetButton active={hasFilter} onClick={resetFilters} />
        </div>

        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <button className={accountFilter === '' ? 'on' : ''} onClick={() => setAccountFilter('')}>全部账号</button>
          {accountOptions.map((a) => (
            <button key={a} className={accountFilter === a ? 'on' : ''} onClick={() => setAccountFilter(a)}>{maskAccount(a, hiddenAccounts)}</button>
          ))}
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 260 }}>产品</th>
                <th style={{ width: 200 }}>账号</th>
                {/* 出单数量（qty 合计）与笔数分开显示（用户要求「加一列出单数量」）；
                    两列都可点表头排序（用户要求「点击可以排序」） */}
                <th style={{ width: 190 }} className="pcv-th-sort" onClick={() => toggleSort('qty')}>
                  出单数量{sortDirOf('qty') ? (sortDirOf('qty') === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th style={{ width: 90 }} className="pcv-th-sort" onClick={() => toggleSort('count')}>
                  笔数{sortDirOf('count') ? (sortDirOf('count') === 'desc' ? ' ↓' : ' ↑') : ''}
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
                      <td className="pcv-name" title={g.name}>
                        {/* 产品名前的小箭头：点它展开/收起明细（用户要求加箭头）。
                            用 SVG 不用 ▸ 字符 —— 字符在部分字体下会缺字形。
                            右列「查看明细」按钮保留，两个入口都能用。 */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <button
                            className="pcv-caret"
                            title={open ? '收起明细' : '展开明细'}
                            onClick={() => setExpanded(open ? '' : g.name)}
                          >
                            {/* 实心三角（不用 chevron 折线）：收起时朝右、展开时旋转 90° 朝下 */}
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
                              style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }}
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                        </span>
                      </td>
                      <td>
                        {g.accounts.length === 0 ? (
                          <span style={{ color: '#9aa0a9' }}>—</span>
                        ) : (
                          g.accounts.map((a, i) => (
                            <span
                              key={a}
                              style={{
                                display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
                                marginRight: i < g.accounts.length - 1 ? 12 : 0,
                              }}
                            >
                              {/* 账号名前一个**专属颜色**的圆点（广东刘亦菲琥珀 / 晚梨青绿 /
                                  努力成为富婆玫红，取 ACCOUNT_COLOR.c），多账号时一眼分得清 */}
                              <span
                                aria-hidden="true"
                                style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: (ACCOUNT_COLOR[a] || {}).c || '#c1c7cf',
                                  marginRight: 6, flexShrink: 0,
                                }}
                              />
                              {/* 圆点带色，账号名本身仍保持中性色（与样品页/发布记录页一致） */}
                              <span style={{ color: '#333a45' }}>{maskAccount(a, hiddenAccounts)}</span>
                            </span>
                          ))
                        )}
                      </td>
                      {/* 出单数量：默认只显示**总数**，点一下再展开每个账号的明细（用户要求） */}
                      <td
                        style={{ whiteSpace: 'nowrap' }}
                        title={`合计 ${g.qty} 件 · 点数字展开每个账号`}
                      >
                        {g.qtyByAccount.length === 0 ? (
                          <span style={{ color: '#c9cdd4' }}>—</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setQtyOpen((v) => (v === g.name ? '' : g.name))}
                              style={{
                                border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                                fontSize: 14, fontWeight: 700, color: '#b8517f',
                              }}
                            >{g.qty}</button>
                            {qtyOpen === g.name && (
                              <div style={{ marginTop: 4 }}>
                                {g.qtyByAccount.map(([a, v]) => (
                                  <span key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, lineHeight: 1.7 }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: (ACCOUNT_COLOR[a] || {}).c || '#c1c7cf' }} />
                                    <span style={{ color: '#4b5563' }}>{maskAccount(a, hiddenAccounts)}</span>
                                    <span style={{ marginLeft: 6, fontWeight: 700, color: '#b8517f' }}>{v}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      {/* 笔数：常规字重、不加粗 */}
                      <td className="pcv-num" style={{ fontWeight: 400 }}>{g.count}</td>
                      <td style={{ color: g.latest ? '#4b5563' : '#c9cdd4' }}>{g.latest ? dispDate(g.latest) : '未填日期'}</td>
                      <td>
                        {/* 「查看明细 / 收起明细」去掉（产品名前的三角箭头已经承担这个功能）。
                            这一列改成「编辑」：直接编辑该产品最近的一笔出单；
                            更早的每一笔，展开后在明细行里各自有「编辑 / 删除」。 */}
                        <button
                          className="pcv-btn-text"
                          title="编辑最近一笔出单"
                          onClick={() => {
                            const latest = [...g.entries].sort(
                              (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
                            )[0]
                            if (latest) openEdit(latest)
                          }}
                        >编辑</button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={5} style={{ background: '#fafbfc', padding: '6px 14px 10px' }}>
                          {/* 明细用 grid 对齐：日期 / 条目（+ 当天操作）。
                              原来是 flex-wrap 拼在一起，「日期 chip + 账号·数量 + 改 + × + 删除该天」
                              全在一个流里，行与行之间还对不齐，用户反馈「不好看」。
                              「删除该天」放在条目后面而不是推到表格最右 —— 表格很宽时它会孤零零浮在右边。 */}
                          <div className="pcv-detaillist">
                            {byDay(g.entries).map(([date, entries], di, allDays) => (
                              <div key={date} className="pcv-detailrow">
                                <span className="pcv-detaildate">{dispDate(date)}</span>
                                <span className="pcv-detailentries">
                                  {entries.map((e) => (
                                    <span key={e.id} className="pcv-detailentry">
                                      {/* 账号前的彩色圆点，与上方汇总行一致 */}
                                      <span
                                        aria-hidden="true"
                                        style={{
                                          width: 5, height: 5, borderRadius: '50%',
                                          background: (ACCOUNT_COLOR[e.account] || {}).c || '#c1c7cf',
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span className="pcv-detailacct">{e.account || '未指定'}</span>
                                      {/* 数量显示成醒目的「×2」小胶囊（用户要求更醒目） */}
                                      <span
                                        className="pcv-detailqty"
                                        title={`这一笔 ${Number(e.qty) > 0 ? Number(e.qty) : 1} 件`}
                                        style={{
                                          fontWeight: 700, color: '#5f8a74',
                                          background: 'rgba(95,138,116,0.12)', borderRadius: 6, padding: '0 6px',
                                        }}
                                      >×{Number(e.qty) > 0 ? Number(e.qty) : 1}</span>
                                      <button className="pcv-detailact" onClick={() => openEdit(e)}>编辑</button>
                                      <button
                                        className="pcv-detailact pcv-detailact--danger"
                                        title="删除这一笔"
                                        onClick={() => delEntry(e)}
                                      >删除</button>
                                    </span>
                                  ))}
                                </span>
                                {/* 行尾：「＋ 继续新增一单」与「删除该天」同一行（用户要求「一行显示」） */}
                                <span className="pcv-detailrowend" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                  {di === allDays.length - 1 && (
                                    <button
                                      className="pcv-detailact"
                                      onClick={() => {
                                        const acc = g.entries.find((e) => e.account)?.account || ''
                                        const sid = g.entries.find((e) => e.sampleId)?.sampleId || ''
                                        setPrefill({ account: acc, sampleId: sid })
                                        setOrderOpen(true)
                                      }}
                                    >＋ 继续新增一单</button>
                                  )}
                                  <button
                                    className="pcv-detailact pcv-detailact--danger"
                                    title="删除这一天的全部记录"
                                    onClick={() => delDay(g.name, date, entries)}
                                  >删除该天</button>
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* 「继续新增一单」放在明细右下角，用文字按钮，不占一整行 */}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            {/* 合计行：跟着筛选变化（用户要求「加个总数」） */}
            {groups.length > 0 && (
              <tfoot>
                <tr style={{ background: '#faf7fb' }}>
                  <td style={{ fontWeight: 700, color: '#334155' }}>合计（{groups.length} 个产品）</td>
                  <td />
                  <td style={{ fontWeight: 700, color: '#b8517f', fontSize: 14 }}>{totalQty}</td>
                  <td style={{ fontWeight: 700 }}>{totalCount}</td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 编辑单笔出单：用 PC 自己的弹窗（不再复用手机版 OrderFormModal，用户反馈「怎么变成了手机弹窗」） */}
      {modalOpen && editing && (
        <OrderDialog
          editing={editing}
          onClose={() => { setModalOpen(false); setEditing(null); setPrefill(null) }}
        />
      )}

      {/* 记出单（新增）：账号 Tab 切换，一次可记多个账号 */}
      {orderOpen && (
        <OrderDialog prefill={prefill} onClose={() => { setOrderOpen(false); setPrefill(null) }} />
      )}
    </>
  )
}
