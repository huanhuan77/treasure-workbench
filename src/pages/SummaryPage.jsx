import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { ACCOUNT_COLOR, maskAccount } from '../utils/accounts'
import { PERIODS, periodRange, buildSummary, daysBetween } from '../utils/summary'

// 手机版「周 / 月总结」：只做数据展示（用户要求「只要数据表格」）。
// 口径与 PC 完全一致（共用 utils/summary.js）：周=周一~周日、月=自然月。
const fmtInt = (n) => String(Number(n) || 0)

export default function SummaryPage() {
  const { samples, publishRecords, orders, transactions, todos, hiddenAccounts } = useStore()
  const [period, setPeriod] = useState('week')

  const range = useMemo(() => periodRange(period), [period])
  const sum = useMemo(
    () => buildSummary({ samples, publishRecords, orders, transactions, todos }, range),
    [samples, publishRecords, orders, transactions, todos, range],
  )
  const mask = (a) => maskAccount(a, hiddenAccounts)

  // 只留「发布 / 出单 / 样品」（用户要求去掉收入、净收入、完成待办）
  const cards = [
    { label: '发布条数', value: fmtInt(sum.publish), sub: `${sum.publishRecords} 条记录`, color: '#3f6fa8' },
    { label: '出单件数', value: fmtInt(sum.orderQty), sub: `${sum.orderCount} 笔`, color: '#4f8a6d' },
    { label: '新增样品', value: fmtInt(sum.newSamples), sub: `逾期 ${sum.overdueSamples} 个`, color: '#7a5ea8' },
  ]

  return (
    <div className="app-container" style={{ paddingBottom: 90 }}>
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>周 / 月总结</h1>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-sub)' }}>
          {range.label} · 共 {daysBetween(range.start, range.end)} 天
        </p>
      </header>

      {/* 期间切换 */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', overflowX: 'auto' }}>
        {PERIODS.map((p) => {
          const on = period === p.key
          return (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer',
                border: on ? 'none' : '1px solid rgba(15,23,42,0.14)',
                background: on ? '#b8517f' : '#fff',
                color: on ? '#fff' : '#4b5563',
              }}
            >{p.label}</button>
          )
        })}
      </div>

      {/* 指标卡：两列 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 12px' }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: '#fff', borderRadius: 12, padding: '10px 12px',
            borderLeft: `3px solid ${c.color}`, boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}>
            <div style={{ fontSize: 12, color: '#8a8f98' }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color, lineHeight: 1.4 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#9aa0a9' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 分账号明细 */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
          分账号明细
        </div>
        {sum.accounts.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: '#9aa0a9' }}>这个区间没有数据</div>
        ) : sum.accounts.map((r) => {
          const col = ACCOUNT_COLOR[r.account] || { c: '#6b7280' }
          return (
            <div key={r.account} style={{
              padding: '10px 12px', borderTop: '0.5px solid rgba(15,23,42,0.05)',
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{ color: col.c, fontWeight: 700, fontSize: 13 }}>{mask(r.account)}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>发布 {fmtInt(r.publish)}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>出单 {fmtInt(r.orderQty)} 件 / {fmtInt(r.orderCount)} 笔</span>
            </div>
          )
        })}
      </div>

      {/* 按产品明细 */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
          按产品明细 <span style={{ fontWeight: 400, color: '#9aa0a9', fontSize: 12 }}>（{sum.products.length} 个）</span>
        </div>
        {sum.products.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: '#9aa0a9' }}>这个区间没有数据</div>
        ) : sum.products.map((r) => (
          <div key={r.name} style={{
            padding: '9px 12px', borderTop: '0.5px solid rgba(15,23,42,0.05)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ fontSize: 12, color: '#3f6fa8' }}>发 {fmtInt(r.publish)}</span>
            <span style={{ fontSize: 12, color: '#4f8a6d' }}>单 {fmtInt(r.orderQty)}</span>
          </div>
        ))}
      </div>

      {/* 新增样品清单 */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
          区间内新增的样品 <span style={{ fontWeight: 400, color: '#9aa0a9', fontSize: 12 }}>（{sum.newSamples} 个）</span>
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sum.newSampleList.length === 0 ? (
            <span style={{ fontSize: 12, color: '#9aa0a9' }}>这个区间没有新增样品</span>
          ) : sum.newSampleList.map((s, i) => (
            <span key={`${s.name}-${i}`} style={{
              fontSize: 12, padding: '3px 9px', borderRadius: 999,
              background: '#f3f4f6', color: '#4b5563', whiteSpace: 'nowrap',
            }}>{s.name}</span>
          ))}
        </div>
      </div>

      {/* 「按天明细」按用户要求去掉（保留分账号 / 按产品 / 新增样品三块） */}
    </div>
  )
}
