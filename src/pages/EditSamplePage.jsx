import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'
import { addDays, todayStr } from '../utils/helpers'
import { getAccounts, getLogistics, getCounts, isShotSample, LOGISTICS_STATUS } from '../utils/sampleStatus'
import { LinksEditor } from '../components/LinksEditor'
import { CATEGORIES } from '../utils/categories'

const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
const LOGISTICS_LIST = Object.values(LOGISTICS_STATUS)

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
  const { samples, updateSample, deleteSample, addPublishRecord } = useStore()
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
  const [isShot, setIsShot] = useState(sample?.isShot ?? isShotSample(sample))   // 拍摄（样品级共享）
  const [archived, setArchived] = useState(!!sample?.archived)                    // 归档（放弃）
  const [receiveDate, setReceiveDate] = useState(sample?.receiveDate || new Date().toISOString().slice(0, 10))
  const [deadline, setDeadline] = useState(sample?.deadline || addDays(sample?.receiveDate || new Date().toISOString().slice(0, 10), 15))
  const [remark, setRemark] = useState(sample?.remark || '')
  const [category, setCategory] = useState(sample?.category || '')   // 分类（选填）
  const [commission, setCommission] = useState(sample?.commission || 5)
  const [links, setLinks] = useState(() =>
    (Array.isArray(sample?.links) ? sample.links : []).map((l) => ({ id: l.id || 'L' + Math.random().toString(36).slice(2, 6), url: l.url || '', note: l.note || '' }))
  )
  const [manualPubOpen, setManualPubOpen] = useState(false)      // 手动补发布展开
  const [pubAccounts, setPubAccounts] = useState([])             // 补发布选中的账号

  const toggleAccount = (a) => {
    setAccounts((prev) => (
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    ))
  }

  const onLogistics = (key) => {
    setLogisticsState(key)
    // 回到「未到货」时视为未拍（还没到货谈不上已拍）
    if (key === 'un_arrived') setIsShot(false)
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
      isShot,
      archived,
      receiveDate,
      deadline,
      remark,
      category,
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
        <Field label="分类（选填）">
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
        <Field label="归属账号（可多选）">
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px' }}>
            {ACCOUNTS.map((a) => {
              const selected = accounts.includes(a)
              return (
                <button key={a} onClick={() => toggleAccount(a)} style={{
                  flex: 1, minWidth: 0,
                  padding: '7px 8px', borderRadius: '999px',
                  border: selected ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
                  background: selected
                    ? 'linear-gradient(135deg, #f472b6, #ec4899)'
                    : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selected ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
                  textAlign: 'center', minHeight: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '2px',
                }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600,
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

        <Field label="拍摄（拍一次即可，与账号无关）">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { v: false, label: '🎬 未拍' },
              { v: true, label: '✅ 已拍' },
            ].map((it) => (
              <button key={String(it.v)} onClick={() => setIsShot(it.v)} style={{
                flex: 1, padding: '10px 0', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none',
                background: isShot === it.v ? '#06b6d4' : 'rgba(255,255,255,0.5)',
                color: isShot === it.v ? '#fff' : 'var(--text-sub)' }}>{it.label}</button>
            ))}
          </div>
        </Field>

        <Field label="归档（放弃，不做了可随时恢复）">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { v: false, label: '使用中' },
              { v: true, label: '🚫 已归档' },
            ].map((it) => (
              <button key={String(it.v)} onClick={() => setArchived(it.v)} style={{
                flex: 1, padding: '10px 0', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none',
                background: archived === it.v ? '#9ca3af' : 'rgba(255,255,255,0.5)',
                color: archived === it.v ? '#fff' : 'var(--text-sub)' }}>{it.label}</button>
            ))}
          </div>
          {/* 手动补发布：忘了记发布时补一条今天的记录，状态/计数自动更新 */}
          <div style={{ marginTop: '8px' }}>
            {!manualPubOpen ? (
              <button onClick={() => { setPubAccounts([...accounts]); setManualPubOpen(true) }} style={{
                width: '100%', padding: '9px 0', borderRadius: '10px', border: '1px dashed rgba(6,182,212,0.5)',
                background: 'rgba(6,182,212,0.06)', color: '#0891b2', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>✋ 忘了记发布？手动补一条今天的发布</button>
            ) : (
              <div style={{ border: '1px solid rgba(6,182,212,0.25)', borderRadius: '10px', padding: '8px 10px', background: 'rgba(6,182,212,0.04)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '6px' }}>选择这次发布到的账号（发布日期 = 今天）：</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {accounts.map((a) => {
                    const sel = pubAccounts.includes(a)
                    return (
                      <button key={a} onClick={() => setPubAccounts((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))} style={{
                        padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        border: sel ? 'none' : '1px solid rgba(0,0,0,0.10)',
                        background: sel ? '#06b6d4' : '#fff', color: sel ? '#fff' : 'var(--text-sub)',
                      }}>{a}</button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setManualPubOpen(false)} style={{
                    flex: 1, padding: '8px 0', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: 'var(--text-sub)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}>取消</button>
                  <button
                    disabled={pubAccounts.length === 0}
                    onClick={() => {
                      addPublishRecord({ sampleId: id, accounts: [...pubAccounts], qty: 1, publishDate: todayStr() })
                      show(`已补记今天发布（${pubAccounts.join(' / ')}）`, 'success')
                      setManualPubOpen(false)
                    }}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none', background: pubAccounts.length ? '#06b6d4' : 'rgba(6,182,212,0.3)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: pubAccounts.length ? 'pointer' : 'default',
                    }}>确认补记</button>
                </div>
              </div>
            )}
          </div>
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
