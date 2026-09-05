import { useState } from 'react'
import { useStore } from '../store'

const ACCOUNT_OPTIONS = ['支付宝1','支付宝2','博时','同花顺','华泰','东方','卡','中信','工行','微信','其他']

function formatNum(n) {
  if (!n && n !== 0) return ''
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toLocaleString()
}
function toNum(v) { const n = parseInt(String(v).replace(/,/g,'')); return isNaN(n) ? 0 : n }

export function SavingsPage() {
  const { getSavings, updateSavings } = useStore()
  const sd = getSavings() || {}
  const records = sd.records || {}
  const [editMonth, setEditMonth] = useState(null)
  const [expandedMonth, setExpandedMonth] = useState(null)
  const [editAccounts, setEditAccounts] = useState(null)
  const [year, setYear] = useState('2026')  // 攒钱计划年份
  const MONTH_KEYS = Array.from({length:12}, (_,i) => year + '-' + String(i+1).padStart(2,'0'))
  const MONTH_LABELS = Object.fromEntries(MONTH_KEYS.map(k => [k, parseInt(k.split('-')[1]) + '月']))

  const monthsWithData = MONTH_KEYS.filter(k => records[k] && records[k].actual > 0)
  const currentMonth = monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] : '2026-01'
  const current = records[currentMonth] || {}
  const currentTarget = current.target || 0
  const currentActual = current.actual || 0
  const diff = currentActual - currentTarget
  const pct = currentTarget > 0 ? Math.min(100, Math.round((currentActual / currentTarget) * 100)) : 0

  const startEdit = (key) => {
    const r = records[key] || { details: {} }
    setEditMonth(key)
    setEditAccounts({ ...(r.details || {}) })
  }

  const saveEdit = () => {
    if (!editMonth) return
    const details = {}
    let total = 0
    Object.entries(editAccounts).forEach(([acct, val]) => {
      const n = toNum(val)
      if (n > 0) { details[acct] = n; total += n }
    })
    updateSavings(editMonth, {
      actual: total,
      details,
    })
    setEditMonth(null)
  }

  return (
    <div className="app-container" style={{ paddingBottom: editMonth ? '140px' : '100px' }}>
      <header style={{ padding: 'calc(12px + var(--safe-top)) 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
        <h1 style={{ margin:0, fontSize:'20px', fontWeight:700, color:'var(--text-main)' }}>攒钱计划</h1>
        <p style={{ margin:'6px 0 0', fontSize:'13px', color:'var(--text-sub)' }}>每月努力存 6 千 💪</p>
        {/* 年份切换 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', marginTop:'8px' }}>
          <button onClick={() => setYear(String(parseInt(year)-1))} style={{ width:'32px', height:'32px', borderRadius:'50%', border:'1px solid rgba(251,191,36,0.3)', background:'#fef3c7', color:'#92400e', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          <span style={{ fontSize:'18px', fontWeight:700, color:'#78350f', minWidth:'60px', textAlign:'center' }}>{year} 年</span>
          <button onClick={() => setYear(String(parseInt(year)+1))} style={{ width:'32px', height:'32px', borderRadius:'50%', border:'1px solid rgba(251,191,36,0.3)', background:'#fef3c7', color:'#92400e', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        </div>
      </header>

      {/* 进度卡片 */}
      <div style={{ padding:'16px' }}>
        <div style={{ borderRadius:'16px', padding:'16px', background:'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
            <span style={{ fontSize:'14px', fontWeight:600, color:'#78350f' }}>{MONTH_LABELS[currentMonth] || currentMonth} 进度</span>
            <span style={{ fontSize:'14px', fontWeight:700, color: diff>=0 ? '#059669' : '#dc2626' }}>{diff>=0 ? `+${formatNum(diff)}` : formatNum(diff)}</span>
          </div>
          <div style={{ height:'12px', borderRadius:'6px', background:'rgba(146,64,14,0.15)', overflow:'hidden', marginBottom:'6px' }}>
            <div style={{ height:'100%', borderRadius:'6px', width:`${pct}%`, background:'linear-gradient(90deg,#f59e0b,#d97706)', transition:'width 0.6s' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#92400e' }}>
            <span>已存 {formatNum(currentActual)}</span>
            <span>目标 {formatNum(currentTarget)}</span>
          </div>
        </div>
      </div>

      {/* 每月列表 */}
      <div style={{ padding:'0 16px' }}>
        {MONTH_KEYS.map(key => {
          const r = records[key] || {}
          const t = r.target || 0
          const a = r.actual || 0
          const d = a - t
          const p = t > 0 ? Math.min(100, Math.round((a/t)*100)) : 0
          const editing = editMonth === key
          const expanded = expandedMonth === key || editing
          return (
            <div key={key} style={{ marginBottom:'8px', borderRadius:'12px', border:'1px solid rgba(251,191,36,0.2)', background:'#fff' }}>
              <div onClick={editing ? undefined : () => setExpandedMonth(expanded ? null : key)} style={{ display:'flex', alignItems:'center', padding:'10px 12px', gap:'8px', cursor: editing ? 'default' : 'pointer' }}>
                <span style={{ fontSize:'14px', fontWeight:600, color:'#78350f', width:'36px' }}>{MONTH_LABELS[key]}</span>
                <div style={{ flex:1 }}>
                  <div style={{ height:'6px', borderRadius:'3px', background:'rgba(251,191,36,0.15)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:'3px', width:`${p}%`, background: d>=0 ? 'linear-gradient(90deg,#34d399,#10b981)' : 'linear-gradient(90deg,#f59e0b,#d97706)' }} />
                  </div>
                </div>
                <span style={{ fontSize:'12px', fontWeight:600, color:d>=0?'#059669':'#dc2626', textAlign:'right', minWidth:'80px' }}>{formatNum(a)} / {formatNum(t)}</span>
              </div>
              {editing ? (
                <div style={{ padding:'12px 16px 14px', borderTop:'1px solid rgba(251,191,36,0.1)' }}>
                  {/* 各账户 */}
                  {Object.entries(editAccounts).map(([acct, val], idx) => (
                    <div key={acct} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 0' }}>
                      <select value={acct} onChange={e => {
                        const next = {}; const keys = Object.keys(editAccounts)
                        for (let i=0; i<keys.length; i++) {
                          next[e.target.value === keys[i] ? (i===idx?keys[i]:e.target.value) : keys[i]] = editAccounts[keys[i]]
                        }
                        delete next[acct]
                        if (e.target.value !== acct) next[e.target.value] = editAccounts[acct]
                        setEditAccounts(next)
                      }}
                        style={{ padding:'8px', borderRadius:'8px', border:'1.5px solid #e9d5ff', fontSize:'13px', outline:'none', background:'#fff', color:'#78350f', fontWeight:500, minWidth:'76px' }}>
                        {ACCOUNT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input value={val} onChange={e => setEditAccounts(p=>({...p,[acct]:e.target.value}))} placeholder="0"
                        style={{ flex:1, padding:'10px 12px', borderRadius:'10px', border:'1.5px solid #e9d5ff', fontSize:'15px', outline:'none', textAlign:'right' }} />
                      <button type="button" onClick={() => setEditAccounts(p => { const n = {...p}; delete n[acct]; return n })} style={{ width:'32px', height:'32px', borderRadius:'50%', border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'18px', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                    </div>
                  ))}
                  {/* 合计（自动计算） */}
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 0 0', borderTop:'1.5px solid #fcd34d', marginTop:'6px' }}>
                    <span style={{ fontSize:'14px', fontWeight:700, color:'#92400e', minWidth:'64px' }}>💰 合计</span>
                    <span style={{ flex:1, textAlign:'right', fontSize:'18px', fontWeight:800, color:'#92400e' }}>
                      {Object.values(editAccounts).reduce((sum, v) => sum + (parseInt(String(v).replace(/,/g,'')) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginTop:'10px', display:'flex', gap:'6px' }}>
                    <select id="new-acct-select" style={{ flex:1, padding:'8px 12px', borderRadius:'10px', border:'1.5px dashed #d4a373', background:'transparent', fontSize:'13px', outline:'none', color:'#92400e' }}>
                      {ACCOUNT_OPTIONS.filter(o => !Object.keys(editAccounts).includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button onClick={() => {
                      const sel = document.getElementById('new-acct-select')
                      const v = sel?.value
                      if (v && !Object.keys(editAccounts).includes(v)) setEditAccounts(p=>({...p,[v]:''}))
                    }} style={{ padding:'8px 14px', borderRadius:'10px', border:'1.5px dashed #d4a373', background:'transparent', color:'#92400e', fontSize:'13px', cursor:'pointer', whiteSpace:'nowrap' }}>+ 添加</button>
                  </div>
                </div>
              ) : expanded ? (
                <div style={{ padding:'4px 16px 12px', borderTop:'1px solid rgba(251,191,36,0.1)' }}>
                  {Object.entries(r.details||{}).filter(([k])=>k!='_合计').map(([acct, amt]) => (
                    <div key={acct} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:'13px', color:'var(--text-sub)' }}>
                      <span>{acct}</span>
                      <span style={{ fontWeight:500 }}>{amt.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0 4px', fontSize:'13px', fontWeight:700, color:'#78350f', borderTop:'1px solid rgba(251,191,36,0.15)', marginTop:'4px' }}>
                    <span>合计</span>
                    <span>{(r.actual||0).toLocaleString()} / 目标 {(r.target||0).toLocaleString()}</span>
                  </div>
                  <button onClick={() => startEdit(key)} style={{ marginTop:'6px', padding:'4px 12px', borderRadius:'8px', border:'1px solid #e9d5ff', background:'#fef3c7', color:'#92400e', fontSize:'11px', cursor:'pointer' }}>✎ 编辑</button>
                </div>
              ) : (
                <div style={{ padding:'0 12px 10px', borderTop:'1px solid rgba(251,191,36,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', color:'var(--gray-300)' }}>
                    {Object.keys(r.details||{}).filter(k=>k!='_合计').length || 0} 个账户
                  </span>
                  <button onClick={() => startEdit(key)} style={{ padding:'4px 10px', borderRadius:'8px', border:'1px solid #e9d5ff', background:'#fef3c7', color:'#92400e', fontSize:'11px', cursor:'pointer' }}>✎ 编辑</button>
                </div>
              )}
            </div>
          )
        })}      </div>



      {/* 底部固定保存/取消栏（仅编辑时显示） */}
      {editMonth && (
        <div style={{
          position:'fixed',
          left:'50%',
          transform:'translateX(-50%)',
          bottom:'calc(20px + var(--safe-bottom, 0px) + 60px)',
          width:'calc(100% - 32px)',
          maxWidth:'448px',
          display:'flex',
          gap:'10px',
          padding:'10px 14px',
          borderRadius:'16px',
          background:'rgba(255,255,255,0.95)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          boxShadow:'0 -4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(251,191,36,0.3)',
          zIndex:90,
        }}>
          <button onClick={saveEdit} style={{ flex:2, padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,0.3)' }}>保存编辑</button>
          <button onClick={() => setEditMonth(null)} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'1px solid #d4d4d8', background:'#fff', color:'#52525b', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>取消</button>
        </div>
      )}
    </div>
  )
}
