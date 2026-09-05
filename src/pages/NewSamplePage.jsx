import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'
import { addDays } from '../utils/helpers'

const STATUS = {
  unpublished:    { label: '未发布', emoji: '⚪️' },
  published_paid: { label: '已发布·出单', emoji: '🟢💰' },
  published_free: { label: '已发布·未出单', emoji: '🟢' },
  hit:            { label: '🔥爆单', emoji: '🔥' },
  abandoned:      { label: '放弃', emoji: '🚫' },
}

const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function NewSamplePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { samples, addSample } = useStore()
  const { show } = useToast()
  const [name, setName] = useState('')
  // 优先从 location.state 拿到当前账号，否则从 sessionStorage 兜底；归属账号支持多选
  const _mapAcc = (a) => ({ '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }[a] || a || '')
  const _rawAcc = _mapAcc(location.state?.account || sessionStorage.getItem('samples_account'))
  const initialAccounts = _rawAcc && ACCOUNTS.includes(_rawAcc) ? [_rawAcc] : []
  const [accounts, setAccounts] = useState(initialAccounts)
  const [status, setStatus] = useState('unpublished')
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [deadline, setDeadline] = useState(() => addDays(new Date().toISOString().slice(0, 10), 15))
  const [remark, setRemark] = useState('')
  const [commission, setCommission] = useState(5)
  const [orderDate, setOrderDate] = useState('')
  const isOrder = status === 'published_paid' || status === 'hit'

  // 同名检测（按所选账号交集判断）
  const getAccounts = (s) => Array.isArray(s?.accounts) && s.accounts.length ? s.accounts : (s?.account ? [s.account] : [])
  const duplicateName = name.trim() && accounts.length > 0 && samples.some(s =>
    s.name.toLowerCase() === name.trim().toLowerCase() && getAccounts(s).some(a => accounts.includes(a))
  )

  const toggleAccount = (a) => {
    setAccounts(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  const handleSave = () => {
    if (!name.trim()) { show('请输入产品名称', 'error'); return }
    if (accounts.length === 0) { show('请选择归属账号', 'error'); return }
    if (duplicateName) {
      if (!confirm(`⚠️「${name.trim()}」已存在，确定要重复添加吗？`)) return
    }
    addSample({ name: name.trim(), account: accounts[0], accounts: [...accounts], status, receiveDate, deadline, remark, commission: Number(commission), orderDate: isOrder ? orderDate : '' })
    show('已添加', 'success')
    navigate('/samples')
  }

  return (
    <div className="app-container">
      <PageHeader title="添加样品" onBack={() => navigate('/samples')} />
      <div style={{ padding: '16px', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ ...glassStyle, padding: '16px', overflowX: 'hidden' }}>
        <Field label="产品名称" required>
          <input style={inputStyle} placeholder="例如：补水喷雾" value={name} onChange={e => setName(e.target.value)} autoFocus />
          {duplicateName && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚠️ 已有同名样品
            </p>
          )}
        </Field>
        <Field label="归属账号（可多选）">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map(a => {
              const selected = accounts.includes(a)
              return (
                <button key={a} onClick={() => toggleAccount(a)} style={{
                  flex: '0 0 auto', minWidth: '92px',
                  padding: '10px 14px', borderRadius: '999px',
                  border: selected ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
                  background: selected
                    ? 'linear-gradient(135deg, #f472b6, #ec4899)'
                    : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selected ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
                  textAlign: 'center', minHeight: '40px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: '4px',
                }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    color: selected ? '#fff' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                  }}>{a}</span>
                  {selected && (
                    <span style={{
                      color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                    }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="状态">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(STATUS).map(([k, s]) => (
              <button key={k} onClick={() => setStatus(k)} style={{
                padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none',
                background: status === k ? 'linear-gradient(135deg, #f472b6, #ec4899)' : 'rgba(255,255,255,0.5)',
                color: status === k ? '#fff' : 'var(--text-sub)' }}>{s.emoji} {s.label}</button>
            ))}
          </div>
        </Field>
        {isOrder && (
          <Field label="出单日期（选填，用于近出单统计）">
            <input type="date" style={inputStyle} value={orderDate} onChange={e => setOrderDate(e.target.value)} />
          </Field>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <Field label="收货日期">
              <input type="date" style={inputStyle} value={receiveDate} onChange={e => { setReceiveDate(e.target.value); setDeadline(addDays(e.target.value, 15)) }} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="截止时间（选填）">
              <input type="date" style={inputStyle} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="佣金 %">
          <input type="number" style={inputStyle} value={commission} onChange={e => setCommission(e.target.value)} />
        </Field>
        <Field label="备注（选填）">
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="备注" value={remark} onChange={e => setRemark(e.target.value)} />
        </Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={() => navigate('/samples')}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
