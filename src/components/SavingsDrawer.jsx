import { useState } from 'react'
import { useStore } from '../store'

const MONTH_KEYS = [
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
]
const MONTH_LABELS = {}
MONTH_KEYS.forEach(k => { MONTH_LABELS[k] = parseInt(k.split('-')[1]) + '月' })

function formatNum(n) {
  if (!n && n !== 0) return ''
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toLocaleString()
}

function toNum(v) { const n = parseInt(String(v).replace(/,/g,'')); return isNaN(n) ? 0 : n }

export function SavingsDrawer({ open, onClose }) {
  const { getSavings, updateSavings } = useStore()
  const sd = getSavings() || {}
  const records = sd.records || {}
  const [expandedMonth, setExpandedMonth] = useState(null)
  const [editMonth, setEditMonth] = useState(null)       // 正在编辑的月份
  const [editAccounts, setEditAccounts] = useState(null)  // { acct: val, ... }
  const [editTotal, setEditTotal] = useState('')

  // 当前进度
  const monthsWithData = MONTH_KEYS.filter(k => records[k] && records[k].actual > 0)
  const currentMonth = monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] : '2026-01'
  const current = records[currentMonth] || {}
  const currentTarget = current.target || 0
  const currentActual = current.actual || 0
  const diff = currentActual - currentTarget
  const pct = currentTarget > 0 ? Math.min(100, Math.round((currentActual / currentTarget) * 100)) : 0

  // 开始编辑某个月份
  const startEdit = (key) => {
    const r = records[key] || { details: {} }
    const accounts = { ...(r.details || {}) }
    setEditMonth(key)
    setEditAccounts(accounts)
    setEditTotal(String(r.actual || 0))
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editMonth) return
    const details = {}
    let total = 0
    Object.entries(editAccounts).forEach(([acct, val]) => {
      const n = toNum(val)
      if (n > 0) { details[acct] = n; total += n }
    })
    const manualTotal = toNum(editTotal)
    const finalActual = manualTotal > 0 ? manualTotal : total
    if (finalActual > 0) details['_合计'] = finalActual
    updateSavings(editMonth, { actual: finalActual, details })
    setEditMonth(null)
    setEditAccounts(null)
  }

  // 修改某个账户金额
  const updateAcct = (acct, val) => {
    setEditAccounts(prev => ({ ...prev, [acct]: val }))
  }

  // 添加账户
  const addAccount = () => {
    const label = prompt('输入账户名称：')
    if (label && label.trim()) {
      setEditAccounts(prev => ({ ...prev, [label.trim()]: 0 }))
    }
  }

  // 删除账户
  const removeAcct = (acct) => {
    const next = { ...editAccounts }
    delete next[acct]
    setEditAccounts(next)
  }

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

          <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 700, color: '#78350f' }}>26年攒钱计划</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#92400e', opacity: 0.7 }}>
            每月努力存 6 千 💪
          </p>

          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '16px', padding: '16px', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#78350f' }}>{MONTH_LABELS[currentMonth] || currentMonth} 进度</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: diff >= 0 ? '#059669' : '#dc2626' }}>
                {diff >= 0 ? `+${formatNum(diff)}` : formatNum(diff)}
              </span>
            </div>
            <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(146,64,14,0.15)', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ height: '100%', borderRadius: '5px', width: `${pct}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#92400e' }}>
              <span>已存 {formatNum(currentActual)}</span>
              <span>目标 {formatNum(currentTarget)}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#78350f' }}>每月明细</h4>
            {editMonth && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={saveEdit} style={{ padding:'6px 14px', borderRadius:'10px', border:'none', background:'#10b981', color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>保存</button>
                <button onClick={() => { setEditMonth(null); setEditAccounts(null) }} style={{ padding:'6px 14px', borderRadius:'10px', border:'1px solid #ccc', background:'#fff', color:'#666', fontSize:'12px', cursor:'pointer' }}>取消</button>
              </div>
            )}
          </div>
          {MONTH_KEYS.map((key) => {
            const r = records[key] || {}
            const monthTarget = r.target || 0
            const monthActual = r.actual || 0
            const monthDiff = monthActual - monthTarget
            const monthPct = monthTarget > 0 ? Math.min(100, Math.round((monthActual / monthTarget) * 100)) : 0
            const expanded = expandedMonth === key
            const editing = editMonth === key

            return (
              <div key={key} style={{ marginBottom:'8px', borderRadius:'12px', overflow:'hidden', border:'1px solid rgba(251,191,36,0.2)', background: expanded ? 'rgba(254,243,199,0.3)' : 'transparent' }}>
                <div onClick={() => { if (!editing) setExpandedMonth(expanded ? null : key) }} style={{ display:'flex', alignItems:'center', padding:'10px 12px', cursor:'pointer', gap:'8px' }}>
                  <span style={{ fontSize:'14px', fontWeight:600, color:'#78350f', width:'36px' }}>{MONTH_LABELS[key]}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ height:'6px', borderRadius:'3px', background:'rgba(251,191,36,0.15)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:'3px', width:`${monthPct}%`, background: monthDiff >= 0 ? 'linear-gradient(90deg,#34d399,#10b981)' : 'linear-gradient(90deg,#f59e0b,#d97706)' }} />
                    </div>
                  </div>
                  <span style={{ fontSize:'12px', fontWeight:600, color:monthDiff >= 0 ? '#059669' : '#dc2626', minWidth:'70px', textAlign:'right' }}>
                    {formatNum(monthActual)} / {formatNum(monthTarget)}
                  </span>
                  <span style={{ fontSize:'11px', color:'var(--gray-400)' }}>{expanded ? '▲' : '▼'}</span>
                </div>

                {(expanded || editing) && (
                  <div style={{ padding:'4px 12px 12px', borderTop:'1px solid rgba(251,191,36,0.1)' }}>
                    {editing ? (
                      <>
                        {/* 编辑模式：各账户输入 */}
                        {Object.entries(editAccounts).map(([acct, val]) => (
                          <div key={acct} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'3px 0' }}>
                            <span style={{ fontSize:'12px', color:'#78350f', minWidth:'60px' }}>{acct}</span>
                            <input value={val} onChange={(e) => updateAcct(acct, e.target.value)}
                              style={{ flex:1, padding:'4px 8px', borderRadius:'8px', border:'1px solid #e9d5ff', fontSize:'12px', outline:'none', textAlign:'right' }} />
                            <button onClick={() => removeAcct(acct)} style={{ background:'none', border:'none', color:'#e11d48', cursor:'pointer', fontSize:'14px', padding:0 }}>×</button>
                          </div>
                        ))}
                        {/* 合计 */}
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 0 0', borderTop:'1px solid rgba(251,191,36,0.15)', marginTop:'4px' }}>
                          <span style={{ fontSize:'12px', fontWeight:700, color:'#78350f', minWidth:'60px' }}>合计</span>
                          <input value={editTotal} onChange={(e) => setEditTotal(e.target.value)}
                            placeholder="自动计算或手动输入"
                            style={{ flex:1, padding:'4px 8px', borderRadius:'8px', border:'1px solid #e9d5ff', fontSize:'12px', outline:'none', textAlign:'right', fontWeight:600 }} />
                          <span style={{ fontSize:'11px', color:'#999', minWidth:'24px' }} />
                        </div>
                        <button onClick={addAccount} style={{ marginTop:'8px', padding:'4px 12px', borderRadius:'8px', border:'1px dashed #d4a373', background:'transparent', color:'#92400e', fontSize:'11px', cursor:'pointer', width:'100%' }}>+ 添加账户</button>
                      </>
                    ) : (
                      <>
                        {Object.entries(r.details || {}).filter(([k]) => k !== '_合计').map(([acct, amt]) => (
                          <div key={acct} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:'12px', color:'var(--text-sub)' }}>
                            <span>{acct}</span>
                            <span style={{ fontWeight:500, color:'var(--text-main)' }}>{amt.toLocaleString()}</span>
                          </div>
                        ))}
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0 0', fontSize:'12px', fontWeight:700, color:'#78350f', borderTop:'1px solid rgba(251,191,36,0.15)', marginTop:'4px' }}>
                          <span>合计</span>
                          <span>{monthActual.toLocaleString()}</span>
                        </div>
                        <button onClick={() => startEdit(key)} style={{ marginTop:'8px', padding:'4px 12px', borderRadius:'8px', border:'1px solid #e9d5ff', background:'#fef3c7', color:'#92400e', fontSize:'11px', cursor:'pointer' }}>✎ 编辑</button>
                      </>
                    )}
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
