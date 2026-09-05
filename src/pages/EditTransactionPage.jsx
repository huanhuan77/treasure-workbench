import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'

const CATEGORIES = {
  sample: { label: '样品收入', type: 'income', color: '#0d9488', bg: 'rgba(204, 251, 241, 0.8)' },
  haitao: { label: '海淘', type: 'income', color: '#0284c7', bg: 'rgba(224, 242, 254, 0.8)' },
  xingchuan: { label: '星川', type: 'income', color: '#c2410c', bg: 'rgba(255, 237, 213, 0.8)' },
  withdraw: { label: '钱包提现', type: 'income', color: '#7c3aed', bg: 'rgba(237, 233, 254, 0.8)' },
  prop: { label: '拍摄道具', type: 'expense', color: '#e11d48', bg: 'rgba(254, 226, 226, 0.8)' },
  other_expense: { label: '其他支出', type: 'expense', color: '#c2410c', bg: 'rgba(255, 237, 213, 0.8)' },
  ad: { label: '投流推广', type: 'expense', color: '#be123c', bg: 'rgba(255, 228, 230, 0.8)' },
}

const INCOME_TYPES = ['sample', 'haitao', 'xingchuan', 'withdraw']
const EXPENSE_TYPES = ['prop', 'other_expense', 'ad']

export function EditTransactionPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { transactions, updateTransaction } = useStore()
  const { show } = useToast()
  const tx = transactions.find(t => t.id === id)

  const [type, setType] = useState(tx?.type || 'income')
  const [category, setCategory] = useState(tx?.category || 'sample')
  const [account, setAccount] = useState(tx?.account || '')
  const [amount, setAmount] = useState(String(tx?.amount ?? ''))
  const [date, setDate] = useState(tx?.date || new Date().toISOString().slice(0, 10))
  const [remark, setRemark] = useState(tx?.remark || '')

  if (!tx) {
    return (
      <div className="app-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-sub)' }}>记录不存在</div>
      </div>
    )
  }

  const types = type === 'income' ? INCOME_TYPES : EXPENSE_TYPES
  const accounts = [...new Set(transactions.filter(t => t.account).map(t => t.account))]

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) { show('请输入金额', 'error'); return }
    updateTransaction(id, { type, category, account, amount: Number(amount), date, remark })
    show('已更新', 'success')
    navigate('/finance')
  }

  return (
    <div className="app-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate('/finance')} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>编辑收支</h1>
      </div>
      <div style={{ padding: '16px', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ ...glassStyle, padding: '16px', overflowX: 'hidden' }}>
        <Field label="类型">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setType('income'); setCategory(INCOME_TYPES.includes(category) ? category : 'sample') }}
              style={{ flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none',
                background: type === 'income' ? 'linear-gradient(135deg, #34d399, #10b981)' : 'rgba(255, 255, 255, 0.5)',
                color: type === 'income' ? '#fff' : 'var(--text-sub)' }}>💰 收入</button>
            <button onClick={() => { setType('expense'); setCategory(EXPENSE_TYPES.includes(category) ? category : 'prop') }}
              style={{ flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none',
                background: type === 'expense' ? 'linear-gradient(135deg, #fb7185, #f43f5e)' : 'rgba(255, 255, 255, 0.5)',
                color: type === 'expense' ? '#fff' : 'var(--text-sub)' }}>💸 支出</button>
          </div>
        </Field>
        <Field label="分类">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {types.map(k => {
              const cat = CATEGORIES[k]
              return (
                <button key={k} onClick={() => setCategory(k)} style={{
                  padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none',
                  background: category === k ? cat.bg : 'rgba(255, 255, 255, 0.5)',
                  color: category === k ? cat.color : 'var(--text-sub)',
                  border: category === k ? `1px solid ${cat.color}33` : '1px solid rgba(255, 255, 255, 0.6)' }}>{cat.label}</button>
              )
            })}
          </div>
        </Field>
        <Field label="账号">
          <div style={{ position: 'relative' }}>
            <select value={account} onChange={e => setAccount(e.target.value)}
              style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: '36px', color: account ? 'var(--text-main)' : 'var(--text-sub)' }}>
              <option value="">请选择账号</option>
              {accounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-sub)', fontSize: '12px' }}>▾</span>
          </div>
        </Field>
        <Field label="金额" required>
          <input type="number" step="any" style={inputStyle} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="日期">
          <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="备注（选填）">
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="备注" value={remark} onChange={e => setRemark(e.target.value)} />
        </Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={() => navigate('/finance')}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}