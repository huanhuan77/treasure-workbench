import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store'
import { recordDelete } from '../utils/sync'
import { Modal } from '../components/Modal'

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

// 自动判断：纯数字且 <=6 位为基金，否则为股票（旧数据兜底）
function autoDetectType(code) {
  if (!code) return 'stock'
  const c = String(code).replace(/\D/g, '')
  return c.length > 0 && c.length <= 6 && /^\d+$/.test(c) ? 'fund' : 'stock'
}

// 获取记录的资产类型：优先用 assetType 字段，没有则自动判断
function getAssetType(inv) {
  return inv.assetType || autoDetectType(inv.code)
}

const TYPE_STYLE = {
  stock: { label: '股票', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', dot: '#3b82f6' },
  fund: { label: '基金', bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#f59e0b' },
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

  const [activeTab, setActiveTab] = useState('stock') // stock / fund
  const [showAddInv, setShowAddInv] = useState(false)
  const [expandedInv, setExpandedInv] = useState(null)
  // 表单状态
  const [invCode, setInvCode] = useState('')
  const [invName, setInvName] = useState('')
  const [invCurrentPrice, setInvCurrentPrice] = useState(null)
  const [invSellPrice, setInvSellPrice] = useState('')
  const [invSellDate, setInvSellDate] = useState('')
  const [invType, setInvType] = useState('buy')
  const [invShares, setInvShares] = useState('')
  const [invAssetType, setInvAssetType] = useState('stock') // 新增时默认股票

  // 自动刷新行情
  const autoRefreshPrices = useCallback(async (list) => {
    if (!list || list.length === 0) return
    const { StockSDK } = await import('stock-sdk')
    const sdk = new StockSDK()
    let changed = false
    const updated = await Promise.all(list.map(async (inv) => {
      if (!inv.code) return inv
      const code = inv.code.replace(/\D/g, '')
      const at = getAssetType(inv)
      try {
        let newPrice = null
        if (at === 'fund') {
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
      } catch(e) {}
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
      // 先获取实时行情拿名称
      if (invAssetType === 'fund') {
        const q = await sdk.quotes.fund([code])
        if (q?.[0]) { setInvName(q[0].name); setInvCurrentPrice(q[0].nav) }
      } else {
        const q = await sdk.quotes.cn([code])
        if (q?.[0]) { setInvName(q[0].name); setInvCurrentPrice(q[0].price) }
      }
      // 如果选了日期，自动获取该日期的历史价格填入
      if (invSellDate) {
        setTimeout(() => fetchHistoricalPrice(), 100)
      }
    } catch(e) { alert('获取行情失败: ' + e.message) }
  }

  const fetchHistoricalPrice = async () => {
    if (!invCode.trim()) { alert('请先填写代码'); return }
    if (!invSellDate) { alert('请先选择' + (invType==='buy' ? '买入日' : '卖出日')); return }
    const code = invCode.trim().replace(/\D/g, '')
    try {
      const { StockSDK } = await import('stock-sdk')
      const sdk = new StockSDK()
      if (invAssetType === 'fund') {
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
    const newItem = {
      id: uid(), code: normCode, name: invName, sellPrice: sp, currentPrice: cp,
      sellDate: invSellDate, type: invType, change, shares, amount,
      assetType: invAssetType, updatedAt: Date.now(),
    }
    setInvCode(''); setInvName(''); setInvCurrentPrice(null); setInvSellPrice(''); setInvSellDate(''); setInvType('buy'); setInvShares(''); setInvAssetType('stock')
    setTimeout(() => saveInvestments([...investments, newItem]), 0)
    setShowAddInv(false)
  }

  // 按代码+买卖类型分组
  const groups = {}
  investments.forEach((inv, idx) => {
    const key = (inv.code || '').trim() + '_' + (inv.type || 'buy')
    if (!groups[key]) groups[key] = []
    groups[key].push({ ...inv, _idx: idx })
  })

  // 按 Tab 过滤分组
  const filteredGroups = Object.entries(groups).filter(([_, items]) => {
    if (activeTab === 'all') return true
    return getAssetType(items[0]) === activeTab
  })

  // 各类型数量
  const stockCount = investments.filter(i => getAssetType(i) === 'stock').length
  const fundCount = investments.filter(i => getAssetType(i) === 'fund').length

  const delItem = (delIdx) => {
    const item = investments[delIdx]
    if (item && item.id) recordDelete('blogger_investments_v1', item.id)
    saveInvestments(investments.filter((_, i) => i !== delIdx))
  }

  const TABS = [
    { key: 'stock', label: '股票', count: stockCount },
    { key: 'fund', label: '基金', count: fundCount },
  ]

  return (
    <div className="app-container" style={{ paddingBottom: '100px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* 顶部 Header */}
      {/* 顶部固定区域：Header + Tab，不随页面滚动 */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#f8fafc',
        maxWidth: '480px', margin: '0 auto',
      }}>
      <header style={{
        padding: 'calc(14px + var(--safe-top)) 20px 14px',
        background: 'linear-gradient(135deg,#6366f1 0%,#818cf8 100%)',
        borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px',
        boxShadow: '0 2px 12px rgba(99,102,241,0.2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ margin:0, fontSize:'20px', fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>📈 投资跟踪</h1>
            <p style={{ margin:'4px 0 0', fontSize:'12px', color:'rgba(255,255,255,0.75)' }}>实时行情自动刷新</p>
          </div>
          <button onClick={() => setShowAddInv(true)} style={{
            width:'40px', height:'40px', borderRadius:'50%',
            background:'rgba(255,255,255,0.2)', border:'1.5px solid rgba(255,255,255,0.35)',
            color:'#fff', fontSize:'22px', fontWeight:300, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, lineHeight:1,
          }}>+</button>
        </div>
      </header>

      {/* Tab 切换 */}
      <div style={{ display:'flex', gap:'8px', padding:'14px 16px 8px' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          const dotColor = tab.key === 'stock' ? '#3b82f6' : tab.key === 'fund' ? '#f59e0b' : '#6366f1'
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex:1, padding:'9px 0', borderRadius:'10px',
                border: active ? `1.5px solid ${dotColor}` : '1.5px solid #e2e8f0',
                background: active ? '#fff' : 'transparent',
                color: active ? dotColor : '#94a3b8',
                fontSize:'13px', fontWeight: active ? 700 : 500, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                boxShadow: active ? `0 1px 6px ${dotColor}22` : 'none',
              }}
            >
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: dotColor }} />
              {tab.label}
              <span style={{ fontSize:'10px', opacity:0.7 }}>({tab.count})</span>
            </button>
          )
        })}
      </div>

      </div>
      {/* 固定区域结束 */}

      <div style={{ padding:'200px 16px 0' }}>
        {filteredGroups.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 20px', color:'#cbd5e1' }}>
            <div style={{ fontSize:'40px', marginBottom:'10px' }}>📊</div>
            <p style={{ fontSize:'13px', margin:0 }}>暂无{activeTab === 'stock' ? '股票' : '基金'}投资记录</p>
          </div>
        )}

        {/* 分组列表 */}
        {filteredGroups.map(([key, items]) => {
          items.sort((a, b) => (b.sellDate || '').localeCompare(a.sellDate || ''))
          const latest = items[0]
          const expanded = expandedInv === key
          const at = getAssetType(latest)
          const ts = TYPE_STYLE[at]
          const isSell = latest.type === 'sell'
          const profitColor = (latest.change ?? 0) >= 0 ? '#ef4444' : '#22c55e'
          return (
            <div key={key} style={{
              marginBottom:'10px', borderRadius:'14px',
              background:'#fff',
              boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
              border:`1px solid ${ts.border}`,
              borderLeft:`3px solid ${ts.dot}`,
              overflow:'hidden',
            }}>
              {/* 卡片头部 */}
              <div onClick={() => setExpandedInv(expanded ? null : key)} style={{ padding:'12px 14px', cursor:'pointer' }}>
                {/* 第一行：类型标签 + 买卖标签 + 名称 + 代码 */}
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
                  <span style={{
                    fontSize:'10px', padding:'2px 8px', borderRadius:'5px',
                    background: ts.bg, color: ts.color, fontWeight:700, flexShrink:0,
                    border:`1px solid ${ts.border}`, letterSpacing:'0.3px',
                  }}>{ts.label}</span>
                  <span style={{
                    fontSize:'12px', padding:'3px 10px', borderRadius:'6px', fontWeight:700, flexShrink:0,
                    background: isSell ? '#fef2f2' : '#f0fdf4',
                    color: isSell ? '#dc2626' : '#16a34a',
                  }}>{isSell ? '卖出' : '买入'}</span>
                  <span style={{
                    fontSize:'14px', fontWeight:700, color:'#1e293b', flex:1, minWidth:0,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>{latest.name}</span>
                  <span style={{ fontSize:'11px', color:'#94a3b8', flexShrink:0, fontFamily:'monospace' }}>{latest.code}</span>
                </div>

                {/* 第二行：价格 */}
                <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'8px' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'1px' }}>{isSell ? '卖出价' : '买入价'}</div>
                    <div style={{ fontSize:'20px', fontWeight:800, color:'#1e293b', letterSpacing:'-0.5px', lineHeight:1 }}>
                      {latest.sellPrice}
                    </div>
                  </div>
                  {latest.currentPrice != null && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'1px' }}>当前价 / 涨跌幅</div>
                      <div style={{ display:'flex', alignItems:'baseline', gap:'5px' }}>
                        <span style={{ fontSize:'15px', fontWeight:700, color:'#475569' }}>{latest.currentPrice}</span>
                        <span style={{
                          fontSize:'13px', fontWeight:800, color:'#fff',
                          background: (latest.change ?? 0) >= 0 ? '#ef4444' : '#22c55e',
                          padding:'3px 9px', borderRadius:'7px', flexShrink:0,
                          letterSpacing:'0.3px',
                        }}>
                          {latest.change != null ? `${(latest.change >= 0 ? '↑ +' : '↓ ')}${latest.change.toFixed(2)}%` : '--'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 第三行：明细 */}
                <div style={{
                  display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap',
                  paddingTop:'8px', borderTop:'1px dashed #f1f5f9',
                  fontSize:'11px', color:'#64748b',
                }}>
                  {latest.shares > 0 && <span>份额 <b style={{ color: ts.color, fontWeight:700 }}>{latest.shares}</b></span>}
                  {latest.amount > 0 && <span>金额 <b style={{ color:'#059669', fontWeight:700 }}>¥{latest.amount.toFixed(2)}</b></span>}
                  {latest.sellDate && <span style={{ color:'#94a3b8' }}>📅 {latest.sellDate}</span>}
                  <span style={{
                    marginLeft:'auto', fontSize:'10px', color:'#94a3b8', fontWeight:600,
                    background:'#f8fafc', padding:'2px 8px', borderRadius:'6px',
                  }}>{items.length} 条 {expanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* 展开历史记录 */}
              {expanded && (
                <div style={{
                  borderTop:'1px solid #f1f5f9',
                  padding:'8px 14px 12px',
                  background:'#f8fafc',
                }}>
                  <div style={{ fontSize:'10px', fontWeight:700, color:'#64748b', marginBottom:'6px', letterSpacing:'0.3px' }}>
                    📋 历史记录
                  </div>
                  {items.map((inv, i) => {
                    const iat = getAssetType(inv)
                    const irs = TYPE_STYLE[iat]
                    return (
                      <div key={i} style={{
                        display:'flex', alignItems:'center', gap:'6px',
                        padding:'7px 8px', borderRadius:'8px',
                        background: i % 2 === 0 ? '#fff' : 'transparent',
                        borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}>
                        <span style={{
                            fontSize:'9px', padding:'1px 5px', borderRadius:'4px',
                            background: irs.bg, color: irs.color, fontWeight:700,
                            border:`1px solid ${irs.border}`, flexShrink:0,
                          }}
                        >{irs.label}</span>
                        <span style={{ flex:1, fontSize:'13px', color:'#1e293b', fontWeight:700 }}>{inv.sellPrice}</span>
                        {inv.shares > 0 && <span style={{ fontSize:'11px', color:'#64748b' }}>{inv.shares}份</span>}
                        {inv.amount > 0 && <span style={{ fontSize:'11px', color:'#059669', fontWeight:600 }}>¥{inv.amount.toFixed(2)}</span>}
                        {inv.sellDate && <span style={{ fontSize:'11px', color:'#94a3b8' }}>{inv.sellDate}</span>}
                        <button
                          onClick={(e) => { e.stopPropagation(); delItem(inv._idx) }}
                          style={{
                            background:'#fef2f2', border:'none', color:'#ef4444',
                            fontSize:'13px', cursor:'pointer', width:'22px', height:'22px',
                            borderRadius:'5px', lineHeight:1, flexShrink:0,
                          }}
                        >×</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 添加表单弹窗 */}
      <Modal open={showAddInv} onClose={() => setShowAddInv(false)} title="📝 添加投资记录" center>
        <div style={{ boxSizing:'border-box' }}>
          {/* 资产类型选择 */}
          <div style={{ fontSize:'12px', fontWeight:600, color:'#475569', marginBottom:'6px' }}>资产类型</div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
            <button type='button' onClick={() => setInvAssetType('stock')} style={{
              flex:1, padding:'10px 0', borderRadius:'10px',
              border: invAssetType==='stock' ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
              background: invAssetType==='stock' ? '#eff6ff' : '#fff',
              color: invAssetType==='stock' ? '#2563eb' : '#94a3b8',
              fontSize:'13px', fontWeight:700, cursor:'pointer',
            }}>📈 股票</button>
            <button type='button' onClick={() => setInvAssetType('fund')} style={{
              flex:1, padding:'10px 0', borderRadius:'10px',
              border: invAssetType==='fund' ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
              background: invAssetType==='fund' ? '#fffbeb' : '#fff',
              color: invAssetType==='fund' ? '#b45309' : '#94a3b8',
              fontSize:'13px', fontWeight:700, cursor:'pointer',
            }}>📊 基金</button>
          </div>

          <input value={invCode} onChange={e => setInvCode(e.target.value)} placeholder={invAssetType==='fund' ? '基金代码 如 110011' : '股票代码 如 600519'} style={{
            width:'100%', boxSizing:'border-box', padding:'11px 12px', borderRadius:'10px',
            border:'1.5px solid #e2e8f0', fontSize:'14px', outline:'none',
            marginBottom:'10px', minWidth:0, background:'#f8fafc',
          }} />

          {/* 买卖方向 */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
            <button type='button' onClick={() => setInvType('buy')} style={{
              flex:1, padding:'10px 0', borderRadius:'10px',
              border: invType==='buy' ? '2px solid #22c55e' : '1.5px solid #e2e8f0',
              background: invType==='buy' ? '#f0fdf4' : '#fff',
              color: invType==='buy' ? '#16a34a' : '#94a3b8',
              fontSize:'13px', fontWeight:700, cursor:'pointer',
            }}>📈 买入</button>
            <button type='button' onClick={() => setInvType('sell')} style={{
              flex:1, padding:'10px 0', borderRadius:'10px',
              border: invType==='sell' ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
              background: invType==='sell' ? '#fef2f2' : '#fff',
              color: invType==='sell' ? '#dc2626' : '#94a3b8',
              fontSize:'13px', fontWeight:700, cursor:'pointer',
            }}>📉 卖出</button>
          </div>

          <button onClick={fetchAndAdd} style={{
            width:'100%', boxSizing:'border-box', padding:'11px', borderRadius:'10px',
            border:'none', background:'linear-gradient(135deg,#6366f1,#818cf8)',
            color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer', marginBottom:'10px',
          }}>🔍 获取行情</button>

          {invName && (
            <div style={{ margin:'0 0 10px', padding:'8px 10px', borderRadius:'8px', background:'#f8fafc', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:'13px', color:'#1e293b', fontWeight:700 }}>{invName}</div>
              <div style={{ fontSize:'12px', color:'#64748b', marginTop:'2px' }}>当前价: <b style={{ color:'#6366f1' }}>{invCurrentPrice}</b></div>
            </div>
          )}

          <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
            <input value={invSellPrice} onChange={e => setInvSellPrice(e.target.value)} placeholder={invType==='buy' ? '买入价' : '卖出价'} type='number' step='any' style={{
              flex:1, minWidth:0, boxSizing:'border-box', padding:'10px', borderRadius:'10px',
              border:'1.5px solid #e2e8f0', fontSize:'14px', outline:'none', textAlign:'center', background:'#f8fafc',
            }} />
            <input value={invShares} onChange={e => setInvShares(e.target.value)} placeholder='份额' type='number' step='any' style={{
              flex:1, minWidth:0, boxSizing:'border-box', padding:'10px', borderRadius:'10px',
              border:'1.5px solid #e2e8f0', fontSize:'14px', outline:'none', textAlign:'center', background:'#f8fafc',
            }} />
          </div>
          {invSellPrice && invShares && (
            <p style={{ margin:'0 0 10px', fontSize:'13px', color:'#059669', fontWeight:700, textAlign:'center' }}>
              💰 金额: ¥{(parseFloat(invSellPrice) * parseFloat(invShares)).toFixed(2)}
            </p>
          )}
          <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
            <input value={invSellDate} onChange={e => setInvSellDate(e.target.value)} type='date' style={{
              flex:1, minWidth:0, boxSizing:'border-box', padding:'10px', borderRadius:'10px',
              border:'1.5px solid #e2e8f0', fontSize:'14px', outline:'none', textAlign:'center', background:'#f8fafc',
            }} />
          </div>
          {invCurrentPrice && (
            <button type='button' onClick={fetchHistoricalPrice} style={{
              width:'100%', boxSizing:'border-box', padding:'8px', marginBottom:'14px', borderRadius:'10px',
              border:'1.5px dashed #6366f1', background:'transparent',
              color:'#6366f1', fontSize:'12px', fontWeight:600, cursor:'pointer',
            }}>📅 用 {invSellDate || '选定日'} 的价格填入</button>
          )}

          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => { setShowAddInv(false); setInvType('buy'); setInvAssetType('stock') }} style={{
              flex:1, padding:'11px', borderRadius:'10px',
              border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b',
              fontSize:'14px', fontWeight:600, cursor:'pointer',
            }}>取消</button>
            <button onClick={confirmAddInv} style={{
              flex:1, padding:'11px', borderRadius:'10px',
              border:'none', background:'linear-gradient(135deg,#6366f1,#818cf8)',
              color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer',
            }}>保存</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
