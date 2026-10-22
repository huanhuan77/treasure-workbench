import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { ACCOUNT_COLOR, maskAccount } from '../../utils/accounts'
import { PERIODS, periodRange, buildSummary, buildTrend, daysBetween } from '../../utils/summary'
import { TrendBars } from '../../components/TrendBars'

// PC 版「周 / 月总结」：只做**数据**（用户要求「只要数据表格，不需要文案」）。
// 口径见 utils/summary.js：周=周一~周日、月=自然月；发布/出单/收支/样品/待办各自按区间取数。
const fmtInt = (n) => String(Number(n) || 0)

export function PcSummary() {
  const { samples, publishRecords, orders, transactions, todos, hiddenAccounts } = useStore()
  const [period, setPeriod] = useState('week')

  const range = useMemo(() => periodRange(period), [period])
  const sum = useMemo(
    () => buildSummary({ samples, publishRecords, orders, transactions, todos }, range),
    [samples, publishRecords, orders, transactions, todos, range],
  )
  const mask = (a) => maskAccount(a, hiddenAccounts)

  // 近 4 周趋势（柱状图）：与上面的期间切换无关，固定展示最近四周
  const trend = useMemo(
    () => buildTrend({ samples, publishRecords, orders, transactions, todos }, 4),
    [samples, publishRecords, orders, transactions, todos],
  )

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
        {/* 期间切换：本周 / 上周 / 本月 / 上月 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={period === p.key ? 'pcv-btn' : 'pcv-btn pcv-btn-ghost'}
              onClick={() => setPeriod(p.key)}
            >{p.label}</button>
          ))}
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

        {/* 近 4 周柱状图（用户要求「做成柱状图，4 周的都列出来」） */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>近 4 周趋势</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              发布条数 / 出单件数（周一起算，含本周）
            </span>
          </div>
          <div style={{ padding: '12px 16px 16px' }}>
            <TrendBars data={trend} height={170} barWidth={22} />
          </div>
        </div>

        {/* 分账号明细 */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>分账号明细</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>{range.label}</span>
          </div>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 170 }}>账号</th>
                <th style={{ width: 110 }}>发布条数</th>
                <th style={{ width: 110 }}>出单件数</th>
                <th style={{ width: 100 }}>出单笔数</th>
                <th style={{ width: 110 }}>新增产品数</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sum.accounts.length === 0 ? (
                <tr><td colSpan={6} className="pcv-empty">这个区间没有数据</td></tr>
              ) : sum.accounts.map((r) => {
                const col = ACCOUNT_COLOR[r.account] || { c: '#6b7280' }
                return (
                  <tr key={r.account}>
                    <td>
                      <span style={{ color: col.c, fontWeight: 600 }}>{mask(r.account)}</span>
                    </td>
                    <td className="pcv-num">{fmtInt(r.publish)}</td>
                    <td className="pcv-num">{fmtInt(r.orderQty)}</td>
                    <td className="pcv-num">{fmtInt(r.orderCount)}</td>
                    <td className="pcv-num">{fmtInt(r.newProducts)}</td>
                    <td />
                  </tr>
                )
              })}
            </tbody>
          </table>
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
