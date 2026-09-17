import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

// 判断基金：代码纯数字且长度 <= 6（A股代码6位，基金代码多为6位；港股/美股带字母则归为股票）
function isFundCode(code) {
  if (!code) return false
  const c = String(code).replace(/\D/g, '')
  return c.length > 0 && c.length <= 6 && /^\d+$/.test(c)
}

function fundBadge(code) {
  return isFundCode(code)
    ? { label: '基金', bg: '#ede9fe', color: '#7c3aed' }
    : { label: '股票', bg: '#fef3c7', color: '#b45309' }
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

  const [activeTab, setActiveTab] = useState('holdings') // holdings | transactions
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
      const fund = isFundCode(inv.code)
      try {
        let newPrice = null
        if (fund) {
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
      const fund = isFundCode(invCode)
      if (fund) {
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
    const fund = isFundCode(invCode)
    try {
      const { StockSDK } = await import('stock-sdk')
      const sdk = new StockSDK()
      if (fund) {
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

  // ── 持仓聚合：按代码合并买卖，计算净持仓 ──
  const holdings = useMemo(() => {
    const map = {}
    investments.forEach((inv) => {
      const code = (inv.code || '').trim()
      if (!code) return
      if (!map[code]) {
        map[code] = {
          code,
          name: inv.name,
          isFund: isFundCode(code),
          buyShares: 0, buyAmount: 0,
          sellShares: 0, sellAmount: 0,
          currentPrice: inv.currentPrice,
          records: [],
        }
      }
      const h = map[code]
      h.records.push(inv)
      if (inv.currentPrice != null) h.currentPrice = inv.currentPrice
      const sh = parseFloat(inv.shares) || 0
      const amt = parseFloat(inv.amount) || (sh * (parseFloat(inv.sellPrice) || 0))
      if (inv.type === 'sell') {
        h.sellShares += sh
        h.sellAmount += amt
      } else {
        h.buyShares += sh
        h.buyAmount += amt
      }
    })
    // 计算净持仓
    return Object.values(map).map((h) => {
      const netShares = h.buyShares - h.sellShares
      const avgCost = h.buyShares > 0 ? h.buyAmount / h.buyShares : 0
      const currentValue = netShares > 0 && h.currentPrice ? netShares * h.currentPrice : 0
      const costBasis = netShares > 0 && avgCost > 0 ? netShares * avgCost : 0
      const profit = currentValue - costBasis
      const profitPct = costBasis > 0 ? (profit / costBasis * 100) : null
      const realizedProfit = h.sellAmount - (h.sellShares > 0 && h.buyShares > 0 ? (h.sellShares * h.buyAmount / h.buyShares) : 0)
      h.records.sort((a, b) => (b.sellDate || '').localeCompare(a.sellDate || ''))
      return { ...h, netShares, avgCost, currentValue, costBasis, profit, profitPct, realizedProfit }
    }).sort((a, b) => b.currentValue - a.currentValue)
  }, [investments])

  // 总持仓统计
  const totalStats = useMemo(() => {
    let totalValue = 0, totalCost = 0, totalRealized = 0
    holdings.forEach((h) => {
      totalValue += h.currentValue
      totalCost += h.costBasis
      totalRealized += h.realizedProfit
    })
    const totalProfit = totalValue - totalCost
    const totalPct = totalCost > 0 ? (totalProfit / totalCost * 100) : null
    return { totalValue, totalCost, totalProfit, totalPct, totalRealized, count: holdings.length }
  }, [holdings])

  // 按代码+买卖类型分组（调仓记录用）
  const groups = useMemo(() => {
    const g = {}
    investments.forEach((inv, idx) => {
      const key = (inv.code || '').trim() + '_' + (inv.type || 'buy')
      if (!g[key]) g[key] = []
      g[key].push({ ...inv, _idx: idx })
    })
    return g
  }, [investments])

  const delItem = (delIdx) => {
    const item = investments[delIdx]
    if (item && item.id) recordDelete('blogger_investments_v1', item.id)
    saveInvestments(investments.filter((_, i) => i !== delIdx))
  }

  const fmtMoney = (n) => {
    if (n == null || isNaN(n)) return '--'
    const abs = Math.abs(n)
    if (abs >= 10000) return (n / 10000).toFixed(2) + 'w'
    return n.toFixed(2)
  }

  return (
    <div className="app-container" style={{ paddingBottom: '100px', background: 'linear-gradient(180deg,#f5f3ff 0%,#faf9ff 40%,#fff 100%)', minHeight: '100vh' }}>
      <header style={{ padding: 'calc(12px + var(--safe-top)) 20px 12px', borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
        <h1 style={{ margin:0, fontSize:'20px', fontWeight:700, color:'#1e1b4b' }}>📈 投资跟踪</h1>
        <p style={{ margin:'4px 0 0', fontSize:'12px', color:'#8b87a8' }}>实时行情自动刷新 · 股票基金分色</p>
      </header>

      {/* Tab 切换 */}
      <div style={{ display:'flex', gap:'0', padding:'12px 16px 0', background:'transparent' }}>
        {[
          { key:'holdings', label:'持仓', icon:'💼' },
          { key:'transactions', label:'调仓', icon:'🔄' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex:1, padding:'10px 0', border:'none', cursor:'pointer',
              fontSize:'14px', fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#6d28d9' : '#9ca3af',
              background: activeTab === tab.key ? 'rgba(124,58,237,0.08)' : 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid #7c3aed' : '2px solid transparent',
              borderTopLeftRadius: tab.key === 'holdings' ? '10px' : 0,
              borderTopRightRadius: tab.key === 'transactions' ? '10px' : 0,
              transition:'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
            {tab.key === 'holdings' && totalStats.count > 0 && (
              <span style={{ fontSize:'10px', marginLeft:'4px', color:'#7c3aed' }}>({totalStats.count})</span>
            )}
            {tab.key === 'transactions' && investments.length > 0 && (
              <span style={{ fontSize:'10px', marginLeft:'4px', color:'#7c3aed' }}>({investments.length})</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding:'12px 16px 0' }}>
        {/* ────── 持仓 Tab ────── */}
        {activeTab === 'holdings' && (
          <>
            {/* 总览卡片 */}
            {holdings.length > 0 && (
              <div style={{
                background:'linear-gradient(135deg,#6d28d9 0%,#8b5cf6 100%)',
                borderRadius:'14px', padding:'16px', marginBottom:'12px',
                boxShadow:'0 4px 16px rgba(109,40,217,0.25)',
              }}>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', marginBottom:'4px' }}>持仓总市值</div>
                <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>
                  ¥{fmtMoney(totalStats.totalValue)}
                </div>
                <div style={{ display:'flex', gap:'16px', marginTop:'10px', flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)' }}>浮动盈亏</div>
                    <div style={{ fontSize:'14px', fontWeight:700, color: totalStats.totalProfit >= 0 ? '#fecaca' : '#bbf7d0' }}>
                      {totalStats.totalProfit >= 0 ? '+' : ''}{fmtMoney(totalStats.totalProfit)}
                      {totalStats.totalPct != null && ` (${totalStats.totalPct >= 0 ? '+' : ''}${totalStats.totalPct.toFixed(2)}%)`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)' }}>已实现盈亏</div>
                    <div style={{ fontSize:'14px', fontWeight:700, color: totalStats.totalRealized >= 0 ? '#fecaca' : '#bbf7d0' }}>
                      {totalStats.totalRealized >= 0 ? '+' : ''}{fmtMoney(totalStats.totalRealized)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)' }}>持仓成本</div>
                    <div style={{ fontSize:'14px', fontWeight:700, color:'#e9d5ff' }}>¥{fmtMoney(totalStats.totalCost)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 持仓列表 */}
            {holdings.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#a5a3b8' }}>
                <div style={{ fontSize:'40px', marginBottom:'10px' }}>📊</div>
                <p style={{ fontSize:'13px', margin:0 }}>暂无持仓，点下方「添加」记录一笔</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {holdings.map((h) => {
                  const badge = fundBadge(h.code)
                  const profitColor = h.profit >= 0 ? '#dc2626' : '#16a34a'
                  const profitBg = h.profit >= 0 ? 'rgba(220,38,38,0.06)' : 'rgba(22,163,74,0.06)'
                  return (
                    <div key={h.code} style={{
                      background:'#fff', borderRadius:'12px', padding:'12px 14px',
                      border:'1px solid rgba(124,58,237,0.12)',
                      boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                      {/* 第一行：名称 + 类型 + 代码 */}
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                        <span style={{
                          fontSize:'10px', padding:'2px 7px', borderRadius:'6px',
                          background: badge.bg, color: badge.color, fontWeight:700, flexShrink:0,
                        }}>{badge.label}</span>
                        <span style={{ fontSize:'15px', fontWeight:700, color:'#1e1b4b', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.name}</span>
                        <span style={{ fontSize:'11px', color:'#a5a3b8', flexShrink:0 }}>{h.code}</span>
                      </div>
                      {/* 第二行：市值 + 盈亏 */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'8px' }}>
                        <div>
                          <div style={{ fontSize:'10px', color:'#a5a3b8' }}>市值</div>
                          <div style={{ fontSize:'18px', fontWeight:800, color:'#1e1b4b' }}>¥{fmtMoney(h.currentValue)}</div>
                        </div>
                        <div style={{ textAlign:'right', padding:'4px 10px', borderRadius:'8px', background: profitBg }}>
                          <div style={{ fontSize:'10px', color:'#a5a3b8' }}>浮动盈亏</div>
                          <div style={{ fontSize:'14px', fontWeight:700, color: profitColor }}>
                            {h.profit >= 0 ? '+' : ''}{fmtMoney(h.profit)}
                            {h.profitPct != null && ` (${h.profitPct >= 0 ? '+' : ''}${h.profitPct.toFixed(1)}%)`}
                          </div>
                        </div>
                      </div>
                      {/* 第三行：明细 */}
                      <div style={{ display:'flex', gap:'12px', fontSize:'11px', color:'#6b7280', flexWrap:'wrap', borderTop:'1px dashed #f0eef8', paddingTop:'8px' }}>
                        <span>持仓 <b style={{ color:'#4c1d95' }}>{h.netShares}</b></span>
                        <span>成本 <b style={{ color:'#4c1d95' }}>{h.avgCost > 0 ? h.avgCost.toFixed(3) : '--'}</b></span>
                        <span>现价 <b style={{ color:'#4c1d95' }}>{h.currentPrice ?? '--'}</b></span>
                        {Math.abs(h.realizedProfit) > 0.01 && (
                          <span>已实现 <b style={{ color: h.realizedProfit >= 0 ? '#dc2626' : '#16a34a' }}>{h.realizedProfit >= 0 ? '+' : ''}{fmtMoney(h.realizedProfit)}</b></span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ────── 调仓 Tab ────── */}
        {activeTab === 'transactions' && (
          <>
            {investments.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#a5a3b8' }}>
                <div style={{ fontSize:'40px', marginBottom:'10px' }}>🔄</div>
                <p style={{ fontSize:'13px', margin:0 }}>暂无调仓记录，点下方「添加」记录一笔</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {Object.entries(groups).map(([key, items]) => {
                  items.sort((a, b) => (b.sellDate || '').localeCompare(a.sellDate || ''))
                  const latest = items[0]
                  const expanded = expandedInv === key
                  const badge = fundBadge(latest.code)
                  const isSell = latest.type === 'sell'
                  return (
                    <div key={key} style={{
                      background:'#fff', borderRadius:'12px',
                      borderLeft: `3px solid ${isSell ? '#f43f5e' : '#10b981'}`,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                      overflow:'hidden',
                    }}>
                      <div onClick={() => setExpandedInv(expanded ? null : key)} style={{ padding:'11px 14px', cursor:'pointer' }}>
                        {/* 第一行 */}
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                          <span style={{
                            fontSize:'10px', padding:'2px 6px', borderRadius:'5px',
                            background: badge.bg, color: badge.color, fontWeight:700, flexShrink:0,
                          }}>{badge.label}</span>
                          <span style={{
                            fontSize:'10px', padding:'2px 6px', borderRadius:'5px', fontWeight:700, flexShrink:0,
                            background: isSell ? '#fee2e2' : '#d1fae5',
                            color: isSell ? '#e11d48' : '#059669',
                          }}>{isSell ? '卖出' : '买入'}</span>
                          <span style={{ fontSize:'14px', fontWeight:700, color:'#1e1b4b', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{latest.name}</span>
                          <span style={{ fontSize:'11px', color:'#a5a3b8', flexShrink:0 }}>{latest.code}</span>
                        </div>
                        {/* 第二行：价格信息 */}
                        <div style={{ display:'flex', gap:'14px', fontSize:'12px', flexWrap:'wrap', alignItems:'center' }}>
                          <span>{isSell ? '卖出价' : '买入价'}: <b style={{ color:'#1e1b4b', fontSize:'14px' }}>{latest.sellPrice}</b></span>
                          {latest.shares > 0 && <span>份额: <b style={{ color:'#7c3aed' }}>{latest.shares}</b></span>}
                          {latest.amount > 0 && <span>金额: <b style={{ color:'#059669' }}>¥{latest.amount.toFixed(2)}</b></span>}
                          {latest.currentPrice != null && (
                            <span style={{ color: (latest.change ?? 0) >= 0 ? '#dc2626' : '#16a34a', fontWeight:600 }}>
                              {(latest.change ?? 0) >= 0 ? '📈' : '📉'} {latest.change != null ? (latest.change >= 0 ? '+' : '') + latest.change.toFixed(2) + '%' : '--'}
                            </span>
                          )}
                        </div>
                        {/* 第三行：日期 + 记录数 */}
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:'5px' }}>
                          {latest.sellDate && <span style={{ fontSize:'11px', color:'#9ca3af' }}>📅 {latest.sellDate}</span>}
                          <span style={{ fontSize:'11px', color:'#7c3aed', fontWeight:600, marginLeft:'auto' }}>
                            {items.length} 条记录 {expanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>
                      {/* 展开历史记录 */}
                      {expanded && (
                        <div style={{ borderTop:'1px solid #f3f0fa', padding:'6px 14px 10px', background:'#faf9ff' }}>
                          <div style={{ fontSize:'10px', fontWeight:600, color:'#7c3aed', marginBottom:'4px' }}>历史记录</div>
                          {items.map((inv, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 0', borderBottom: i < items.length - 1 ? '1px solid #f0eef8' : 'none' }}>
                              <span style={{ fontSize:'10px', color:'#a5a3b8', fontWeight:600, minWidth:'22px' }}>#{items.length - i}</span>
                              <span style={{ flex:1, fontSize:'13px', color:'#1e1b4b', fontWeight:700 }}>{inv.sellPrice}</span>
                              {inv.shares > 0 && <span style={{ fontSize:'11px', color:'#7c3aed' }}>{inv.shares}份</span>}
                              {inv.amount > 0 && <span style={{ fontSize:'11px', color:'#059669' }}>¥{inv.amount.toFixed(2)}</span>}
                              {inv.sellDate && <span style={{ fontSize:'11px', color:'#9ca3af' }}>{inv.sellDate}</span>}
                              <button onClick={(e) => { e.stopPropagation(); delItem(inv._idx) }} style={{ background:'none', border:'none', color:'#f43f5e', fontSize:'14px', cursor:'pointer', padding:'2px 4px', lineHeight:1 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ────── 添加表单（两个 Tab 共用） ────── */}
        {!showAddInv ? (
          <button onClick={() => setShowAddInv(true)} style={{
            marginTop:'12px', padding:'11px 14px', borderRadius:'10px',
            border:'1.5px dashed #7c3aed', background:'rgba(124,58,237,0.04)',
            color:'#6d28d9', fontSize:'14px', fontWeight:600, cursor:'pointer', width:'100%',
          }}>+ 添加{activeTab === 'holdings' ? '持仓' : '调仓'}记录</button>
        ) : (
          <div style={{
            marginTop:'12px', padding:'14px', borderRadius:'12px',
            border:'1.5px solid #7c3aed', background:'rgba(124,58,237,0.04)',
            boxSizing:'border-box',
          }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#6d28d9', marginBottom:'10px' }}>📝 添加记录</div>
            <input value={invCode} onChange={e => setInvCode(e.target.value)} placeholder='代码 如 600519（股票）/ 110011（基金）' style={{ width:'100%', boxSizing:'border-box', padding:'11px 12px', borderRadius:'8px', border:'1.5px solid #c4b5fd', fontSize:'14px', outline:'none', marginBottom:'10px', minWidth:0 }} />
            <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
              <button type='button' onClick={() => setInvType('buy')} style={{ flex:1, minWidth:0, padding:'11px 0', borderRadius:'8px', border: invType==='buy' ? '1.5px solid #10b981' : '1px solid #c4b5fd', background: invType==='buy' ? '#10b981' : '#fff', color: invType==='buy' ? '#fff' : '#666', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>买入</button>
              <button type='button' onClick={() => setInvType('sell')} style={{ flex:1, minWidth:0, padding:'11px 0', borderRadius:'8px', border: invType==='sell' ? '1.5px solid #e11d48' : '1px solid #c4b5fd', background: invType==='sell' ? '#e11d48' : '#fff', color: invType==='sell' ? '#fff' : '#666', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>卖出</button>
            </div>
            <button onClick={fetchAndAdd} style={{ width:'100%', boxSizing:'border-box', padding:'12px', borderRadius:'8px', border:'none', background:'#7c3aed', color:'#fff', fontSize:'14px', fontWeight:600, cursor:'pointer', marginBottom:'10px' }}>获取实时行情</button>
            {invName && (
              <div style={{ margin:'0 0 10px', padding:'8px 10px', borderRadius:'8px', background:'#fff', border:'1px solid #e9d5ff' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'5px', background: fundBadge(invCode).bg, color: fundBadge(invCode).color, fontWeight:700 }}>{fundBadge(invCode).label}</span>
                  <span style={{ fontSize:'14px', color:'#4c1d95', fontWeight:700 }}>{invName}</span>
                </div>
                <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'3px' }}>当前价: <b style={{ color:'#7c3aed' }}>{invCurrentPrice}</b></div>
              </div>
            )}
            <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
              <input value={invSellPrice} onChange={e => setInvSellPrice(e.target.value)} placeholder={invType==='buy' ? '买入价' : '卖出价'} type='number' step='any' style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'11px 10px', borderRadius:'8px', border:'1.5px solid #c4b5fd', fontSize:'14px', outline:'none', textAlign:'center' }} />
              <input value={invShares} onChange={e => setInvShares(e.target.value)} placeholder='份额' type='number' step='any' style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'11px 10px', borderRadius:'8px', border:'1.5px solid #c4b5fd', fontSize:'14px', outline:'none', textAlign:'center' }} />
            </div>
            {invSellPrice && invShares && (
              <p style={{ margin:'0 0 10px', fontSize:'14px', color:'#059669', fontWeight:700, textAlign:'center' }}>
                💰 金额: {(parseFloat(invSellPrice) * parseFloat(invShares)).toFixed(2)}
              </p>
            )}
            <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
              <input value={invSellDate} onChange={e => setInvSellDate(e.target.value)} type='date' style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'11px 10px', borderRadius:'8px', border:'1.5px solid #c4b5fd', fontSize:'14px', outline:'none', textAlign:'center', color:'#4c1d95' }} />
            </div>
            {invCurrentPrice && (
              <button type='button' onClick={fetchHistoricalPrice} style={{ width:'100%', boxSizing:'border-box', padding:'8px', marginBottom:'10px', borderRadius:'8px', border:'1.5px dashed #7c3aed', background:'transparent', color:'#7c3aed', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>📅 用 {invSellDate || '选定日'} 的价格填入</button>
            )}
            <button onClick={confirmAddInv} style={{ width:'100%', boxSizing:'border-box', padding:'12px', borderRadius:'8px', border:'none', background:'#10b981', color:'#fff', fontSize:'15px', fontWeight:700, cursor:'pointer' }}>保存</button>
            <button onClick={() => { setShowAddInv(false); setInvType('buy') }} style={{ width:'100%', boxSizing:'border-box', padding:'8px', borderRadius:'8px', border:'none', background:'transparent', color:'#666', fontSize:'13px', cursor:'pointer', marginTop:'4px' }}>取消</button>
          </div>
        )}
      </div>
    </div>
  )
}
