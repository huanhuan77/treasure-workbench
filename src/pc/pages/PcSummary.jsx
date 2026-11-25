import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { ACCOUNTS, ACCOUNT_COLOR, maskAccount } from '../../utils/accounts'
import { PERIODS, periodRange, buildSummary, buildMonthlyTrend, buildCategoryShare, buildTopProductRows, daysBetween } from '../../utils/summary'
import { makeMonthlyOption, makePieOption, makeAccountOption, makeAccountOrderOption } from '../../utils/chartOptions'
import { EChart } from '../../components/EChart'
import { TopProductBars } from '../../components/TopProductBars'
import { DateRangePicker } from '../components/DateRangePicker'

// PC 版「周 / 月总结」：只做**数据**（用户要求「只要数据表格，不需要文案」）。
// 口径见 utils/summary.js：周=周一~周日、月=自然月；发布/出单/收支/样品/待办各自按区间取数。
const fmtInt = (n) => String(Number(n) || 0)

export function PcSummary() {
  const { samples, publishRecords, orders, transactions, todos, hiddenAccounts } = useStore()
  // 默认「本月」（用户要求）：进来先看自然月，不再默认本周
  const [period, setPeriod] = useState('month')
  // 自定义日期区间（用户要求「加个日期期间选择」）：选了日期就切到 custom，清空则回到预设
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const range = useMemo(() => {
    if (customStart && customEnd) {
      const s = customStart <= customEnd ? customStart : customEnd
      const e = customStart <= customEnd ? customEnd : customStart
      return { key: 'custom', start: s, end: e, label: `${s} ~ ${e}` }
    }
    return periodRange(period)
  }, [period, customStart, customEnd])
  const sum = useMemo(
    () => buildSummary({ samples, publishRecords, orders, transactions, todos }, range),
    [samples, publishRecords, orders, transactions, todos, range],
  )
  const mask = (a) => maskAccount(a, hiddenAccounts)

  // 近 6 个月（发布 / 出单 / 转化率）
  const monthly = useMemo(
    () => buildMonthlyTrend({ samples, publishRecords, orders, transactions, todos }, 6),
    [samples, publishRecords, orders, transactions, todos],
  )
  // 分类占比（可按发布条数或出单件数看）
  const [catMetric, setCatMetric] = useState('publish')
  const catShare = useMemo(
    () => buildCategoryShare({ samples, publishRecords, orders }, range, catMetric),
    [samples, publishRecords, orders, range, catMetric],
  )

  // 分账号对比柱状图（账号名跟随「隐藏账号」打码）
  const accountOption = useMemo(() => makeAccountOption(sum.accounts, mask), [sum.accounts, hiddenAccounts])
  // 按账号出单量对比：固定按「出单件数」（qty 合计，用户确认不需要笔数切换）
  const accountOrderOption = useMemo(
    () => makeAccountOrderOption(sum.accounts, mask, 'qty'),
    [sum.accounts, hiddenAccounts],
  )

  // 按产品明细的排序：默认「出单件数」降序（用户要求），点表头可切换列与升降序
  const [prodSort, setProdSort] = useState({ key: 'order', dir: 'desc' })
  // 产品搜索 + 账号筛选（用户要求「加上产品搜索条件和账号搜索条件」）
  const [prodQ, setProdQ] = useState('')
  const [prodAcc, setProdAcc] = useState('all')
  const toggleProdSort = (key) => {
    setProdSort((p) => (p.key === key ? { key, dir: p.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  }
  // 账号筛选候选：这个区间里「按产品明细」出现过的账号（按固定顺序 + 兜底）
  const prodAccOptions = useMemo(() => {
    const set = new Set()
    for (const r of (sum.products || [])) {
      for (const a of Object.keys(r.accOrder || {})) set.add(a)
      for (const a of Object.keys(r.accPublish || {})) set.add(a)
    }
    const known = ACCOUNTS.filter((a) => set.has(a))
    const other = [...set].filter((a) => !ACCOUNTS.includes(a))
    return [...known, ...other]
  }, [sum.products])
  // 每行先算出「各账号的单量」，再按搜索词 / 账号条件过滤，最后按当前排序列排序
  const sortedProducts = useMemo(() => {
    const q = prodQ.trim().toLowerCase()
    const list = []
    for (const r of (sum.products || [])) {
      if (q && !String(r.name || '').toLowerCase().includes(q)) continue
      const accOrder = r.accOrder || {}
      const accPublish = r.accPublish || {}
      const perAcc = [...new Set([...Object.keys(accOrder), ...Object.keys(accPublish)])].map((a) => ({
        name: a,
        qty: accOrder[a] || 0,
        publish: accPublish[a] || 0,
      }))
      // 单量从多到少，同量再按发布多的在前，最后按固定账号顺序
      const rank = (a) => { const i = ACCOUNTS.indexOf(a); return i === -1 ? 999 : i }
      perAcc.sort((x, y) => (y.qty - x.qty) || (y.publish - x.publish) || (rank(x.name) - rank(y.name)))
      if (prodAcc !== 'all') {
        const hit = perAcc.find((x) => x.name === prodAcc)
        if (!hit) continue
        list.push({ ...r, perAcc, publish: hit.publish, orderQty: hit.qty })
      } else {
        list.push({ ...r, perAcc })
      }
    }
    const val = (r) => (prodSort.key === 'publish' ? r.publish : r.orderQty)
    list.sort((a, b) => (prodSort.dir === 'desc' ? val(b) - val(a) : val(a) - val(b)))
    return list
  }, [sum.products, prodSort, prodQ, prodAcc])
  const prodFiltering = !!prodQ.trim() || prodAcc !== 'all'
  // 出单 Top 10 产品：横向柱状图，按账号分段；跟随同一个账号筛选
  const topRows = useMemo(
    () => buildTopProductRows(sum.products || [], { limit: 10, account: prodAcc }),
    [sum.products, prodAcc],
  )
  const topMax = topRows.length ? topRows[0].total : 1
  const sortMark = (key) => (prodSort.key === key ? (prodSort.dir === 'desc' ? ' ↓' : ' ↑') : '')
  const monthlyOption = useMemo(() => makeMonthlyOption(monthly), [monthly])
  const pieOption = useMemo(() => makePieOption(catShare), [catShare])
  // 顶部指标：只留「发布 / 出单 / 样品」这三类（用户要求去掉收入、净收入、完成待办）
  const metrics = [
    { label: '发布条数', value: fmtInt(sum.publish), sub: `${sum.publishRecords} 条记录`, accent: '#3f6fa8' },
    { label: '出单件数', value: fmtInt(sum.orderQty), sub: `${sum.orderCount} 笔`, accent: '#4f8a6d' },
    { label: '新增样品', value: fmtInt(sum.newSamples), sub: `逾期 ${sum.overdueSamples} 个`, accent: '#7a5ea8' },
  ]

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">周 / 月总结</div>
          <div className="pcv-sub">
            {range.label} · 共 {daysBetween(range.start, range.end)} 天
          </div>
        </div>
        <div className="pcv-spacer" />
        {/* 期间切换：本周 / 上周 / 本月 / 上月 + 自定义日期区间 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={(!customStart && !customEnd && period === p.key) ? 'pcv-btn' : 'pcv-btn pcv-btn-ghost'}
              onClick={() => { setCustomStart(''); setCustomEnd(''); setPeriod(p.key) }}
            >{p.label}</button>
          ))}
          {/* 自定义区间：日期范围选择器（左侧快捷区间 + 双月日历，用户要求「时间范围选择用这种」） */}
          <div style={{ marginLeft: 6 }}>
            <DateRangePicker
              start={customStart}
              end={customEnd}
              onChange={({ start, end }) => { setCustomStart(start); setCustomEnd(end) }}
              onClear={() => { setCustomStart(''); setCustomEnd('') }}
            />
          </div>
        </div>
      </div>

      <div className="pcv-body">
        <div className="pcv-metrics" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {metrics.map((m) => (
            <div key={m.label} className="pcv-metric" style={{ borderLeft: `3px solid ${m.accent}` }}>
              <div className="pcv-metric-body">
                <div className="pcv-metric-label">{m.label}</div>
                <div className="pcv-metric-value" style={{ color: m.accent, fontSize: 22 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: '#9aa0a9', marginTop: 2 }}>{m.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 区间内新增的样品：放统计卡片下面，用户要求放前面 */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>区间内新增的样品</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>{sum.newSamples} 个</span>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sum.newSampleList.length === 0 ? (
              <span style={{ fontSize: 12, color: '#9aa0a9' }}>这个区间没有新增样品</span>
            ) : sum.newSampleList.map((s, i) => (
              <span
                key={`${s.name}-${i}`}
                style={{
                  fontSize: 12, padding: '3px 9px', borderRadius: 999,
                  background: '#f3f4f6', color: '#4b5563', whiteSpace: 'nowrap',
                }}
                title={s.status}
              >{s.name}</span>
            ))}
          </div>
        </div>

        {/* 图表区（ECharts 按需引入）：期间趋势 + 近 6 个月趋势/转化率 + 分类占比 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div className="pcv-card">
            <div className="pcv-card-h">
              <span style={{ fontWeight: 600 }}>按账号出单量对比</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                出单件数 · {range.label}
              </span>
            </div>
            {sum.accounts.length === 0 ? (
              <div className="pcv-empty">这个区间没有数据</div>
            ) : (
              <div style={{ padding: '10px 12px 12px' }}>
                <EChart option={accountOrderOption} height={240} />
              </div>
            )}
          </div>

          <div className="pcv-card">
            <div className="pcv-card-h">
              <span style={{ fontWeight: 600 }}>近 6 个月趋势 / 出单转化</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                柱：发布、出单 · 线：转化率（出单 ÷ 发布）
              </span>
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <EChart option={monthlyOption} height={240} />
            </div>
          </div>
        </div>

        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>分类占比</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>{range.label}</span>
            <div className="pcv-spacer" />
            {/* 切换口径：按发布条数 / 按出单件数 */}
            <button
              className={catMetric === 'publish' ? 'pcv-btn' : 'pcv-btn pcv-btn-ghost'}
              onClick={() => setCatMetric('publish')}
            >按发布条数</button>
            <button
              className={catMetric === 'order' ? 'pcv-btn' : 'pcv-btn pcv-btn-ghost'}
              style={{ marginLeft: 6 }}
              onClick={() => setCatMetric('order')}
            >按出单件数</button>
          </div>
          {catShare.length === 0 ? (
            <div className="pcv-empty">这个区间没有数据</div>
          ) : (
            <div style={{ padding: '6px 12px 10px' }}>
              <EChart option={pieOption} height={260} />
            </div>
          )}
        </div>

        {/* 分账号明细：做成图表（用户要求「做成图表」）——分组柱 + 柱顶数值 */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>分账号明细</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              发布 / 出单 / 新增产品 · {range.label}
            </span>
          </div>
          {sum.accounts.length === 0 ? (
            <div className="pcv-empty">这个区间没有数据</div>
          ) : (
            <div style={{ padding: '10px 12px 12px' }}>
              <EChart option={accountOption} height={260} />
            </div>
          )}
        </div>

        {/* 出单 Top 10 产品：横向柱状图，每条按账号分段标色，可按账号筛选（与下方明细联动） */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>出单 Top 10 产品</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              按出单件数 · {range.label}{prodAcc !== 'all' ? ` · 只看 ${mask(prodAcc)}` : ''}
            </span>
            <div className="pcv-spacer" />
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <button
                className={prodAcc === 'all' ? 'pcv-btn' : 'pcv-btn pcv-btn-ghost'}
                style={{ height: 26 }}
                onClick={() => setProdAcc('all')}
              >全部账号</button>
              {prodAccOptions.map((a) => {
                const col = ACCOUNT_COLOR[a] || {}
                const on = prodAcc === a
                return (
                  <button
                    key={a}
                    onClick={() => setProdAcc(on ? 'all' : a)}
                    style={{
                      height: 26, padding: '0 10px', borderRadius: 999, cursor: 'pointer', fontSize: 12,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: on ? (col.bg || 'rgba(0,0,0,0.06)') : '#fff',
                      border: on ? `1px solid ${col.c || '#c1c7cf'}` : '1px solid #e5e7eb',
                      color: on ? '#333a45' : '#6b7280', fontWeight: on ? 600 : 400,
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: col.c || '#c1c7cf' }} />
                    {mask(a)}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ padding: '10px 14px 14px' }}>
            <TopProductBars rows={topRows} mask={mask} rotate={0} shortLen={7} height={310} />
          </div>
        </div>

        {/* 按产品明细：哪个品发了多少、出了多少单（用户要求「要统计具体的」）；
            再加产品搜索 + 账号筛选 + 各账号单量（用户要求「列出每个账号是多少，加上产品搜索条件和账号搜索条件」） */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>按产品明细</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              {sortedProducts.length}
              {prodFiltering ? ` / ${sum.products.length}` : ''} 个产品 · 按{prodSort.key === 'order' ? '出单件数' : '发布条数'}{prodSort.dir === 'desc' ? '降序' : '升序'}
              {prodAcc !== 'all' ? ` · 只看 ${mask(prodAcc)}` : ''}
            </span>
          </div>
          {/* 筛选行：产品名搜索框 + 账号胶囊 */}
          <div style={{ padding: '0 14px 10px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={prodQ}
              onChange={(e) => setProdQ(e.target.value)}
              placeholder="搜索产品名…"
              style={{
                width: 200, height: 28, padding: '0 10px', fontSize: 12,
                border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff',
              }}
            />
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <button
                className={prodAcc === 'all' ? 'pcv-btn' : 'pcv-btn pcv-btn-ghost'}
                style={{ height: 26 }}
                onClick={() => setProdAcc('all')}
              >全部账号</button>
              {prodAccOptions.map((a) => {
                const col = ACCOUNT_COLOR[a] || {}
                const on = prodAcc === a
                return (
                  <button
                    key={a}
                    onClick={() => setProdAcc(on ? 'all' : a)}
                    style={{
                      height: 26, padding: '0 10px', borderRadius: 999, cursor: 'pointer', fontSize: 12,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: on ? (col.bg || 'rgba(0,0,0,0.06)') : '#fff',
                      border: on ? `1px solid ${col.c || '#c1c7cf'}` : '1px solid #e5e7eb',
                      color: on ? '#333a45' : '#6b7280', fontWeight: on ? 600 : 400,
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: col.c || '#c1c7cf' }} />
                    {mask(a)}
                  </button>
                )
              })}
            </span>
            {prodFiltering && (
              <button
                className="pcv-btn pcv-btn-ghost"
                style={{ height: 26 }}
                onClick={() => { setProdQ(''); setProdAcc('all') }}
              >清空筛选</button>
            )}
          </div>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 280 }}>产品</th>
                {/* 账号列：每个号后面跟自己的单量，按单量从多到少 */}
                <th style={{ width: 460 }}>账号（各号单量）</th>
                <th style={{ width: 110 }} className="pcv-th-sort" onClick={() => toggleProdSort('publish')}>
                  {prodAcc === 'all' ? '发布条数' : '发布条数（该号）'}{sortMark('publish')}
                </th>
                <th style={{ width: 130 }} className="pcv-th-sort" onClick={() => toggleProdSort('order')}>
                  {prodAcc === 'all' ? '出单件数' : '出单件数（该号）'}{sortMark('order')}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pcv-empty">
                    {prodFiltering ? '没有符合筛选的产品' : '这个区间没有数据'}
                  </td>
                </tr>
              ) : sortedProducts.map((r) => (
                <tr key={r.name}>
                  <td className="pcv-name" title={r.name}>{r.name}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.perAcc.length === 0 ? (
                      <span style={{ color: '#c9cdd4' }}>—</span>
                    ) : (
                      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
                        {(prodAcc === 'all' ? r.perAcc : r.perAcc.filter((x) => x.name === prodAcc)).map((x, i) => {
                          const col = ACCOUNT_COLOR[x.name] || {}
                          // 最多的那个号高亮：账号色淡底 + 描边 + 数字加粗，其余灰底
                          const top = i === 0 && x.qty > 0
                          return (
                            <span
                              key={x.name}
                              title={`${x.name}：出单 ${x.qty} 件 · 发布 ${x.publish} 条`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                                padding: '1px 8px 1px 6px', borderRadius: 999,
                                background: top ? (col.bg || 'rgba(0,0,0,0.06)') : 'rgba(0,0,0,0.035)',
                                border: top ? `1px solid ${col.c || '#c1c7cf'}` : '1px solid transparent',
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{ width: 6, height: 6, borderRadius: '50%', background: col.c || '#c1c7cf', flexShrink: 0 }}
                              />
                              <span style={{ color: '#333a45', fontSize: 12 }}>{mask(x.name)}</span>
                              <span style={{ fontWeight: 700, fontSize: 12, color: top ? (col.c || '#b8517f') : (x.qty ? '#6b7280' : '#b9bec6') }}>{x.qty}</span>
                            </span>
                          )
                        })}
                      </span>
                    )}
                  </td>
                  <td className="pcv-num">{fmtInt(r.publish)}</td>
                  <td className="pcv-num" style={prodAcc !== 'all' ? { fontWeight: 700 } : undefined}>{fmtInt(r.orderQty)}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 「按天明细」按用户要求去掉（保留分账号 / 按产品 / 新增样品三块） */}
      </div>
    </>
  )
}
