import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export function EditSamplePage() {
  const navigate = useNavigate()
  const { samples, updateSample, deleteSample } = useStore()
  const { show } = useToast()
  const id = window.location.hash.match(/\/samples\/([^/]+)\/edit/)?.[1]
  const sample = id ? samples.find(s => s.id === id) : null
  const [name, setName] = useState(sample?.name || '')
  const _mapAcc = (a) => ({ '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }[a] || a || '')
  const initialAccounts = Array.isArray(sample?.accounts) && sample.accounts.length
    ? sample.accounts
    : (sample?.account ? [_mapAcc(sample.account)] : [])
  const [accounts, setAccounts] = useState(initialAccounts)
  const [status, setStatus] = useState(sample?.status || 'unpublished')
  const [receiveDate, setReceiveDate] = useState(sample?.receiveDate || new Date().toISOString().slice(0,10))
  const [deadline, setDeadline] = useState(sample?.deadline || addDays(sample?.receiveDate || new Date().toISOString().slice(0,10), 15))
  const [remark, setRemark] = useState(sample?.remark || '')
  const [commission, setCommission] = useState(sample?.commission || 5)

  // 同名检测（排除当前编辑的，按所选账号交集判断，仅保存时）
  const getAccounts = (s) => Array.isArray(s?.accounts) && s.accounts.length ? s.accounts : (s?.account ? [s.account] : [])
  const isDuplicate = (val) => val.trim() && sample && accounts.length > 0 && samples.some(s =>
    s.id !== sample.id && s.name.toLowerCase() === val.trim().toLowerCase() && getAccounts(s).some(a => accounts.includes(a))
  )

  const toggleAccount = (a) => {
    setAccounts(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  if (!sample) {
    return (
      <div className="app-container">
        <PageHeader title="编辑样品" onBack={() => navigate('/samples')} />
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-sub)' }}>样品不存在</div>
      </div>
    )
  }

  const handleSave = () => {
    if (!name.trim()) { show('请输入产品名称', 'error'); return }
    if (isDuplicate(name)) {
      if (!confirm(`⚠️「${name.trim()}」已存在，确定要保存为重复名称吗？`)) return
    }
    if (accounts.length === 0) { show('请选择归属账号', 'error'); return }
    updateSample(id, { name: name.trim(), account: accounts[0], accounts: [...accounts], status, receiveDate, deadline, remark, commission: Number(commission) })
    show('已更新', 'success')
    navigate('/samples')
  }

  const handleDelete = () => {
    if (confirm('确定删除该样品吗？')) {
      deleteSample(id)
      show('已删除', 'success')
      navigate('/samples')
    }
  }

  return (
    <div className="app-container">
      <PageHeader title="编辑样品" onBack={() => navigate('/samples')} />
      <div style={{ padding: '16px' }}>
        <div style={{ ...glassStyle, padding: '16px' }}>
        <Field label="产品名称" required>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="归属账号（可多选）">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map(a => {
              const selected = accounts.includes(a)
              return (
                <button key={a} onClick={() => toggleAccount(a)} style={{
                  flex: 1, minWidth: 0,
                  padding: '10px 8px', borderRadius: '999px',
                  border: selected ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
                  background: selected
                    ? 'linear-gradient(135deg, #f472b6, #ec4899)'
                    : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selected ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
                  textAlign: 'center', minHeight: '38px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '2px',
                }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: selected ? '#fff' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{a}</span>
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
              <input type="date" style={inputStyle} value={receiveDate} onChange={e => { setReceiveDate(e.target.value); setDeadline(addDays(e.target.value, 15)) }} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="截止时间">
              <input type="date" style={inputStyle} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="佣金 %">
          <input type="number" style={inputStyle} value={commission} onChange={e => setCommission(e.target.value)} />
        </Field>
        <Field label="备注">
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={remark} onChange={e => setRemark(e.target.value)} />
        </Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={{ ...btnGhost, color: '#fb7185' }} onClick={handleDelete}>删除</button>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={() => navigate('/samples')}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
