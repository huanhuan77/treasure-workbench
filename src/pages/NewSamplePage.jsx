import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'

const STATUS = {
  unpublished: { label: '未发布', emoji: '⚪️' },
  published: { label: '已发布', emoji: '🟢' },
  hit: { label: '🔥爆单', emoji: '🔥' },
  abandoned: { label: '放弃', emoji: '🚫' },
}

const ACCOUNTS = ['大号', '小号', '小小号']
const ACCOUNT_NICK = { '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }

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
  const { addSample } = useStore()
  const { show } = useToast()
  const [name, setName] = useState('')
  const [account, setAccount] = useState('大号')
  const [status, setStatus] = useState('unpublished')
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [deadline, setDeadline] = useState('')
  const [remark, setRemark] = useState('')
  const [commission, setCommission] = useState(5)

  const handleSave = () => {
    if (!name.trim()) { show('请输入产品名称', 'error'); return }
    addSample({ name: name.trim(), account, status, receiveDate, deadline, remark, commission: Number(commission) })
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
        </Field>
        <Field label="所属账号">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {ACCOUNTS.map(a => {
              const selected = account === a
              return (
                <button key={a} onClick={() => setAccount(a)} style={{
                  padding: '10px 10px', borderRadius: '999px',
                  border: selected ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
                  background: selected
                    ? 'linear-gradient(135deg, #f472b6, #ec4899)'
                    : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selected ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
                  textAlign: 'center', minHeight: '38px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '3px',
                }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    color: selected ? '#fff' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{ACCOUNT_NICK[a]}</span>
                  {selected && (
                    <span style={{
                      color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0,
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <Field label="收货日期">
              <input type="date" style={inputStyle} value={receiveDate} onChange={e => setReceiveDate(e.target.value)} />
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
