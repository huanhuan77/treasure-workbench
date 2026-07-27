import { useState } from 'react'
import { useStore } from '../store'
import { useNavigate } from 'react-router-dom'

const INV_STORAGE_KEY = 'blogger_investments_v1'
// 从独立 key 读取投资数据
function loadInvestments() {
  try {
    const raw = localStorage.getItem(INV_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch(e) {}
  return null
}

const ACCOUNT_OPTIONS = ['支付宝1','支付宝2','博时','同花顺','华泰','东方','卡','中信','工行','微信','其他']

function formatNum(n) {
  if (!n && n !== 0) return ''
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toLocaleString()
}
function toNum(v) { const n = parseInt(String(v).replace(/,/g,'')); return isNaN(n) ? 0 : n }

export function SavingsPage() {
  const { getSavings, updateSavings, setSavings } = useStore()
  const sd = getSavings() || {}
  const records = sd.records || {}
  const navigate = useNavigate()
  const [editMonth, setEditMonth] = useState(null)
  const [expandedMonth, setExpandedMonth] = useState(null)
  const [editAccounts, setEditAccounts] = useState(null)
  const [showInvest, setShowInvest] = useState(false)
  const [showAddInv, setShowAddInv] = useState(false)
  const [activeTab, setActiveTab] = useState('save')
  const [expandedInv, setExpandedInv] = useState(null)  // 展开查看历史记录的分组key
  const [year, setYear] = useState('2026')  // 攒钱计划年份
  // 根据年份生成月份键
  const MONTH_KEYS = Array.from({length:12}, (_,i) => year + '-' + String(i+1).padStart(2,'0'))
  const MONTH_LABELS = Object.fromEntries(MONTH_KEYS.map(k => [k, parseInt(k.split('-')[1]) + '月']))
  const [invCode, setInvCode] = useState('')
  const [invName, setInvName] = useState('')
  const [invCurrentPrice, setInvCurrentPrice] = useState(null)
  const [invSellPrice, setInvSellPrice] = useState('')
  const [invSellDate, setInvSellDate] = useState('')
  const [invType, setInvType] = useState('buy')  // 'buy' 买入 | 'sell' 卖出
  const [investments, setInvestments] = useState(() => {
    // 直接从独立 key 读取，完全绕过 store 的复杂合并逻辑
    const saved = loadInvestments()
    console.log('[投资] 初始化, 独立key数据:', saved ? saved.length + '条' : '无')
    // 调试：读一下原始值
    try {
      const raw = localStorage.getItem('blogger_investments_v1')
      console.log('[投资] 原始key内容:', raw ? raw.slice(0,200) : '空')
    } catch(e) { console.warn('[投资] 读原始key失败:', e) }
    return saved || []
  })
  const saveInvestments = (list) => {
    setInvestments(list)
    setSavings({ investments: list })  // 同步到 store
    try {
      localStorage.setItem(INV_STORAGE_KEY, JSON.stringify(list))
      console.log('[投资] 已保存', list.length, '条到独立key')
    } catch(e) { console.warn('[投资] 保存失败:', e) }
  }
  const fetchAndAdd = async () => {
    if (!invCode.trim()) return
    try {
      const { StockSDK } = await import('stock-sdk')
      const sdk = new StockSDK()
      const code = invCode.trim().replace(/\D/g, '')
      const isFund = code.length <= 6
      // 获取当前价
      if (isFund) {
        const q = await sdk.quotes.fund([code])
        if (q?.[0]) { setInvName(q[0].name); setInvCurrentPrice(q[0].nav) }
        // 有卖出日则查历史净值
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
        // 基金：调用天天基金历史净值 JSONP
        const cb = 'fund_cb_' + Date.now()
        const jsonpUrl = 'https://api.fund.eastmoney.com/f10/lsjz?callback=' + cb + '&fundCode=' + code + '&pageIndex=1&pageSize=120'
        await new Promise((resolve, reject) => {
          window[cb] = (d) => {
            const list = d?.Data?.LSJZList || []
            // 兼容多种日期格式：'2026-07-09' / '2026-07-09 ...' / '2026/07/09'
            const norm = (s) => String(s || '').slice(0, 10).replace(/[\/]/g, '-')
            const target = norm(invSellDate)
            let found = list.find(x => norm(x.FSRQ) === target)
            // 没找到且目标日期在最近 30 天内：找距离目标日期最近的工作日净值（向前）
            if (!found) {
              const sorted = list.filter(x => norm(x.FSRQ) <= target).sort((a, b) => norm(b.FSRQ).localeCompare(norm(a.FSRQ)))
              if (sorted.length > 0) {
                const targetTs = new Date(target).getTime()
                const diffs = sorted.map(x => Math.abs(new Date(norm(x.FSRQ)).getTime() - targetTs)).filter(d => d <= 7 * 86400000)
                if (diffs.length > 0 && diffs[0] <= 7 * 86400000) found = sorted[diffs.indexOf(diffs[0])]
              }
            }
            console.log('[基金历史] 查询', invSellDate, '共', list.length, '条，找到:', found)
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
        // 股票：调用 sdk.kline.cn 获取历史 K 线
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
    // 先清空输入，再保存（确保表单清空）
    const newItem = { code:normCode, name:invName, sellPrice:sp, currentPrice:cp, sellDate:invSellDate, type:invType, change }
    setInvCode('')
    setInvName('')
    setInvCurrentPrice(null)
    setInvSellPrice('')
    setInvSellDate('')
    setInvType('buy')
    setTimeout(() => saveInvestments([...investments, newItem]), 0)
  }

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
  const addAccount = () => {
    const label = prompt('输入账户名称：')
    if (label && label.trim()) setEditAccounts(prev => ({ ...prev, [label.trim()]: 0 }))
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

      {/* Tab 切换 */}
      <div style={{ display:'flex', margin:'12px 16px 0', borderRadius:'12px', border:'1px solid rgba(251,191,36,0.2)', overflow:'hidden', boxSizing:'border-box' }}>
        <button onClick={() => setActiveTab('save')} style={{ flex:1, minWidth:0, padding:'10px 0', fontSize:'14px', fontWeight:600, border:'none', cursor:'pointer', background: activeTab==='save' ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : 'transparent', color: activeTab==='save' ? '#78350f' : 'var(--gray-300)' }}>💰 攒钱计划</button>
        <button onClick={() => setActiveTab('invest')} style={{ flex:1, minWidth:0, padding:'10px 0', fontSize:'14px', fontWeight:600, border:'none', cursor:'pointer', background: activeTab==='invest' ? 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' : 'transparent', color: activeTab==='invest' ? '#4338ca' : 'var(--gray-300)' }}>📈 投资跟踪</button>
      </div>

      {activeTab === 'save' && (<>
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

        </>)}
        {activeTab === 'invest' && (
        <div style={{ marginTop:'24px', padding:'0 16px' }}>
          <h4 style={{ margin:'0 0 10px', fontSize:'14px', fontWeight:600, color:'#78350f' }}>📈 投资跟踪</h4>
            {investments.length === 0 && <p style={{ fontSize:'13px', color:'var(--gray-300)', margin:'0 0 10px' }}>暂无记录
              <span style={{ fontSize:'10px', color:'#aaa', display:'block', marginTop:'4px' }}>
                (调试: 独立key={(()=>{try{return localStorage.getItem('blogger_investments_v1')?'有数据':'空'}catch(e){return '读取出错'}})()})
              </span>
            </p>}
            {/* 按代码+买卖类型分组，只显示最新一条，点击展开查看历史 */}
            {(() => {
                            const groups = {}
              investments.forEach((inv, idx) => {
                const key = (inv.code || '').trim() + '_' + (inv.type || 'buy')
                if (!groups[key]) groups[key] = []
                groups[key].push({ ...inv, _idx: idx })
              })
              // 每组按日期排序（最新在前），每组取第一条作为摘要
              return Object.entries(groups).map(([key, items]) => {
                items.sort((a, b) => (b.sellDate || '').localeCompare(a.sellDate || ''))
                const latest = items[0]
                const expanded = expandedInv === key
                const delItem = (delIdx) => saveInvestments(investments.filter((_, i) => i !== delIdx))
                return (
                  <div key={key} style={{ marginBottom:'8px', borderRadius:'12px', border:'1px solid rgba(99,102,241,0.2)', background:'rgba(238,242,255,0.4)', overflow:'hidden' }}>
                    {/* 顶部摘要卡片 */}
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
                        <span style={{ fontSize:'13px' }}>当前: <b style={{ color:'#4f46e5', fontSize:'15px' }}>{latest.currentPrice ?? '--'}</b></span>
                        <span style={{ color: (latest.change ?? 0) >= 0 ? '#dc2626' : '#059669', fontWeight:600 }}>
                          {(latest.change ?? 0) >= 0 ? '📈' : '📉'} {latest.change != null ? (latest.change >= 0 ? '+' : '') + latest.change.toFixed(2) + '%' : '--'}
                        </span>
                      </div>
                      {latest.sellDate && <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'4px' }}>📅 {latest.type==='sell' ? '卖出日' : '买入日'}: {latest.sellDate}</div>}
                    </div>
                    {/* 展开历史记录 */}
                    {expanded && (
                      <div style={{ borderTop:'1px solid rgba(99,102,241,0.1)', padding:'6px 12px 10px' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color:'#6366f1', marginBottom:'6px' }}>📋 历史记录（按日期倒序）</div>
                        {items.map((inv, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 0', borderBottom: i<items.length-1 ? '1px solid rgba(99,102,241,0.06)' : 'none' }}>
                            <span style={{ fontSize:'11px', color:'#6366f1', fontWeight:600, minWidth:'20px' }}>#{items.length - i}</span>
                            <span style={{ flex:1, fontSize:'13px', color:'#1f2937', fontWeight:700 }}>{inv.sellPrice}</span>
                            {inv.sellDate && <span style={{ fontSize:'11px', color:'#6b7280' }}>{inv.sellDate}</span>}
                            <button onClick={(e) => { e.stopPropagation(); delItem(inv._idx) }} style={{ background:'none', border:'none', color:'#e11d48', fontSize:'14px', cursor:'pointer', padding:'2px 4px', lineHeight:1 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
            {!showAddInv ? (
              <button onClick={() => setShowAddInv(true)} style={{ marginTop:'4px', padding:'8px 14px', borderRadius:'10px', border:'1.5px dashed #6366f1', background:'transparent', color:'#4338ca', fontSize:'13px', cursor:'pointer', width:'100%' }}>+ 添加</button>
            ) : (
              <div style={{ marginTop:'8px', padding:'12px', borderRadius:'12px', border:'1.5px solid #6366f1', background:'rgba(238,242,255,0.3)', boxSizing:'border-box' }}>
                <input value={invCode} onChange={e => setInvCode(e.target.value)} placeholder='代码 如600519' style={{ width:'100%', boxSizing:'border-box', padding:'11px 12px', borderRadius:'8px', border:'1.5px solid #c7d2fe', fontSize:'14px', outline:'none', marginBottom:'10px', minWidth:0 }} />
                {/* 买入/卖出 切换 */}
                <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
                  <button type='button' onClick={() => setInvType('buy')} style={{ flex:1, minWidth:0, padding:'11px 0', borderRadius:'8px', border: invType==='buy' ? '1.5px solid #10b981' : '1px solid #c7d2fe', background: invType==='buy' ? '#10b981' : '#fff', color: invType==='buy' ? '#fff' : '#666', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>买入</button>
                  <button type='button' onClick={() => setInvType('sell')} style={{ flex:1, minWidth:0, padding:'11px 0', borderRadius:'8px', border: invType==='sell' ? '1.5px solid #e11d48' : '1px solid #c7d2fe', background: invType==='sell' ? '#e11d48' : '#fff', color: invType==='sell' ? '#fff' : '#666', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>卖出</button>
                </div>
                <button onClick={fetchAndAdd} style={{ width:'100%', boxSizing:'border-box', padding:'12px', borderRadius:'8px', border:'none', background:'#6366f1', color:'#fff', fontSize:'14px', fontWeight:600, cursor:'pointer', marginBottom:'10px' }}>获取实时行情</button>
                {invName && <p style={{ margin:'0 0 10px', fontSize:'14px', color:'#4338ca', fontWeight:700 }}>📌 {invName}  当前: {invCurrentPrice}</p>}
                <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
                  <input value={invSellPrice} onChange={e => setInvSellPrice(e.target.value)} placeholder={invType==='buy' ? '买入价' : '卖出价'} type='number' style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'11px 10px', borderRadius:'8px', border:'1.5px solid #c7d2fe', fontSize:'14px', outline:'none', textAlign:'center' }} />
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
        )}

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
