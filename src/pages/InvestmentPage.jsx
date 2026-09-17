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

// 判断基金：代码纯数字且长度 <= 6
function isFundCode(code) {
  if (!code) return false
  const c = String(code).replace(/\D/g, '')
  return c.length > 0 && c.length <= 6 && /^\d+$/.test(c)
}

function typeTag(code) {
  return isFundCode(code)
    ? { label: '基金', bg: '#ede9fe', color: '#6d28d9' }
    : { label: '股票', bg: '#fef3c7', color: '#92400e' }
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

  // 自动刷新行情
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
          } catch(e) {}
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
    setInvCode(''); setInvName(''); setInvCurrentPrice(null); setInvSellPrice(''); setInvSellDate(''); setInvType('buy'); setInvShares('')
    setTimeout(() => saveInvestments([...investments, newItem]), 0)
  }

  // 按代码+买卖类型分组
  const groups = {}
  investments.forEach((inv, idx) => {
    const key = (inv.code || '').trim() + '_' + (inv.type || 'buy')
    if (!groups[key]) groups[key] = []
    groups[key].push({ ...inv, _idx: idx })
  })

  const delItem = (delIdx) => {
    const item = investments[delIdx]
    if (item && item.id) recordDelete('blogger_investments_v1', item.id)
    saveInvestments(investments.filter((_, i) => i !== delIdx))
  }

  return (
    <div className="app-container" style={{ paddingBottom: '100px', background: 'linear-gradient(180deg,#f0f9ff 0%,#f8fafc 50%,#ffffff 100%)', minHeight: '100vh' }}>
      {/* 顶部渐变 Header */}
      <header style={{
        padding: 'calc(20px + var(--safe-top)) 20px 24px',
        background: 'linear-gradient(135deg,#7c3aed 0%,#8b5cf6 50%,#a855f7 100%)',
        borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px',
        boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ margin:0, fontSize:'22px', fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>📈 投资跟踪</h1>
            <p style={{ margin:'6px 0 0', fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>实时行情自动刷新 · 股票基金一目了然</p>
          </div>
          <button onClick={() => setShowAddInv(true)} style={{
            width:'44px', height:'44px', borderRadius:'50%',
            background:'rgba(255,255,255,0.2)', border:'1.5px solid rgba(255,255,255,0.4)',
            color:'#fff', fontSize:'24px', fontWeight:300, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, lineHeight:1, backdropFilter:'blur(8px)',
          }}>+</button>
        </div>
      </header>

      <div style={{ marginTop:'16px', padding:'0 16px' }}>
        {investments.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#a78bfa' }}>
            <div style={{ fontSize:'44px', marginBottom:'12px' }}>📊</div>
            <p style={{ fontSize:'14px', margin:0 }}>暂无投资记录，点下方「添加」开始记录</p>
          </div>
        )}

        {/* 分组列表 */}
        {Object.entries(groups).map(([key, items]) => {
          items.sort((a, b) => (b.sellDate || '').localeCompare(a.sellDate || ''))
          const latest = items[0]
          const expanded = expandedInv === key
          const tag = typeTag(latest.code)
          const isSell = latest.type === 'sell'
          const profitColor = (latest.change ?? 0) >= 0 ? '#ef4444' : '#22c55e'
          return (
            <div key={key} style={{
              marginBottom:'10px', borderRadius:'16px',
              background:'linear-gradient(135deg,#faf5ff 0%,#f5f3ff 100%)',
              boxShadow:'0 2px 12px rgba(124,58,237,0.08)',
              border:'1px solid #ede9fe',
              overflow:'hidden',
            }}>
              {/* 卡片头部 - 可点击展开 */}
              <div onClick={() => setExpandedInv(expanded ? null : key)} style={{ padding:'14px 16px', cursor:'pointer' }}>
                {/* 第一行：标签 + 名称 + 代码 */}
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                  <span style={{
                    fontSize:'10px', padding:'3px 8px', borderRadius:'6px',
                    background: tag.bg, color: tag.color, fontWeight:700, flexShrink:0,
                    letterSpacing:'0.3px',
                  }}>{tag.label}</span>
                  <span style={{
                    fontSize:'10px', padding:'3px 8px', borderRadius:'6px', fontWeight:700, flexShrink:0,
                    background: isSell ? '#fef2f2' : '#f0fdf4',
                    color: isSell ? '#dc2626' : '#16a34a',
                  }}>{isSell ? '卖出' : '买入'}</span>
                  <span style={{
                    fontSize:'15px', fontWeight:700, color:'#4c1d95', flex:1, minWidth:0,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>{latest.name}</span>
                  <span style={{ fontSize:'11px', color:'#94a3b8', flexShrink:0, fontFamily:'monospace' }}>{latest.code}</span>
                </div>

                {/* 第二行：核心数据 - 价格大字体 */}
                <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'2px' }}>{isSell ? '卖出价' : '买入价'}</div>
                    <div style={{ fontSize:'22px', fontWeight:800, color:'#5b21b6', letterSpacing:'-0.5px', lineHeight:1 }}>
                      {latest.sellPrice}
                    </div>
                  </div>
                  {latest.currentPrice != null && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'2px' }}>当前价 / 涨跌幅</div>
                      <div style={{ display:'flex', alignItems:'baseline', gap:'6px' }}>
                        <span style={{ fontSize:'16px', fontWeight:700, color:'#6d28d9' }}>{latest.currentPrice}</span>
                        <span style={{ fontSize:'13px', fontWeight:700, color: profitColor }}>
                          {latest.change != null ? (latest.change >= 0 ? '+' : '') + latest.change.toFixed(2) + '%' : '--'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 第三行：份额 + 金额 + 日期 + 展开指示 */}
                <div style={{
                  display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap',
                  paddingTop:'10px', borderTop:'1px dashed #ddd6fe',
                  fontSize:'12px', color:'#64748b',
                }}>
                  {latest.shares > 0 && (
                    <span>份额 <b style={{ color:'#8b5cf6', fontWeight:700 }}>{latest.shares}</b></span>
                  )}
                  {latest.amount > 0 && (
                    <span>金额 <b style={{ color:'#14b8a6', fontWeight:700 }}>¥{latest.amount.toFixed(2)}</b></span>
                  )}
                  {latest.sellDate && (
                    <span style={{ color:'#94a3b8' }}>📅 {latest.sellDate}</span>
                  )}
                  <span style={{
                    marginLeft:'auto', fontSize:'11px', color:'#8b5cf6', fontWeight:600,
                    background:'#f5f3ff', padding:'3px 10px', borderRadius:'8px',
                  }}>
                    {items.length} 条记录 {expanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* 展开历史记录 */}
              {expanded && (
                <div style={{
                  borderTop:'1px solid #ede9fe',
                  padding:'10px 16px 14px',
                  background:'#f5f3ff',
                }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#8b5cf6', marginBottom:'8px', letterSpacing:'0.3px' }}>
                    📋 历史记录（按日期倒序）
                  </div>
                  {items.map((inv, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:'8px',
                      padding:'8px 10px', borderRadius:'8px',
                      background: i % 2 === 0 ? '#faf5ff' : 'transparent',
                      borderBottom: i < items.length - 1 ? '1px solid #ede9fe' : 'none',
                    }}>
                      <span style={{
                        fontSize:'10px', color:'#fff', fontWeight:700,
                        background:'linear-gradient(135deg,#7c3aed,#8b5cf6)', borderRadius:'4px',
                        minWidth:'22px', textAlign:'center', padding:'2px 0', flexShrink:0,
                      }}>#{items.length - i}</span>
                      <span style={{ flex:1, fontSize:'14px', color:'#4c1d95', fontWeight:700 }}>{inv.sellPrice}</span>
                      {inv.shares > 0 && <span style={{ fontSize:'11px', color:'#8b5cf6', fontWeight:600 }}>{inv.shares}份</span>}
                      {inv.amount > 0 && <span style={{ fontSize:'11px', color:'#14b8a6', fontWeight:600 }}>¥{inv.amount.toFixed(2)}</span>}
                      {inv.sellDate && <span style={{ fontSize:'11px', color:'#94a3b8' }}>{inv.sellDate}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); delItem(inv._idx) }}
                        style={{
                          background:'#fef2f2', border:'none', color:'#ef4444',
                          fontSize:'14px', cursor:'pointer', width:'24px', height:'24px',
                          borderRadius:'6px', lineHeight:1, flexShrink:0,
                        }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* 添加表单弹窗 */}
        <Modal open={showAddInv} onClose={() => setShowAddInv(false)} title="📝 添加投资记录" center>
          <div style={{ boxSizing:'border-box' }}>
            <input value={invCode} onChange={e => setInvCode(e.target.value)} placeholder='代码 如 600519（股票）/ 110011（基金）' style={{
              width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:'10px',
              border:'1.5px solid #ddd6fe', fontSize:'14px', outline:'none',
              marginBottom:'12px', minWidth:0, background:'#f8fafc',
            }} />
            <div style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
              <button type='button' onClick={() => setInvType('buy')} style={{
                flex:1, minWidth:0, padding:'12px 0', borderRadius:'10px',
                border: invType==='buy' ? '2px solid #22c55e' : '1.5px solid #e2e8f0',
                background: invType==='buy' ? '#22c55e' : '#fff',
                color: invType==='buy' ? '#fff' : '#64748b',
                fontSize:'14px', fontWeight:700, cursor:'pointer',
              }}>📈 买入</button>
              <button type='button' onClick={() => setInvType('sell')} style={{
                flex:1, minWidth:0, padding:'12px 0', borderRadius:'10px',
                border: invType==='sell' ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                background: invType==='sell' ? '#ef4444' : '#fff',
                color: invType==='sell' ? '#fff' : '#64748b',
                fontSize:'14px', fontWeight:700, cursor:'pointer',
              }}>📉 卖出</button>
            </div>
            <button onClick={fetchAndAdd} style={{
              width:'100%', boxSizing:'border-box', padding:'13px', borderRadius:'10px',
              border:'none', background:'linear-gradient(135deg,#7c3aed,#8b5cf6)',
              color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', marginBottom:'12px',
              boxShadow:'0 2px 8px rgba(124,58,237,0.3)',
            }}>🔍 获取实时行情</button>
            {invName && (
              <div style={{
                margin:'0 0 12px', padding:'10px 12px', borderRadius:'10px',
                background:'#f5f3ff', border:'1px solid #ddd6fe',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                  <span style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'4px', background: typeTag(invCode).bg, color: typeTag(invCode).color, fontWeight:700 }}>{typeTag(invCode).label}</span>
                  <span style={{ fontSize:'14px', color:'#4c1d95', fontWeight:700 }}>{invName}</span>
                </div>
                <div style={{ fontSize:'12px', color:'#64748b' }}>当前价: <b style={{ color:'#8b5cf6' }}>{invCurrentPrice}</b></div>
              </div>
            )}
            <div style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
              <input value={invSellPrice} onChange={e => setInvSellPrice(e.target.value)} placeholder={invType==='buy' ? '买入价' : '卖出价'} type='number' step='any' style={{
                flex:1, minWidth:0, boxSizing:'border-box', padding:'12px 10px', borderRadius:'10px',
                border:'1.5px solid #ddd6fe', fontSize:'14px', outline:'none', textAlign:'center',
                background:'#f8fafc',
              }} />
              <input value={invShares} onChange={e => setInvShares(e.target.value)} placeholder='份额' type='number' step='any' style={{
                flex:1, minWidth:0, boxSizing:'border-box', padding:'12px 10px', borderRadius:'10px',
                border:'1.5px solid #ddd6fe', fontSize:'14px', outline:'none', textAlign:'center',
                background:'#f8fafc',
              }} />
            </div>
            {invSellPrice && invShares && (
              <p style={{ margin:'0 0 12px', fontSize:'14px', color:'#14b8a6', fontWeight:700, textAlign:'center' }}>
                💰 金额: ¥{(parseFloat(invSellPrice) * parseFloat(invShares)).toFixed(2)}
              </p>
            )}
            <div style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
              <input value={invSellDate} onChange={e => setInvSellDate(e.target.value)} type='date' style={{
                flex:1, minWidth:0, boxSizing:'border-box', padding:'12px 10px', borderRadius:'10px',
                border:'1.5px solid #ddd6fe', fontSize:'14px', outline:'none', textAlign:'center',
                color:'#4c1d95', background:'#f8fafc',
              }} />
            </div>
            {invCurrentPrice && (
              <button type='button' onClick={fetchHistoricalPrice} style={{
                width:'100%', boxSizing:'border-box', padding:'10px', marginBottom:'12px', borderRadius:'10px',
                border:'1.5px dashed #8b5cf6', background:'transparent',
                color:'#6d28d9', fontSize:'13px', fontWeight:600, cursor:'pointer',
              }}>📅 用 {invSellDate || '选定日'} 的价格填入</button>
            )}
            <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
              <button onClick={() => { setShowAddInv(false); setInvType('buy') }} style={{
                flex:1, padding:'12px', borderRadius:'10px',
                border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b',
                fontSize:'14px', fontWeight:600, cursor:'pointer',
              }}>取消</button>
              <button onClick={confirmAddInv} style={{
                flex:1, padding:'12px', borderRadius:'10px',
                border:'none', background:'linear-gradient(135deg,#7c3aed,#8b5cf6)',
                color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer',
                boxShadow:'0 2px 8px rgba(124,58,237,0.3)',
              }}>保存</button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
