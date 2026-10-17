import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'

// PC 版「攒钱计划」。
// 数据与语义照手机版 SavingsPage：
//   · getSavings() 读 savingsData，updateSavings(monthKey, patch) 是**合并写**（只写 actual/details，
//     target 由数据里预置、不会被覆盖掉）
//   · 进度卡展示的是「**最新一个有存入数据的月份**」，不是当月 —— 与手机版同口径，别自作主张改成年度汇总
//   · 每月按账户记金额，合计自动算
// PC 侧差异只有展示层：12 个月排成表格（手机版是折叠卡片），编辑走弹窗而不是页内展开 + 底部固定条。
const ACCOUNT_OPTIONS = ['支付宝1', '支付宝2', '博时', '同花顺', '华泰', '东方', '卡', '中信', '工行', '微信', '其他']

const fmt = (n) => {
  if (!n && n !== 0) return ''
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toLocaleString()
}
const toNum = (v) => {
  const n = parseInt(String(v).replace(/,/g, ''), 10)
  return isNaN(n) ? 0 : n
}

export function PcSavings() {
  const { getSavings, updateSavings } = useStore()
  const { show } = useToast()

  const sd = getSavings() || {}
  const records = sd.records || {}

  // 手机版把年份写死成 '2026'，跨年后就会空白。这里默认取当前年。
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [editKey, setEditKey] = useState(null)      // 正在编辑的月份 key
  const [draft, setDraft] = useState({})            // { 账户: 金额字符串 }
  const [addAcct, setAddAcct] = useState('')

  const MONTH_KEYS = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`),
    [year],
  )
  const monthLabel = (k) => `${parseInt(k.split('-')[1], 10)}月`

  // 进度卡：最新一个有 actual>0 的月份（同手机版 currentMonth 口径）
  const monthsWithData = MONTH_KEYS.filter((k) => records[k] && records[k].actual > 0)
  const curMonth = monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] : `${year}-01`
  const cur = records[curMonth] || {}
  const curTarget = cur.target || 0
  const curActual = cur.actual || 0
  const curDiff = curActual - curTarget
  const curPct = curTarget > 0 ? Math.min(100, Math.round((curActual / curTarget) * 100)) : 0

  const startEdit = (key) => {
    const r = records[key] || { details: {} }
    setDraft({ ...(r.details || {}) })
    setAddAcct(ACCOUNT_OPTIONS.find((o) => !(o in (r.details || {}))) || '')
    setEditKey(key)
  }

  const renameAcct = (from, to) => {
    if (!to || to === from || to in draft) return   // 目标账户已存在 → 忽略（下拉会自己回弹）
    const next = {}
    for (const [k, v] of Object.entries(draft)) next[k === from ? to : k] = v
    setDraft(next)
  }

  const draftTotal = Object.values(draft).reduce((s, v) => s + toNum(v), 0)

  const saveEdit = () => {
    if (!editKey) return
    const details = {}
    let total = 0
    for (const [acct, val] of Object.entries(draft)) {
      const n = toNum(val)
      if (n > 0) { details[acct] = n; total += n }
    }
    updateSavings(editKey, { actual: total, details })   // 合并写，target 保留
    show(`${monthLabel(editKey)} 已保存`, 'success')
    setEditKey(null)
  }

  const yearActual = MONTH_KEYS.reduce((s, k) => s + (records[k]?.actual || 0), 0)
  const yearTarget = MONTH_KEYS.reduce((s, k) => s + (records[k]?.target || 0), 0)

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">攒钱计划</div>
          <div className="pcv-sub">
            {year} 年已存 {fmt(yearActual) || 0} / 目标 {fmt(yearTarget) || 0}
          </div>
        </div>
        <div className="pcv-spacer" />
        <div className="pcv-acctabs" style={{ width: 220 }}>
          <button onClick={() => setYear((y) => String(parseInt(y, 10) - 1))}>‹</button>
          <button className="on" style={{ background: '#fef3c7', color: '#78350f' }}>{year} 年</button>
          <button onClick={() => setYear((y) => String(parseInt(y, 10) + 1))}>›</button>
        </div>
      </div>

      <div className="pcv-body">
        {/* 进度卡：最新有数据的那个月（与手机版同口径） */}
        <div className="pcv-card" style={{ marginBottom: 14 }}>
          <div className="pcv-card-b">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#78350f' }}>{monthLabel(curMonth)} 进度</span>
              <span style={{ fontSize: 12, color: '#9aa0a9' }}>（取今年最后一个有存入数据的月份）</span>
              <div className="pcv-spacer" />
              <span style={{ fontSize: 13, fontWeight: 700, color: curDiff >= 0 ? '#5f8a74' : '#b96a66' }}>
                {curDiff >= 0 ? `+${fmt(curDiff)}` : fmt(curDiff)}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'rgba(146,64,14,0.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${curPct}%`, background: 'linear-gradient(90deg,#f59e0b,#d97706)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#92400e' }}>
              <span>已存 {fmt(curActual) || 0}</span>
              <span>目标 {fmt(curTarget) || 0} · 完成 {curPct}%</span>
            </div>
          </div>
        </div>

        <div className="pcv-card pcv-card--scroll">
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>月份</th>
                <th style={{ width: 220 }}>进度</th>
                <th style={{ width: 190 }}>已存 / 目标</th>
                <th style={{ width: 120 }}>差额</th>
                <th style={{ width: 80 }}>账户</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {MONTH_KEYS.map((key) => {
                const r = records[key] || {}
                const t = r.target || 0
                const a = r.actual || 0
                const d = a - t
                const p = t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0
                const acctCount = Object.keys(r.details || {}).filter((k) => k !== '_合计').length
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 600, color: '#78350f' }}>{monthLabel(key)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 3, background: 'rgba(251,191,36,0.16)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${p}%`,
                            background: d >= 0 ? 'linear-gradient(90deg,#8fbfa3,#5f8a74)' : 'linear-gradient(90deg,#f0c88a,#b1702c)',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#9aa0a9', width: 32, textAlign: 'right', flexShrink: 0 }}>{p}%</span>
                      </div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: a > 0 ? '#333a45' : '#c9cdd4' }}>{fmt(a) || 0}</span>
                      <span style={{ color: '#c9cdd4' }}> / {fmt(t) || 0}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: a === 0 ? '#c9cdd4' : (d >= 0 ? '#5f8a74' : '#b96a66'), fontVariantNumeric: 'tabular-nums' }}>
                      {a === 0 ? '—' : (d >= 0 ? `+${fmt(d)}` : fmt(d))}
                    </td>
                    <td style={{ color: acctCount > 0 ? '#6b7280' : '#c9cdd4' }}>{acctCount > 0 ? `${acctCount} 个` : '—'}</td>
                    <td>
                      <button className="pcv-btn-text" onClick={() => startEdit(key)}>✎ 编辑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑某月：弹窗 */}
      {editKey && (
        <div className="pcv-overlay" onClick={() => setEditKey(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{year} 年 {monthLabel(editKey)} · 存入金额</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>
                目标 {fmt(records[editKey]?.target) || 0}
              </span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditKey(null)}>×</button>
            </div>

            <div className="pcv-dialog-b">
              <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 8 }}>
                按账户填金额，合计自动算（金额为 0 的账户保存时会被去掉）
              </div>

              <div className="pcv-entrylist">
                {Object.entries(draft).length === 0 && (
                  <div className="pcv-entry-empty">还没有账户，用下方「添加账户」加一个</div>
                )}
                {Object.entries(draft).map(([acct, val]) => (
                  <div key={acct} className="pcv-entry">
                    <select
                      className="pcv-input"
                      style={{ width: 110, flexShrink: 0 }}
                      value={acct}
                      onChange={(e) => renameAcct(acct, e.target.value)}
                    >
                      {ACCOUNT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input
                      className="pcv-input"
                      style={{ flex: 1, minWidth: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                      inputMode="numeric"
                      placeholder="0"
                      value={val}
                      onChange={(e) => setDraft((p) => ({ ...p, [acct]: e.target.value }))}
                    />
                    <button
                      className="pcv-x"
                      title="删掉这个账户"
                      onClick={() => setDraft((p) => { const n = { ...p }; delete n[acct]; return n })}
                    >×</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <select
                  className="pcv-input"
                  style={{ flex: 1 }}
                  value={addAcct}
                  onChange={(e) => setAddAcct(e.target.value)}
                >
                  {ACCOUNT_OPTIONS.filter((o) => !(o in draft)).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  className="pcv-btn pcv-btn-ghost"
                  onClick={() => {
                    if (!addAcct || addAcct in draft) return
                    setDraft((p) => ({ ...p, [addAcct]: '' }))
                    setAddAcct(ACCOUNT_OPTIONS.find((o) => o !== addAcct && !(o in draft)) || '')
                  }}
                >＋ 添加账户</button>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', marginTop: 14, paddingTop: 10,
                borderTop: '0.5px solid rgba(251,191,36,0.3)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>合计</span>
                <div className="pcv-spacer" />
                <span style={{ fontSize: 18, fontWeight: 800, color: '#92400e', fontVariantNumeric: 'tabular-nums' }}>
                  {draftTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditKey(null)}>取消</button>
              <button className="pcv-btn" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
