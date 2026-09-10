import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'
import { addDays } from '../utils/helpers'
import { LinksEditor } from '../components/LinksEditor'
import { CATEGORIES } from '../utils/categories'

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
  const [arrived, setArrived] = useState(false)   // 物流：false=未到货 / true=已到货
  const [isShot, setIsShot] = useState(false)     // 拍摄（样品级共享）
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [deadline, setDeadline] = useState(() => addDays(new Date().toISOString().slice(0, 10), 15))
  const [remark, setRemark] = useState('')
  const [commission, setCommission] = useState(5)
  const [links, setLinks] = useState([])
  const [category, setCategory] = useState('')   // 分类（与产品分类同口径）

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
    if (!category) { show('请选择分类', 'error'); return }
    if (accounts.length === 0) { show('请选择归属账号', 'error'); return }
    if (duplicateName) {
      if (!confirm(`⚠️「${name.trim()}」已存在，确定要重复添加吗？`)) return
    }
    addSample({
      name: name.trim(), account: accounts[0], accounts: [...accounts],
      logistics: arrived ? 'arrived' : 'un_arrived', isShot,
      receiveDate, deadline, remark,
      category,
      commission: Number(commission),
      links: (links || []).filter((l) => l.url && l.url.trim()).map((l) => ({ id: l.id, url: l.url.trim(), note: (l.note || '').trim() })),
    })
    show(accounts.length > 1 ? `已创建（归属 ${accounts.length} 个账号，物流与拍摄共享，发布/出单按账号独立统计）` : '已添加', 'success')
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
        <Field label="分类" required>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                flex: '0 0 auto', padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
                border: category === c ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
                background: category === c ? 'rgba(244,114,182,0.12)' : '#fff',
                color: category === c ? 'var(--primary)' : 'var(--text-sub)',
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>{c}</button>
            ))}
          </div>
        </Field>
        <Field label="归属账号（可多选，选几个账号就生成几条样品）">
          {/* 账号按钮单行横排，超出可横向滚动，避免换行挤压布局 */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '2px', scrollbarWidth: 'none' }} className="hide-scrollbar">
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
          {accounts.length > 1 && (
            <div style={{
              marginTop: '8px', fontSize: '12px', lineHeight: 1.5, fontWeight: 600, color: '#be185d',
              background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)',
              borderRadius: '10px', padding: '8px 10px',
            }}>
              将创建 <b>1 条</b>样品（归属 {accounts.join(' / ')}）：物流状态共享，发布条数与出单按账号独立统计，可在列表/编辑里分别管理每个账号的状态。
            </div>
          )}
        </Field>
        <Field label="物流状态">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { v: false, label: '🚚 未到货' },
              { v: true, label: '📦 已到货' },
            ].map((it) => (
              <button key={String(it.v)} onClick={() => setArrived(it.v)} style={{
                flex: 1, padding: '9px 0', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none',
                background: arrived === it.v ? 'linear-gradient(135deg, #f472b6, #ec4899)' : 'rgba(255,255,255,0.5)',
                color: arrived === it.v ? '#fff' : 'var(--text-sub)' }}>{it.label}</button>
            ))}
          </div>
        </Field>
        <Field label="拍摄（拍一次即可，与账号无关）">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { v: false, label: '🎬 未拍' },
              { v: true, label: '✅ 已拍' },
            ].map((it) => (
              <button key={String(it.v)} onClick={() => setIsShot(it.v)} style={{
                flex: 1, padding: '9px 0', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none',
                background: isShot === it.v ? 'linear-gradient(135deg, #22d3ee, #06b6d4)' : 'rgba(255,255,255,0.5)',
                color: isShot === it.v ? '#fff' : 'var(--text-sub)' }}>{it.label}</button>
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
        <LinksEditor links={links} onChange={setLinks} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={() => navigate('/samples')}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
