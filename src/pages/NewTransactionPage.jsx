import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function NewTransactionPage() {
  const navigate = useNavigate()
  const { addTransaction } = useStore()
  const { show } = useToast()
  const [type, setType] = useState('income')
  const [category, setCategory] = useState('sample')
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [remark, setRemark] = useState('')

  const types = type === 'income' ? INCOME_TYPES : EXPENSE_TYPES

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) { show('请输入金额', 'error'); return }
    addTransaction({ type, category, account, amount: Number(amount), date, remark })
    show('已添加', 'success')
    navigate('/finance')
  }

  return (
    <div className="app-container">
      <PageHeader title="添加收支" onBack={() => navigate('/finance')} />
      <div style={{ padding: '16px' }}>
        <div style={{ ...glassStyle, padding: '16px', marginBottom: '16px' }}>
        <Field label="类型">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setType('income'); setCategory('sample') }}
              style={{ flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none',
                background: type === 'income' ? 'linear-gradient(135deg, #34d399, #10b981)' : 'rgba(255, 255, 255, 0.5)',
                color: type === 'income' ? '#fff' : 'var(--text-sub)' }}>💰 收入</button>
            <button onClick={() => { setType('expense'); setCategory('prop') }}
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
          <input style={inputStyle} placeholder="例如：抖音号A" value={account} onChange={e => setAccount(e.target.value)} />
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
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={btnGhost} onClick={() => navigate('/finance')}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
