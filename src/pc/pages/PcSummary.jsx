import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { ACCOUNT_COLOR, maskAccount } from '../../utils/accounts'
import { PERIODS, periodRange, buildSummary, daysBetween } from '../../utils/summary'

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
                <th />
              </tr>
            </thead>
            <tbody>
              {sum.accounts.length === 0 ? (
                <tr><td colSpan={5} className="pcv-empty">这个区间没有数据</td></tr>
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
                    <td />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 按天明细 */}
        <div className="pcv-card" style={{ marginTop: 12 }}>
          <div className="pcv-card-h">
            <span style={{ fontWeight: 600 }}>按天明细</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              只列有数据的日期（{sum.days.length} 天）
            </span>
          </div>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>日期</th>
                <th style={{ width: 110 }}>发布</th>
                <th style={{ width: 110 }}>出单件数</th>
                <th style={{ width: 100 }}>出单笔数</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sum.days.length === 0 ? (
                <tr><td colSpan={5} className="pcv-empty">这个区间没有数据</td></tr>
              ) : sum.days.map((d) => {
                const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(d.date).getDay()]
                return (
                  <tr key={d.date}>
                    <td>{d.date}<span style={{ color: '#9aa0a9', marginLeft: 6, fontSize: 12 }}>周{wd}</span></td>
                    <td className="pcv-num">{fmtInt(d.publish)}</td>
                    <td className="pcv-num">{fmtInt(d.orderQty)}</td>
                    <td className="pcv-num">{fmtInt(d.orderCount)}</td>
                    <td />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
