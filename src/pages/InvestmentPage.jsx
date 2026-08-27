import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store'
import { recordDelete } from '../utils/sync'

const STORAGE_KEY = 'blogger_investments_v1'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadInvestments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch(e) {}
  return []
}

function formatNum(n) {
  if (!n && n !== 0) return ''
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toLocaleString()
}

export function InvestmentPage() {
  const { getSavings, setSavings } = useStore()
  const sd = getSavings() || {}
  const [investments, setInvestments] = useState(() => {
    const saved = loadInvestments()
    return saved || (sd.investments) || []
  })
  const saveInvestments = (list) => {
    setInvestments(list)
    setSavings({ investments: list })
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch(e) {}
  }

  const [showAddInv, setShowAddInv] = useState(false)
  const [expandedInv, setExpandedInv] = useState(null)
  const [invCode, setInvCode] = useState('')
  const [invName, setInvName] = useState('')
  const [invCurrentPrice, setInvCurrentPrice] = useState(null)
  const [invSellPrice, setInvSellPrice] = useState('')
  const [invSellDate, setInvSellDate] = useState('')
  const [invType, setInvType] = useState('buy')
  const [invShares, setInvShares] = useState('')

  // 自动刷新所有投资的当前价（页面加载时静默执行）
  const autoRefreshPrices = useCallback(async (list) => {
    if (!list || list.length === 0) return
    const { StockSDK } = await import('stock-sdk')
    const sdk = new StockSDK()
    let changed = false
    const updated = await Promise.all(list.map(async (inv) => {
      if (!inv.code) return inv
      const code = inv.code.replace(/\D/g, '')
      const isFund = code.length <= 6
      try {
        let newPrice = null
        if (isFund) {
          const q = await sdk.quotes.fund([code])
          if (q?.[0]) newPrice = q[0].nav
        } else {
          const q = await sdk.quotes.cn([code])
          if (q?.[0]) newPrice = q[0].price
        }
        if (newPrice != null && newPrice !== inv.currentPrice) {
          changed = true
          const sp = inv.sellPrice
          const change = sp ? ((newPrice - sp) / sp * 100) : null
          return { ...inv, currentPrice: newPrice, change }
        }
      } catch(e) { /* silent fail */ }
      return inv
    }))
    if (changed) {
      setInvestments(updated)
      setSavings({ investments: updated })
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch(e) {}
    }
  }, [setInvestments, setSavings])

  const invRef = useRef(investments)
  invRef.current = investments

  useEffect(() => {
    autoRefreshPrices(invRef.current)
    const timer = setInterval(() => autoRefreshPrices(invRef.current), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchAndAdd = async () => {
    if (!invCode.trim()) return
    try {
      const { StockSDK } = await import('stock-sdk')
      const sdk = new StockSDK()
      const code = invCode.trim().replace(/\D/g, '')
      const isFund = code.length <= 6
      if (isFund) {
        const q = await sdk.quotes.fund([code])
        if (q?.[0]) { setInvName(q[0].name); setInvCurrentPrice(q[0].nav) }
        if (invSellDate) {
          try {
            const cb = 'fund_cb_' + Date.now()
            const jsonpUrl = 'https://api.fund.eastmoney.com/f10/lsjz?callback=' + cb + '&fundCode=' + code + '&pageIndex=1&pageSize=90'
            window[cb] = (d) => {
              const found = d?.Data?.LSJZList?.find(x => x.FSRQ === invSellDate)
              if (found) setInvSellPrice(String(parseFloat(found.DWJZ)))
              delete window[cb]
            }
            const sc = document.createElement('script')
            sc.src = jsonpUrl
            document.body.appendChild(sc)
            setTimeout(() => { if (window[cb]) { delete window[cb] } }, 8000)
          } catch(e) { /* 静默失败，用户可手动填 */ }
        }
      } else {
        const q = await sdk.quotes.cn([code])
        if (q?.[0]) { setInvName(q[0].name); setInvCurrentPrice(q[0].price) }
      }
    } catch(e) { alert('获取行情失败: ' + e.message) }
  }

  const fetchHistoricalPrice = async () => {
    if (!invCode.trim()) { alert('请先填写代码'); return }
    if (!invSellDate) { alert('请先选择' + (invType==='buy' ? '买入日' : '卖出日')); return }
    const code = invCode.trim().replace(/\D/g, '')
    const isFund = code.length <= 6
    try {
      const { StockSDK } = await import('stock-sdk')
      const sdk = new StockSDK()
      if (isFund) {
        const cb = 'fund_cb_' + Date.now()
        const jsonpUrl = 'https://api.fund.eastmoney.com/f10/lsjz?callback=' + cb + '&fundCode=' + code + '&pageIndex=1&pageSize=120'
        await new Promise((resolve, reject) => {
          window[cb] = (d) => {
            const list = d?.Data?.LSJZList || []
            const norm = (s) => String(s || '').slice(0, 10).replace(/[\/]/g, '-')
            const target = norm(invSellDate)
            let found = list.find(x => norm(x.FSRQ) === target)
            if (!found) {
              const sorted = list.filter(x => norm(x.FSRQ) <= target).sort((a, b) => norm(b.FSRQ).localeCompare(norm(a.FSRQ)))
              if (sorted.length > 0) {
                const targetTs = new Date(target).getTime()
                const diffs = sorted.map(x => Math.abs(new Date(norm(x.FSRQ)).getTime() - targetTs)).filter(d => d <= 7 * 86400000)
                if (diffs.length > 0 && diffs[0] <= 7 * 86400000) found = sorted[diffs.indexOf(diffs[0])]
              }
            }
            if (found) {
              const v = parseFloat(found.DWJZ)
              setInvSellPrice(String(v))
              const actualDate = norm(found.FSRQ)
              if (actualDate !== target) {
                alert('未找到 ' + target + ' 的净值（节假日），已填入最近工作日 ' + actualDate + ' 净值: ' + v)
              } else {
                alert('已填入 ' + target + ' 净值: ' + v)
              }
            } else if (list.length === 0) {
              alert('无法查询基金历史净值（接口需要东方财富域名访问）\n\n请打开查看历史净值：\nhttps://fundf10.eastmoney.com/jjjz_' + code + '.html\n\n查好后手动填入下方的价格框即可。')
            } else {
              alert('未找到 ' + target + ' 的净值（共查询到 ' + list.length + ' 条数据）')
            }
            delete window[cb]; document.getElementById(cb)?.remove(); resolve()
          }
          const sc = document.createElement('script')
          sc.id = cb
          sc.src = jsonpUrl
          sc.onerror = () => { delete window[cb]; reject(new Error('jsonp error')) }
          document.body.appendChild(sc)
          setTimeout(() => { if (window[cb]) { delete window[cb]; reject(new Error('timeout')) } }, 10000)
        })
      } else {
        const kl = await sdk.kline.cn(code, { klt: 101, fq: 'qfq', lmt: 60 })
        const arr = Array.isArray(kl) ? kl : (kl?.data || [])
        const fmt = (ts) => {
          const d = new Date(typeof ts === 'number' ? ts * 1000 : ts)
          const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
          return `${y}-${m}-${day}`
        }
        const found = arr.find(x => fmt(x.t || x.time || x.day) === invSellDate)
        if (found) {
          const v = parseFloat(found.c ?? found.close ?? found.price)
          setInvSellPrice(String(v))
          alert('已填入 ' + invSellDate + ' 收盘价: ' + v)
        } else {
          alert('未找到 ' + invSellDate + ' 的行情（周末/节假日无数据）')
        }
      }
    } catch(e) { alert('查询历史价失败: ' + e.message) }
  }

  const confirmAddInv = () => {
    if (!invName) { alert('请先填写代码并获取行情'); return }
    if (!invSellPrice) { alert('请填写' + (invType==='buy' ? '买入价' : '卖出价')); return }
    const sp = parseFloat(invSellPrice)
    const cp = invCurrentPrice
    const change = cp && sp ? ((cp - sp) / sp * 100) : null
    const normCode = invCode.trim()
    const shares = parseFloat(invShares) || 0
    const amount = shares * sp
    const newItem = { id: uid(), code:normCode, name:invName, sellPrice:sp, currentPrice:cp, sellDate:invSellDate, type:invType, change, shares, amount, updatedAt: Date.now() }
    setInvCode('')
    setInvName('')
    setInvCurrentPrice(null)
    setInvSellPrice('')
    setInvSellDate('')
    setInvType('buy')
    setInvShares('')
    setTimeout(() => saveInvestments([...investments, newItem]), 0)
  }

  // 按代码+买卖类型分组
  const groups = {}
  investments.forEach((inv, idx) => {
    const key = (inv.code || '').trim() + '_' + (inv.type || 'buy')
    if (!groups[key]) groups[key] = []
    groups[key].push({ ...inv, _idx: idx })
  })

  return (
    <div className="app-container" style={{ paddingBottom: '100px' }}>
      <header style={{ padding: 'calc(12px + var(--safe-top)) 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
        <h1 style={{ margin:0, fontSize:'20px', fontWeight:700, color:'var(--text-main)' }}>📈 投资跟踪</h1>
        <p style={{ margin:'6px 0 0', fontSize:'13px', color:'var(--text-sub)' }}>实时行情自动刷新</p>
      </header>

      <div style={{ marginTop:'24px', padding:'0 16px' }}>
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
          <div style={{ flex:1, textAlign:'center', padding:'10px', borderRadius:'12px', background:'rgba(99,102,241,0.06)' }}>
            <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>持有代码</div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'var(--text-main)' }}>{Object.keys(groups).length}</div>
          </div>
          <div style={{ flex:1, textAlign:'center', padding:'10px', borderRadius:'12px', background:'rgba(99,102,241,0.06)' }}>
            <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>交易次数</div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'var(--text-main)' }}>{investments.length}</div>
          </div>
        </div>

        {investments.length === 0 && <p style={{ fontSize:"13px", color:"var(--gray-300)", margin:"0 0 10px" }}>暂无记录</p>}
        {Object.entries(groups).map(([key, items]) => {
          items.sort((a, b) => (b.sellDate || '').localeCompare(a.sellDate || ''))
          const latest = items[0]
          const expanded = expandedInv === key
          const delItem = (delIdx) => {
            const item = investments[delIdx]
            if (item && item.id) recordDelete('blogger_investments_v1', item.id)
            saveInvestments(investments.filter((_, i) => i !== delIdx))
          }
          return (
            <div key={key} style={{ marginBottom:'8px', borderRadius:'12px', border:'1px solid rgba(99,102,241,0.2)', background:'rgba(238,242,255,0.4)', overflow:'hidden' }}>
              <div onClick={() => setExpandedInv(expanded ? null : key)} style={{ padding:'10px 12px', cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'14px', fontWeight:600, color:'#4338ca' }}>
                    {latest.name}
                    <span style={{ fontSize:'10px', marginLeft:'6px', padding:'2px 6px', borderRadius:'6px', background: latest.type==='sell' ? '#fee2e2' : '#d1fae5', color: latest.type==='sell' ? '#e11d48' : '#059669', fontWeight:700 }}>{latest.type==='sell' ? '卖出' : '买入'}</span>
                    <span style={{ fontSize:'11px', color:'var(--gray-300)', marginLeft:'6px' }}>{latest.code}</span>
                  </span>
                  <span style={{ fontSize:'11px', color:'#6366f1', fontWeight:600 }}>{items.length} 条记录 {expanded ? '🔼' : '🔽'}</span>
                </div>
                <div style={{ display:'flex', gap:'12px', marginTop:'6px', fontSize:'12px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'13px' }}>{latest.type==='sell' ? '卖出' : '买入'}: <b style={{ color:'#1f2937', fontSize:'15px' }}>{latest.sellPrice}</b></span>
                  {latest.shares ? <span style={{ fontSize:'13px' }}>份额: <b style={{ color:'#7c3aed', fontSize:'15px' }}>{latest.shares}</b></span> : null}
                  {latest.amount ? <span style={{ fontSize:'13px' }}>金额: <b style={{ color:'#059669', fontSize:'15px' }}>¥{latest.amount.toFixed(2)}</b></span> : null}
                  <span style={{ fontSize:'13px' }}>当前: <b style={{ color:'#4f46e5', fontSize:'15px' }}>{latest.currentPrice ?? '--'}</b></span>
                  <span style={{ color: (latest.change ?? 0) >= 0 ? '#dc2626' : '#059669', fontWeight:600 }}>
                    {(latest.change ?? 0) >= 0 ? '📈' : '📉'} {latest.change != null ? (latest.change >= 0 ? '+' : '') + latest.change.toFixed(2) + '%' : '--'}
                  </span>
                </div>
                {latest.sellDate && <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'4px' }}>📅 {latest.type==='sell' ? '卖出日' : '买入日'}: {latest.sellDate}</div>}
              </div>
              {expanded && (
                <div style={{ borderTop:'1px solid rgba(99,102,241,0.1)', padding:'6px 12px 10px' }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:'#6366f1', marginBottom:'6px' }}>📋 历史记录（按日期倒序）</div>
                  {items.map((inv, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 0', borderBottom: i<items.length-1 ? '1px solid rgba(99,102,241,0.06)' : 'none' }}>
                      <span style={{ fontSize:'11px', color:'#6366f1', fontWeight:600, minWidth:'20px' }}>#{items.length - i}</span>
                      <span style={{ flex:1, fontSize:'13px', color:'#1f2937', fontWeight:700 }}>{inv.sellPrice}</span>
                      {inv.shares ? <span style={{ fontSize:'11px', color:'#7c3aed' }}>{inv.shares}份</span> : null}
                      {inv.amount ? <span style={{ fontSize:'11px', color:'#059669' }}>¥{inv.amount.toFixed(2)}</span> : null}
                      {inv.sellDate && <span style={{ fontSize:'11px', color:'#6b7280' }}>{inv.sellDate}</span>}
                      <button onClick={(e) => { e.stopPropagation(); delItem(inv._idx) }} style={{ background:'none', border:'none', color:'#e11d48', fontSize:'14px', cursor:'pointer', padding:'2px 4px', lineHeight:1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {!showAddInv ? (
          <button onClick={() => setShowAddInv(true)} style={{ marginTop:"4px", padding:"8px 14px", borderRadius:"10px", border:"1.5px dashed #6366f1", background:"transparent", color:"#4338ca", fontSize:"13px", cursor:"pointer", width:"100%" }}>+ 添加</button>
        ) : (
          <div style={{ marginTop:'8px', padding:'12px', borderRadius:'12px', border:'1.5px solid #6366f1', background:'rgba(238,242,255,0.3)', boxSizing:'border-box' }}>
            <input value={invCode} onChange={e => setInvCode(e.target.value)} placeholder='代码 如600519' style={{ width:'100%', boxSizing:'border-box', padding:'11px 12px', borderRadius:'8px', border:'1.5px solid #c7d2fe', fontSize:'14px', outline:'none', marginBottom:'10px', minWidth:0 }} />
            <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
              <button type='button' onClick={() => setInvType('buy')} style={{ flex:1, minWidth:0, padding:'11px 0', borderRadius:'8px', border: invType==='buy' ? '1.5px solid #10b981' : '1px solid #c7d2fe', background: invType==='buy' ? '#10b981' : '#fff', color: invType==='buy' ? '#fff' : '#666', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>买入</button>
              <button type='button' onClick={() => setInvType('sell')} style={{ flex:1, minWidth:0, padding:'11px 0', borderRadius:'8px', border: invType==='sell' ? '1.5px solid #e11d48' : '1px solid #c7d2fe', background: invType==='sell' ? '#e11d48' : '#fff', color: invType==='sell' ? '#fff' : '#666', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>卖出</button>
            </div>
            <button onClick={fetchAndAdd} style={{ width:'100%', boxSizing:'border-box', padding:'12px', borderRadius:'8px', border:'none', background:'#6366f1', color:'#fff', fontSize:'14px', fontWeight:600, cursor:'pointer', marginBottom:'10px' }}>获取实时行情</button>
            {invName && <p style={{ margin:'0 0 10px', fontSize:'14px', color:'#4338ca', fontWeight:700 }}>📌 {invName}  当前: {invCurrentPrice}</p>}
            <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
              <input value={invSellPrice} onChange={e => setInvSellPrice(e.target.value)} placeholder={invType==='buy' ? '买入价' : '卖出价'} type='number' step='any' style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'11px 10px', borderRadius:'8px', border:'1.5px solid #c7d2fe', fontSize:'14px', outline:'none', textAlign:'center' }} />
              <input value={invShares} onChange={e => setInvShares(e.target.value)} placeholder='份额' type='number' step='any' style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'11px 10px', borderRadius:'8px', border:'1.5px solid #c7d2fe', fontSize:'14px', outline:'none', textAlign:'center' }} />
            </div>
            {invSellPrice && invShares && (
              <p style={{ margin:'0 0 10px', fontSize:'14px', color:'#059669', fontWeight:700, textAlign:'center' }}>
                💰 金额: {(parseFloat(invSellPrice) * parseFloat(invShares)).toFixed(2)}
              </p>
            )}
            <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
              <input value={invSellDate} onChange={e => setInvSellDate(e.target.value)} type='date' style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'11px 10px', borderRadius:'8px', border:'1.5px solid #c7d2fe', fontSize:'14px', outline:'none', textAlign:'center', color:'#4338ca' }} />
            </div>
            {invCurrentPrice && (
              <button type='button' onClick={fetchHistoricalPrice} style={{ width:'100%', boxSizing:'border-box', padding:'8px', marginBottom:'10px', borderRadius:'8px', border:'1.5px dashed #6366f1', background:'transparent', color:'#6366f1', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>📅 用 {invSellDate || '选定日'} 的价格填入</button>
            )}
            <button onClick={confirmAddInv} style={{ width:'100%', boxSizing:'border-box', padding:'12px', borderRadius:'8px', border:'none', background:'#10b981', color:'#fff', fontSize:'15px', fontWeight:700, cursor:'pointer' }}>保存</button>
            <button onClick={() => { setShowAddInv(false); setInvType('buy') }} style={{ width:'100%', boxSizing:'border-box', padding:'8px', borderRadius:'8px', border:'none', background:'transparent', color:'#666', fontSize:'13px', cursor:'pointer', marginTop:'4px' }}>取消</button>
          </div>
        )}
      </div>
    </div>
  )
}
