import { useState, useEffect } from 'react'
import { glassStyle, inputStyle } from '../components/Modal'
import { useToast } from '../components/Toast'

const STORAGE_KEY = 'blogger_investments_v1'

function loadInvestments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveInvestments(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '0.00'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestmentPage() {
  const { show } = useToast()
  const [investments, setInvestments] = useState(loadInvestments)
  const [showModal, setShowModal] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('buy')
  const [price, setPrice] = useState('')
  const [shares, setShares] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  // 按代码分组
  const groups = {}
  investments.forEach((inv, idx) => {
    const key = (inv.code || '').trim() + '_' + (inv.type || 'buy')
    if (!groups[key]) groups[key] = []
    groups[key].push({ ...inv, _idx: idx })
  })

  const openAdd = () => {
    setEditIdx(null)
    setCode('')
    setName('')
    setType('buy')
    setPrice('')
    setShares('')
    setDate(new Date().toISOString().slice(0, 10))
    setShowModal(true)
  }

  const openEdit = (idx) => {
    const inv = investments[idx]
    setEditIdx(idx)
    setCode(inv.code || '')
    setName(inv.name || '')
    setType(inv.type || 'buy')
    setPrice(String(inv.sellPrice || ''))
    setShares(String(inv.shares || ''))
    setDate(inv.sellDate || new Date().toISOString().slice(0, 10))
    setShowModal(true)
  }

  const handleSave = () => {
    if (!code.trim()) { show('请输入代码', 'error'); return }
    if (!price) { show('请输入价格', 'error'); return }
    const p = parseFloat(price)
    if (isNaN(p) || p <= 0) { show('请输入有效价格', 'error'); return }
    const s = parseFloat(shares) || 0
    const amount = s * p

    const item = {
      code: code.trim().toUpperCase(),
      name: name.trim() || code.trim().toUpperCase(),
      type,
      sellPrice: p,
      sellDate: date,
      shares: s,
      amount,
      currentPrice: null,
      change: null,
    }

    let newList
    if (editIdx !== null) {
      newList = investments.map((inv, i) => i === editIdx ? { ...inv, ...item } : inv)
      show('已更新', 'success')
    } else {
      newList = [...investments, item]
      show('已添加', 'success')
    }
    setInvestments(newList)
    saveInvestments(newList)
    setShowModal(false)
  }

  const handleDelete = (idx) => {
    if (!confirm('确定删除这条记录？')) return
    const newList = investments.filter((_, i) => i !== idx)
    setInvestments(newList)
    saveInvestments(newList)
    show('已删除', 'success')
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📈 投资跟踪</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>记录股票/基金买入卖出记录</p>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 统计 */}
        <div style={{ ...glassStyle, padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '2px' }}>持有代码</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>{Object.keys(groups).length}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '2px' }}>交易次数</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>{investments.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '2px' }}>买入/卖出</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                {investments.filter(i => i.type === 'buy').length} / {investments.filter(i => i.type === 'sell').length}
              </div>
            </div>
          </div>
        </div>

        {/* 分组列表 */}
        {Object.keys(groups).length === 0 ? (
          <div style={{ ...glassStyle, padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0 }}>还没有记录，点 + 添加</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '80px' }}>
            {Object.entries(groups).map(([key, items]) => {
              items.sort((a, b) => (b.sellDate || '').localeCompare(a.sellDate || ''))
              const latest = items[0]
              return (
                <div key={key} style={{ ...glassStyle, overflow: 'hidden' }}>
                  {/* 摘要 */}
                  <div
                    onClick={() => openEdit(latest._idx)}
                    style={{ padding: '12px 14px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {latest.name}
                        <span style={{ fontSize: '10px', marginLeft: '6px', padding: '2px 6px', borderRadius: '6px',
                          background: latest.type === 'sell' ? '#fee2e2' : '#d1fae5',
                          color: latest.type === 'sell' ? '#e11d48' : '#059669', fontWeight: 700
                        }}>{latest.type === 'sell' ? '卖出' : '买入'}</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '6px' }}>{latest.code}</span>
                      </span>
                      <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>{items.length} 条</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', flexWrap: 'wrap', color: 'var(--text-sub)' }}>
                      <span>价格: <b style={{ color: 'var(--text-main)' }}>{latest.sellPrice}</b></span>
                      {latest.shares ? <span>份额: <b style={{ color: 'var(--text-main)' }}>{latest.shares}</b></span> : null}
                      {latest.amount ? <span>金额: <b style={{ color: 'var(--text-main)' }}>¥{formatMoney(latest.amount)}</b></span> : null}
                    </div>
                    {latest.sellDate && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>
                        📅 {latest.sellDate}
                      </div>
                    )}
                  </div>

                  {/* 历史记录 */}
                  {items.length > 1 && (
                    <div style={{ borderTop: '1px solid rgba(99,102,241,0.08)', padding: '8px 14px 10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>历史记录</div>
                      {items.slice(1).map((inv, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', fontSize: '13px' }}>
                          <span style={{ flex: 1, color: 'var(--text-main)', fontWeight: 600 }}>{inv.sellPrice}</span>
                          {inv.shares ? <span style={{ color: '#7c3aed' }}>{inv.shares}份</span> : null}
                          {inv.amount ? <span style={{ color: '#059669' }}>¥{formatMoney(inv.amount)}</span> : null}
                          <span style={{ color: '#9ca3af' }}>{inv.sellDate}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(inv._idx) }} style={{
                            background: 'none', border: 'none', color: '#e11d48', fontSize: '14px',
                            cursor: 'pointer', padding: '2px 4px',
                          }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* + 浮动按钮 */}
      <button onClick={openAdd} style={{
        position: 'fixed', right: 'max(16px, calc((100vw - 480px) / 2 + 16px))',
        bottom: 'calc(80px + var(--safe-bottom))',
        width: '52px', height: '52px', borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff',
        fontSize: '26px', cursor: 'pointer', zIndex: 40,
        boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.15s',
      }}>+</button>

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(74,44,58,0.25)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            width: '100%', maxWidth: '480px',
            borderRadius: '28px 28px 0 0',
            padding: '24px 22px calc(16px + var(--safe-bottom))',
            animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: '0 -8px 40px rgba(99,102,241,0.15)',
            maxHeight: '85vh', overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-main)' }}>
                {editIdx !== null ? '编辑记录' : '添加记录'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{
                width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                background: 'rgba(252,231,243,0.7)', fontSize: '16px', color: 'var(--text-sub)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>代码</label>
              <input style={inputStyle} placeholder="例如：000001 / 110011" value={code} onChange={e => setCode(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>名称（选填）</label>
              <input style={inputStyle} placeholder="不填则用代码" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>类型</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setType('buy')} style={{
                  flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none',
                  background: type === 'buy' ? 'linear-gradient(135deg,#34d399,#10b981)' : 'rgba(255,255,255,0.5)',
                  color: type === 'buy' ? '#fff' : 'var(--text-sub)',
                }}>🟢 买入</button>
                <button onClick={() => setType('sell')} style={{
                  flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none',
                  background: type === 'sell' ? 'linear-gradient(135deg,#fb7185,#f43f5e)' : 'rgba(255,255,255,0.5)',
                  color: type === 'sell' ? '#fff' : 'var(--text-sub)',
                }}>🔴 卖出</button>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>价格</label>
              <input type="number" step="any" style={inputStyle} placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>份额（选填）</label>
              <input type="number" step="any" style={inputStyle} placeholder="0" value={shares} onChange={e => setShares(e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>日期</label>
              <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {editIdx !== null && (
                <button onClick={() => { handleDelete(editIdx); setShowModal(false) }} style={{
                  padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.04)', color: '#ef4444', fontSize: '15px',
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>删除</button>
              )}
              <button onClick={handleSave} style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
                background: code.trim() && price ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#e5e7eb',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: code.trim() && price ? 'pointer' : 'not-allowed',
                boxShadow: code.trim() && price ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
              }}>{editIdx !== null ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
