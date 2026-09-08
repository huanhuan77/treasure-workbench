import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'
import { addDays } from '../utils/helpers'
import { getAccounts, getLogistics, getExecByAccount, getCounts, LOGISTICS_STATUS, EXEC_STATUS } from '../utils/sampleStatus'
import { LinksEditor } from '../components/LinksEditor'

const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
const LOGISTICS_LIST = Object.values(LOGISTICS_STATUS)
const EXEC_LIST = Object.values(EXEC_STATUS)

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
  const sample = id ? samples.find((s) => s.id === id) : null
  const [name, setName] = useState(sample?.name || '')
  const _mapAcc = (a) => ({ '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }[a] || a || '')
  const initialAccounts = Array.isArray(sample?.accounts) && sample.accounts.length
    ? sample.accounts
    : (sample?.account ? [_mapAcc(sample.account)] : [])
  const [accounts, setAccounts] = useState(initialAccounts)
  const [logistics, setLogisticsState] = useState(getLogistics(sample))
  const [execByAccount, setExecByAccount] = useState(getExecByAccount(sample))
  const [receiveDate, setReceiveDate] = useState(sample?.receiveDate || new Date().toISOString().slice(0, 10))
  const [deadline, setDeadline] = useState(sample?.deadline || addDays(sample?.receiveDate || new Date().toISOString().slice(0, 10), 15))
  const [remark, setRemark] = useState(sample?.remark || '')
  const [commission, setCommission] = useState(sample?.commission || 5)
  const [links, setLinks] = useState(() =>
    (Array.isArray(sample?.links) ? sample.links : []).map((l) => ({ id: l.id || 'L' + Math.random().toString(36).slice(2, 6), url: l.url || '', note: l.note || '' }))
  )

  const toggleAccount = (a) => {
    setAccounts((prev) => {
      if (prev.includes(a)) {
        const next = prev.filter((x) => x !== a)
        setExecByAccount((eb) => { const c = { ...eb }; delete c[a]; return c })
        return next
      }
      setExecByAccount((eb) => ({ ...eb, [a]: eb[a] || null }))
      return [...prev, a]
    })
  }

  const setExec = (a, key) => {
    setExecByAccount((eb) => ({ ...eb, [a]: key }))
  }

  const onLogistics = (key) => {
    setLogisticsState(key)
    // 回到「未到货」时清空各账号执行状态（还没到货谈不上已拍/已发）
    if (key === 'un_arrived') setExecByAccount({})
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
    if (accounts.length === 0) { show('请选择归属账号', 'error'); return }
    updateSample(id, {
      name: name.trim(),
      account: accounts[0],
      accounts: [...accounts],
      logistics,
      execByAccount,
      receiveDate,
      deadline,
      remark,
      commission: Number(commission),
      links: (links || []).filter((l) => l.url && l.url.trim()).map((l) => ({ id: l.id, url: l.url.trim(), note: (l.note || '').trim() })),
    })
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
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="归属账号（可多选）">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
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
                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="物流状态（共享，所有账号通用）">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {LOGISTICS_LIST.map((s) => (
              <button key={s.key} onClick={() => onLogistics(s.key)} style={{
                flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none',
                background: logistics === s.key ? s.color : 'rgba(255,255,255,0.5)',
                color: logistics === s.key ? '#fff' : 'var(--text-sub)' }}>{s.icon} {s.label}</button>
            ))}
          </div>
        </Field>

        <Field label="各账号执行状态（独立管理）">
          {accounts.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>请先选择归属账号</div>
          ) : logistics === 'un_arrived' ? (
            <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>未到货，到货后可分别设置各账号的拍摄/发布状态。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {accounts.map((a) => {
                const cur = execByAccount[a]
                const c = getCounts(sample, a)
                return (
                  <div key={a} style={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '8px 10px', background: 'rgba(255,255,255,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', flex: 1 }}>{a}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>
                        已发 {c.publishCount} · 出单 {c.orderCount}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {EXEC_LIST.map((s) => (
                        <button key={s.key} onClick={() => setExec(a, s.key)} style={{
                          flex: 1, minWidth: 0, padding: '8px 4px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: 'none',
                          background: cur === s.key ? s.color : 'rgba(255,255,255,0.7)',
                          color: cur === s.key ? '#fff' : 'var(--text-sub)' }}>{s.icon} {s.label}</button>
                      ))}
                      {!cur && (
                        <span style={{ fontSize: '11px', color: 'var(--text-sub)', alignSelf: 'center', paddingLeft: '4px' }}>（待拍摄）</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Field>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <Field label="收货日期">
              <input type="date" style={inputStyle} value={receiveDate} onChange={(e) => { setReceiveDate(e.target.value); setDeadline(addDays(e.target.value, 15)) }} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="截止时间">
              <input type="date" style={inputStyle} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="佣金 %">
          <input type="number" style={inputStyle} value={commission} onChange={(e) => setCommission(e.target.value)} />
        </Field>
        <Field label="备注">
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>
        <LinksEditor links={links} onChange={setLinks} />
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
