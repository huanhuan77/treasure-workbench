import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { ACCOUNTS, ACCOUNT_COLOR, maskAccount } from '../utils/accounts'
import { PERIODS, periodRange, buildSummary, buildMonthlyTrend, buildCategoryShare, buildTopProductRows, daysBetween } from '../utils/summary'
import { makeMonthlyOption, makePieOption, makeAccountOption, makeAccountOrderOption } from '../utils/chartOptions'
import { EChart } from '../components/EChart'
import { TopProductBars } from '../components/TopProductBars'

// 手机版「周 / 月总结」：只做数据展示（用户要求「只要数据表格」）。
// 口径与 PC 完全一致（共用 utils/summary.js）：周=周一~周日、月=自然月。
const fmtInt = (n) => String(Number(n) || 0)

export default function SummaryPage() {
  const { samples, publishRecords, orders, transactions, todos, hiddenAccounts } = useStore()
  // 默认「本月」（与 PC 一致，用户要求）
  const [period, setPeriod] = useState('month')
  // 自定义日期区间
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustom, setShowCustom] = useState(false)

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
  const monthlyOption = useMemo(() => makeMonthlyOption(monthly), [monthly])
  // 分类占比（发布条数 / 出单件数）
  const [catMetric, setCatMetric] = useState('publish')
  const catShare = useMemo(
    () => buildCategoryShare({ samples, publishRecords, orders }, range, catMetric),
    [samples, publishRecords, orders, range, catMetric],
  )
  const pieOption = useMemo(() => makePieOption(catShare), [catShare])
  // 分账号对比柱状图（账号名跟随隐藏账号打码）
  const accountOption = useMemo(
    // 账号多的时候名字斜一点，保证每个号都露出来（不再只显示隔一个）
    () => makeAccountOption(sum.accounts, mask, { rotate: sum.accounts.length > 4 ? 30 : 0 }),
    [sum.accounts, hiddenAccounts],
  )
  const accountOrderOption = useMemo(
    () => makeAccountOrderOption(sum.accounts, mask, 'qty'),
    [sum.accounts, hiddenAccounts],
  )

  // 出单 Top 10 产品（横向柱状图，按账号分段，可按账号筛选）
  const [topAcc, setTopAcc] = useState('all')
  const topAccOptions = useMemo(() => {
    const set = new Set()
    for (const r of (sum.products || [])) {
      for (const a of Object.keys(r.accOrder || {})) set.add(a)
    }
    const known = ACCOUNTS.filter((a) => set.has(a))
    return [...known, ...[...set].filter((a) => !ACCOUNTS.includes(a))]
  }, [sum.products])
  const topRows = useMemo(
    () => buildTopProductRows(sum.products || [], { limit: 10, account: topAcc }),
    [sum.products, topAcc],
  )
  const topMax = topRows.length ? topRows[0].total : 1

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
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px', overflowX: 'auto' }}>
        {PERIODS.map((p) => {
          const on = !customStart && !customEnd && period === p.key
          return (
            <button
              key={p.key}
              onClick={() => { setCustomStart(''); setCustomEnd(''); setPeriod(p.key) }}
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

      {/* 自定义日期区间：默认只在右边放日历图标，点开才展开两个日期框 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '0 16px 8px' }}>
        {customStart && customEnd && <span style={{ fontSize: 11, color: '#9aa0a9' }}>{customStart} ~ {customEnd}</span>}
        <button
          onClick={() => setShowCustom((v) => !v)}
          style={{ border: '1px solid rgba(15,23,42,0.14)', background: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 13, cursor: 'pointer' }}
          title="自定义日期"
        >📅</button>
      </div>
      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px 10px' }}>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            style={{
              flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 8, fontSize: 12,
              border: '1px solid rgba(15,23,42,0.14)', background: '#fff', color: '#4b5563',
            }}
          />
          <span style={{ color: '#9aa0a9', fontSize: 12 }}>~</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            style={{
              flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 8, fontSize: 12,
              border: '1px solid rgba(15,23,42,0.14)', background: '#fff', color: '#4b5563',
            }}
          />
          {(customStart || customEnd) && (
            <button
              onClick={() => { setCustomStart(''); setCustomEnd('') }}
              style={{ border: 'none', background: 'transparent', color: '#9aa0a9', fontSize: 12, cursor: 'pointer' }}
            >清空</button>
          )}
        </div>
      )}

      {/* 指标卡：一行三个（用户要求「改小一点，一行显示」） */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, padding: '0 16px 12px' }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: '#fff', borderRadius: 10, padding: '8px 9px',
            borderLeft: `3px solid ${c.color}`, boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
            minWidth: 0,
          }}>
            <div style={{ fontSize: 11, color: '#8a8f98', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color, lineHeight: 1.35 }}>{c.value}</div>
            <div style={{ fontSize: 10, color: '#9aa0a9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 按账号出单量对比（取代原来的按天/按周柱状图，用户要求） */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
          按账号出单量对比
        </div>
        {sum.accounts.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: '#9aa0a9' }}>这个区间没有数据</div>
        ) : (
          <div style={{ padding: '10px 8px 10px' }}>
            <EChart option={accountOrderOption} height={Math.max(150, sum.accounts.length * 40 + 30)} />
          </div>
        )}
      </div>

      {/* 出单 Top 10 产品：横向柱状图，按账号分段，可按账号筛选 */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
          出单 Top 10 产品 <span style={{ fontWeight: 400, color: '#9aa0a9', fontSize: 11 }}>按出单件数</span>
        </div>
        {/* 账号筛选胶囊（横向滚动，避免挤成一团） */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px 0', overflowX: 'auto' }}>
          <button
            onClick={() => setTopAcc('all')}
            style={{
              flexShrink: 0, padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
              background: topAcc === 'all' ? '#b8517f' : '#fff',
              color: topAcc === 'all' ? '#fff' : '#6b7280',
              border: topAcc === 'all' ? '1px solid #b8517f' : '1px solid #e5e7eb',
              fontWeight: topAcc === 'all' ? 600 : 400,
            }}
          >全部账号</button>
          {topAccOptions.map((a) => {
            const col = ACCOUNT_COLOR[a] || {}
            const on = topAcc === a
            return (
              <button
                key={a}
                onClick={() => setTopAcc(on ? 'all' : a)}
                style={{
                  flexShrink: 0, padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: on ? (col.bg || 'rgba(0,0,0,0.06)') : '#fff',
                  color: on ? '#333a45' : '#6b7280',
                  border: on ? `1px solid ${col.c || '#c1c7cf'}` : '1px solid #e5e7eb',
                  fontWeight: on ? 600 : 400,
                }}
              >
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: col.c || '#c1c7cf' }} />
                {mask(a)}
              </button>
            )
          })}
        </div>
        <div style={{ padding: '10px 12px 12px' }}>
          <TopProductBars rows={topRows} mask={mask} layout="horizontal" shortLen={6} height={Math.max(160, topRows.length * 30 + 40)} />
        </div>
      </div>

      {/* 近 6 个月趋势 / 出单转化 */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
          近 6 个月趋势 / 出单转化
        </div>
        <div style={{ padding: '10px 8px 8px' }}>
          <EChart option={monthlyOption} height={210} />
        </div>
      </div>

      {/* 分类占比 */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center' }}>
          分类占比
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setCatMetric(catMetric === 'publish' ? 'order' : 'publish')}
            style={{
              border: '1px solid rgba(184,81,127,0.45)', background: '#fff', color: '#b8517f',
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
            }}
          >{catMetric === 'publish' ? '按发布条数' : '按出单件数'}</button>
        </div>
        {catShare.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: '#9aa0a9' }}>这个区间没有数据</div>
        ) : (
          <div style={{ padding: '6px 8px 8px' }}>
            <EChart option={pieOption} height={230} />
          </div>
        )}
      </div>

      {/* 分账号明细 */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
          分账号明细
        </div>
        {sum.accounts.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: '#9aa0a9' }}>这个区间没有数据</div>
        ) : (
          <div style={{ padding: '8px 8px 10px' }}>
            <EChart option={accountOption} height={220} />
          </div>
        )}
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
