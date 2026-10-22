import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { ACCOUNT_COLOR, maskAccount } from '../../utils/accounts'
import { PERIODS, periodRange, buildSummary, buildTrendFor, buildMonthlyTrend, buildCategoryShare, daysBetween } from '../../utils/summary'
import { makePeriodOption, makeMonthlyOption, makePieOption, makeAccountOption } from '../../utils/chartOptions'
import { EChart } from '../../components/EChart'

// PC 版「周 / 月总结」：只做**数据**（用户要求「只要数据表格，不需要文案」）。
// 口径见 utils/summary.js：周=周一~周日、月=自然月；发布/出单/收支/样品/待办各自按区间取数。
const fmtInt = (n) => String(Number(n) || 0)

export function PcSummary() {
  const { samples, publishRecords, orders, transactions, todos, hiddenAccounts } = useStore()
  const [period, setPeriod] = useState('week')
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

  // 趋势柱：本周/上周 → 按天（7 根）；本月/上月 → 按周（自然周切分）
  const trend = useMemo(
    () => buildTrendFor({ samples, publishRecords, orders, transactions, todos }, range),
    [samples, publishRecords, orders, transactions, todos, range],
  )
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

  const periodOption = useMemo(() => makePeriodOption(trend.bars), [trend])
  // 分账号对比柱状图（账号名跟随「隐藏账号」打码）
  const accountOption = useMemo(() => makeAccountOption(sum.accounts, mask), [sum.accounts, hiddenAccounts])

  // 按产品明细的排序：默认「出单件数」降序（用户要求），点表头可切换列与升降序
  const [prodSort, setProdSort] = useState({ key: 'order', dir: 'desc' })
  const toggleProdSort = (key) => {
    setProdSort((p) => (p.key === key ? { key, dir: p.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  }
  const sortedProducts = useMemo(() => {
    const arr = [...(sum.products || [])]
    const val = (r) => (prodSort.key === 'publish' ? r.publish : r.orderQty)
    arr.sort((a, b) => (prodSort.dir === 'desc' ? val(b) - val(a) : val(a) - val(b)))
    return arr
  }, [sum.products, prodSort])
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
          {/* 自定义区间：两个日期框，选完立刻生效；右侧「清空」回到预设 */}
          <input
            className="pcv-input"
            type="date"
            style={{ width: 150, marginLeft: 6 }}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            title="开始日期"
          />
          <span style={{ color: '#9aa0a9' }}>~</span>
          <input
            className="pcv-input"
            type="date"
            style={{ width: 150 }}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            title="结束日期"
          />
          {(customStart || customEnd) && (
            <button
              className="pcv-btn-text"
              style={{ fontSize: 12, color: '#9aa0a9' }}
              onClick={() => { setCustomStart(''); setCustomEnd('') }}
            >清空</button>
          )}
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

        {/* 图表区（ECharts 按需引入）：期间趋势 + 近 6 个月趋势/转化率 + 分类占比 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div className="pcv-card">
            <div className="pcv-card-h">
              <span style={{ fontWeight: 600 }}>
                {range.key === 'custom'
                  ? `自定义区间（按${trend.mode === 'day' ? '天' : '周'}）`
                  : (trend.mode === 'day' ? '本周按天对比' : '本月按周对比')}
              </span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                发布 / 出单 · {range.label}
              </span>
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <EChart option={periodOption} height={240} />
            </div>
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

        {/* 按产品明细：哪个品发了多少、出了多少单（用户要求「要统计具体的」） */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>按产品明细</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              {sum.products.length} 个产品 · 按{prodSort.key === 'order' ? '出单件数' : '发布条数'}{prodSort.dir === 'desc' ? '降序' : '升序'}
            </span>
          </div>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 300 }}>产品</th>
                <th style={{ width: 230 }}>账号</th>
                <th style={{ width: 120 }} className="pcv-th-sort" onClick={() => toggleProdSort('publish')}>
                  发布条数{sortMark('publish')}
                </th>
                <th style={{ width: 120 }} className="pcv-th-sort" onClick={() => toggleProdSort('order')}>
                  出单件数{sortMark('order')}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sum.products.length === 0 ? (
                <tr><td colSpan={5} className="pcv-empty">这个区间没有数据</td></tr>
              ) : sortedProducts.map((r) => (
                <tr key={r.name}>
                  <td className="pcv-name" title={r.name}>{r.name}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {(r.accounts || []).length === 0 ? (
                      <span style={{ color: '#c9cdd4' }}>—</span>
                    ) : (r.accounts || []).map((a, k) => (
                      <span key={a} style={{ marginRight: k < r.accounts.length - 1 ? 10 : 0, whiteSpace: 'nowrap' }}>
                        <span style={{ color: (ACCOUNT_COLOR[a] || {}).c || '#8a8f98', fontWeight: 600, fontSize: 12 }}>{mask(a)}</span>
                      </span>
                    ))}
                  </td>
                  <td className="pcv-num">{fmtInt(r.publish)}</td>
                  <td className="pcv-num">{fmtInt(r.orderQty)}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 新增样品清单：卡片上的数字对应到具体是哪几个品 */}
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

        {/* 「按天明细」按用户要求去掉（保留分账号 / 按产品 / 新增样品三块） */}
      </div>
    </>
  )
}
