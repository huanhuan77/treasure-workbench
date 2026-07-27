import { useState } from 'react'
import { useStore } from '../store'

const MONTH_KEYS = [
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
]
const MONTH_LABELS = { '2026-01':'1月','2026-02':'2月','2026-03':'3月','2026-04':'4月','2026-05':'5月','2026-06':'6月','2026-07':'7月','2026-08':'8月','2026-09':'9月','2026-10':'10月','2026-11':'11月','2026-12':'12月' }

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toLocaleString()
}

function getMonth(records, key) {
  const r = records[key]
  if (!r) return { target: 0, actual: 0, details: {} }
  // 目标从 1 月起递增 5000
  const monthNum = parseInt(key.split('-')[1])
  return { ...r }
}

export function SavingsDrawer({ open, onClose }) {
  const { getSavings, updateSavings } = useStore()
  const sd = getSavings() || {}
  const records = sd.records || {}
  const goal = sd.monthlyGoal || 5000
  const [expandedMonth, setExpandedMonth] = useState(null)

  // 当前进度：取最新的有数据的月份
  const monthsWithData = MONTH_KEYS.filter(k => records[k])
  const currentMonth = monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] : '2026-01'
  const current = records[currentMonth]
  const currentTarget = current?.target || 0
  const currentActual = current?.actual || 0
  const diff = currentActual - currentTarget
  const pct = currentTarget > 0 ? Math.min(100, Math.round((currentActual / currentTarget) * 100)) : 0

  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
          WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)',
        }} />
      )}

      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '320px', maxWidth: '86vw',
        background: '#fff', zIndex: 201,
        transform: open ? 'translateX(0)' : 'translateX(-110%)',
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 头部渐变 */}
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #fcd34d 100%)',
          padding: '48px 20px 28px', position: 'relative',
          borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: '14px', right: '14px',
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)', border: 'none',
            fontSize: '16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#92400e', backdropFilter: 'blur(8px)',
          }}>✕</button>

          <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 700, color: '#78350f' }}>
            26年攒钱计划
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#92400e', opacity: 0.7 }}>
            每月至少存 5 千 💪
          </p>

          {/* 当前进度卡片 */}
          <div style={{
            background: 'rgba(255,255,255,0.6)', borderRadius: '16px',
            padding: '16px', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#78350f' }}>{MONTH_LABELS[currentMonth] || currentMonth} 进度</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: diff >= 0 ? '#059669' : '#dc2626' }}>
                {diff >= 0 ? `+${formatNum(diff)}` : formatNum(diff)}
              </span>
            </div>
            <div style={{
              height: '10px', borderRadius: '5px', background: 'rgba(146,64,14,0.15)', overflow: 'hidden', marginBottom: '6px',
            }}>
              <div style={{
                height: '100%', borderRadius: '5px',
                width: `${pct}%`,
                background: `linear-gradient(90deg, #f59e0b, #d97706)`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#92400e' }}>
              <span>已存 {formatNum(currentActual)}</span>
              <span>目标 {formatNum(currentTarget)}</span>
            </div>
          </div>
        </div>

        {/* 每月明细 */}
        <div style={{ padding: '20px', flex: 1 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#78350f' }}>每月明细</h4>
          {MONTH_KEYS.map((key) => {
            const r = records[key]
            const monthTarget = r?.target || 0
            const monthActual = r?.actual || 0
            const monthDiff = monthActual - monthTarget
            const monthPct = monthTarget > 0 ? Math.min(100, Math.round((monthActual / monthTarget) * 100)) : 0
            const expanded = expandedMonth === key

            return (
              <div key={key} style={{
                marginBottom: '8px', borderRadius: '12px', overflow: 'hidden',
                border: '1px solid rgba(251,191,36,0.2)',
                background: expanded ? 'rgba(254,243,199,0.3)' : 'transparent',
              }}>
                {/* 月标题行 */}
                <div onClick={() => setExpandedMonth(expanded ? null : key)} style={{
                  display: 'flex', alignItems: 'center', padding: '10px 12px', cursor: 'pointer',
                  gap: '8px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#78350f', width: '36px' }}>
                    {MONTH_LABELS[key]}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '6px', borderRadius: '3px', background: 'rgba(251,191,36,0.15)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '3px', width: `${monthPct}%`,
                        background: monthDiff >= 0 ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: monthDiff >= 0 ? '#059669' : '#dc2626', minWidth: '70px', textAlign: 'right' }}>
                    {formatNum(monthActual)} / {formatNum(monthTarget)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                    {expanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* 展开详情 */}
                {expanded && r?.details && (
                  <div style={{
                    padding: '4px 12px 12px', borderTop: '1px solid rgba(251,191,36,0.1)',
                  }}>
                    {Object.entries(r.details).map(([acct, amt]) => (
                      <div key={acct} style={{
                        display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                        fontSize: '12px', color: 'var(--text-sub)',
                      }}>
                        <span>{acct}</span>
                        <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{amt.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', padding: '6px 0 0',
                      fontSize: '12px', fontWeight: 700, color: '#78350f',
                      borderTop: '1px solid rgba(251,191,36,0.15)', marginTop: '4px',
                    }}>
                      <span>合计</span>
                      <span>{monthActual.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
