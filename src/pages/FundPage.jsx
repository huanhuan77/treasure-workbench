import { useState, useEffect } from 'react'
import { glassStyle, inputStyle } from '../components/Modal'
import { useToast } from '../components/Toast'

const STORAGE_KEY = 'blogger_funds_v1'

function loadFunds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveFunds(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '0.00'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function FundPage() {
  const { show } = useToast()
  const [funds, setFunds] = useState(loadFunds)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [remark, setRemark] = useState('')

  // 弹窗锁定滚动
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  const totalAmount = funds.reduce((s, f) => s + (f.amount || 0), 0)
  const totalValue = funds.reduce((s, f) => s + (f.currentValue || 0), 0)
  const totalProfit = totalValue - totalAmount
  const profitRate = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0

  const openAdd = () => {
    setEditId(null)
    setName('')
    setAmount('')
    setValue('')
    setDate(new Date().toISOString().slice(0, 10))
    setRemark('')
    setShowModal(true)
  }

  const openEdit = (fund) => {
    setEditId(fund.id)
    setName(fund.name)
    setAmount(String(fund.amount))
    setValue(String(fund.currentValue))
    setDate(fund.date || new Date().toISOString().slice(0, 10))
    setRemark(fund.remark || '')
    setShowModal(true)
  }

  const handleSave = () => {
    if (!name.trim()) { show('请输入基金名称', 'error'); return }
    const amt = parseFloat(amount)
    const val = parseFloat(value)
    if (isNaN(amt) || amt <= 0) { show('请输入有效投入金额', 'error'); return }
    if (isNaN(val) || val <= 0) { show('请输入有效当前市值', 'error'); return }

    let newList
    if (editId) {
      newList = funds.map(f => f.id === editId ? { ...f, name: name.trim(), amount: amt, currentValue: val, date, remark: remark.trim() } : f)
      show('已更新', 'success')
    } else {
      newList = [...funds, { id: Date.now().toString(36), name: name.trim(), amount: amt, currentValue: val, date, remark: remark.trim(), createdAt: Date.now() }]
      show('已添加', 'success')
    }
    setFunds(newList)
    saveFunds(newList)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (!confirm('确定删除这条基金记录？')) return
    const newList = funds.filter(f => f.id !== id)
    setFunds(newList)
    saveFunds(newList)
    show('已删除', 'success')
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📈 基金投资计划</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>记录基金持仓与盈亏情况</p>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 概览卡片 */}
        <div style={{ ...glassStyle, padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>📊 总览</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '2px' }}>总投入</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>¥{formatMoney(totalAmount)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '2px' }}>当前市值</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>¥{formatMoney(totalValue)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '8px', background: totalProfit >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '2px' }}>总盈亏</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: totalProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                {totalProfit >= 0 ? '+' : ''}{formatMoney(totalProfit)}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: totalProfit >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            收益率 {totalProfit >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
          </div>
        </div>

        {/* 基金列表 */}
        {funds.length === 0 ? (
          <div style={{ ...glassStyle, padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0 }}>还没有基金记录，点 + 添加</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '80px' }}>
            {funds.map(fund => {
              const profit = (fund.currentValue || 0) - (fund.amount || 0)
              const rate = fund.amount > 0 ? (profit / fund.amount) * 100 : 0
              return (
                <div
                  key={fund.id}
                  onClick={() => openEdit(fund)}
                  style={{ ...glassStyle, padding: '14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>{fund.name}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(fund.id) }}
                      style={{
                        width: '26px', height: '26px', borderRadius: '50%', border: 'none', flexShrink: 0,
                        background: 'rgba(244,63,94,0.08)', color: '#e11d48', fontSize: '13px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-sub)', flexWrap: 'wrap' }}>
                    <span>投入 <b style={{ color: 'var(--text-main)' }}>¥{formatMoney(fund.amount)}</b></span>
                    <span>→</span>
                    <span>市值 <b style={{ color: 'var(--text-main)' }}>¥{formatMoney(fund.currentValue)}</b></span>
                    <span style={{
                      padding: '2px 6px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      background: profit >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: profit >= 0 ? '#16a34a' : '#dc2626',
                    }}>
                      {profit >= 0 ? '+' : ''}{formatMoney(profit)} ({rate >= 0 ? '+' : ''}{rate.toFixed(2)}%)
                    </span>
                  </div>
                  {fund.date && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af' }}>
                      📅 {fund.date}{fund.remark ? ` · ${fund.remark}` : ''}
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
        position: 'fixed', right: 'calc(50% - 210px)', bottom: 'calc(80px + var(--safe-bottom))',
        width: '52px', height: '52px', borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
        color: '#fff', fontSize: '26px', cursor: 'pointer', zIndex: 40,
        boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.15s',
      }}>+</button>

      {/* 底部弹窗 */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(74,44,58,0.25)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              width: '100%', maxWidth: '480px',
              borderRadius: '28px 28px 0 0',
              padding: '24px 22px calc(16px + var(--safe-bottom))',
              animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: '0 -8px 40px rgba(99,102,241,0.15)',
              maxHeight: '85vh', overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-main)' }}>
                {editId ? '编辑基金' : '添加基金'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{
                width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                background: 'rgba(252,231,243,0.7)', fontSize: '16px', color: 'var(--text-sub)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>基金名称</label>
              <input style={inputStyle} placeholder="例如：易方达蓝筹精选" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>投入金额 (¥)</label>
              <input type="number" step="any" style={inputStyle} placeholder="10000" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>当前市值 (¥)</label>
              <input type="number" step="any" style={inputStyle} placeholder="12000" value={value} onChange={e => setValue(e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>购买日期</label>
              <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>备注（选填）</label>
              <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'none' }} placeholder="备注" value={remark} onChange={e => setRemark(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {editId && (
                <button onClick={() => { handleDelete(editId); setShowModal(false) }} style={{
                  padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.04)', color: '#ef4444', fontSize: '15px',
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>删除</button>
              )}
              <button onClick={handleSave} style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
                background: name.trim() && amount && value ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#e5e7eb',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: name.trim() && amount && value ? 'pointer' : 'not-allowed',
                boxShadow: name.trim() && amount && value ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
              }}>{editId ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
