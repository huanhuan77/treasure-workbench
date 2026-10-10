import { useState } from 'react'
import { useStore } from '../store'
import { useToast } from './Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost } from './Modal'
import { todayStr, addDays, toDateInput } from '../utils/helpers'
import { isShotSample } from '../utils/sampleStatus'
import { CATEGORIES } from '../utils/categories'
import { ACCOUNTS } from '../utils/accounts'

export function SampleForm({ sample, onClose, onSave, onDelete, inline = true, statusMode = false }) {
  const { products } = useStore()
  const { show } = useToast()
  const [form, setForm] = useState({
    name: sample?.name || '',
    account: sample?.account || (Array.isArray(sample?.accounts) && sample.accounts[0]) || '',
    accounts: Array.isArray(sample?.accounts) && sample.accounts.length ? sample.accounts : (sample?.account ? [sample.account] : []),
    logistics: sample?.logistics || (sample?.status === 'un_arrived' ? 'un_arrived' : 'arrived'),
    isShot: sample?.isShot ?? isShotSample(sample),
    receiveDate: sample?.receiveDate || todayStr(),
    deadline: sample?.deadline || (sample ? '' : addDays(todayStr(), 15)),
    remark: sample?.remark || '',
    commission: sample?.commission || 5,
    productId: sample?.productId || '',
    category: sample?.category || '',
    archived: sample?.archived || sample?.status === 'abandoned' || false,
  })
  const [deadlineTouched, setDeadlineTouched] = useState(!!sample?.deadline)

  const toggleAccountSel = (a) => {
    setForm((f) => {
      if (statusMode) return { ...f, accounts: f.accounts.includes(a) ? f.accounts.filter((x) => x !== a) : [...f.accounts, a] }
      if (sample) return { ...f, accounts: f.accounts[0] === a ? [] : [a] }
      return { ...f, accounts: f.accounts.includes(a) ? f.accounts.filter((x) => x !== a) : [...f.accounts, a] }
    })
  }

  const onReceiveChange = (v) => {
    setForm((f) => {
      const next = { ...f, receiveDate: v }
      if (!deadlineTouched && v) next.deadline = addDays(v, 15)
      return next
    })
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (!sample && !form.category) { show('请选择分类', 'error'); return }
    const f = { ...form, name: form.name.trim(), account: form.accounts[0] || '', accounts: [...form.accounts] }
    onSave(f)
  }

  const productOptions = (products || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return (
    <Modal
      open
      onClose={onClose}
      title={sample ? '编辑样品' : '添加样品'}
      inline={inline}
      footer={
        <div style={{ display: 'flex', gap: '10px' }}>
          {onDelete && (
            <button style={{ ...btnGhost, color: '#fb7185', flex: '0 0 auto', width: 'auto', padding: '12px 16px' }} onClick={onDelete}>删除</button>
          )}
          <button style={btnGhost} onClick={onClose}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      }
    >
      <Field label="产品名称">
        <input style={{ ...inputStyle, color: '#9ca3af', background: '#f3f4f6' }} placeholder="样品名称" value={form.name} readOnly />
      </Field>

      {!statusMode && (
      <Field label="分类" required={!sample}>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px' }}>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setForm({ ...form, category: c })} style={{
              flex: '0 0 auto', padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
              border: form.category === c ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
              background: form.category === c ? 'rgba(244,114,182,0.12)' : '#fff',
              color: form.category === c ? 'var(--primary)' : 'var(--text-sub)',
              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>{c}</button>
          ))}
        </div>
      </Field>
      )}

      <Field label={sample ? '归属账号（单条样品仅归属 1 个账号）' : '归属账号（可多选，选几个账号就生成几条样品）'}>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px' }}>
          {ACCOUNTS.map((a) => {
            const selected = form.accounts.includes(a)
            return (
              <button key={a} type="button" onClick={() => toggleAccountSel(a)} style={{
                flex: '1 1 0', minWidth: 0,
                padding: '7px 8px', borderRadius: '999px',
                border: selected ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.06)',
                background: selected ? 'linear-gradient(135deg, #f472b6, #ec4899)' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: selected ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
                textAlign: 'center', minHeight: '34px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: selected ? '#fff' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a}</span>
                {selected && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>✓</span>}
              </button>
            )
          })}
        </div>
        {!sample && form.accounts.length > 1 && (
          <div style={{
            marginTop: '8px', fontSize: '12px', lineHeight: 1.5, fontWeight: 600, color: '#be185d',
            background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)',
            borderRadius: '10px', padding: '8px 10px',
          }}>
            将拆分为 <b>{form.accounts.length}</b> 条样品（{form.accounts.join(' / ')}），各账号的发布条数与出单独立统计、互不干扰。
          </div>
        )}
      </Field>

      {!statusMode && (
      <Field label="关联产品（选填）">
        <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} style={{ ...inputStyle, appearance: 'none', backgroundImage: 'none' }}>
          <option value="">未关联</option>
          {productOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      )}

      <Field label="佣金（%）">
        <input type="number" value={form.commission === 5 ? '' : form.commission} onChange={(e) => {
          const v = e.target.value === '' ? 5 : parseInt(e.target.value)
          setForm({ ...form, commission: isNaN(v) ? 5 : v })
        }} placeholder="5（默认不显示）"
          style={{ ...inputStyle }} />
      </Field>

      <Field label="物流">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { v: 'un_arrived', label: '🚚 未到货' },
            { v: 'arrived', label: '📦 已到货' },
          ].map((it) => (
            <button
              key={it.v}
              onClick={() => setForm((f) => ({ ...f, logistics: it.v, isShot: it.v === 'un_arrived' ? false : f.isShot }))}
              style={{
                padding: '11px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                background: (form.logistics || (form.isShot ? 'arrived' : 'un_arrived')) === it.v ? '#ec4899' : 'rgba(255,255,255,0.5)',
                color: (form.logistics || (form.isShot ? 'arrived' : 'un_arrived')) === it.v ? '#fff' : 'var(--text-sub)',
                border: 'none',
              }}
            >{it.label}</button>
          ))}
        </div>
      </Field>

      <Field label="拍摄（拍一次即可，与账号无关）">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { v: false, label: '🎬 未拍' },
            { v: true, label: '✅ 已拍' },
          ].map((it) => (
            <button
              key={String(it.v)}
              onClick={() => setForm((f) => ({ ...f, isShot: it.v }))}
              style={{
                padding: '11px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                background: !!form.isShot === it.v ? '#06b6d4' : 'rgba(255,255,255,0.5)',
                color: !!form.isShot === it.v ? '#fff' : 'var(--text-sub)',
                border: 'none',
              }}
            >{it.label}</button>
          ))}
        </div>
        {sample && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-sub)' }}>
            归档（放弃）请在保存后用「放弃」入口操作；发布/出单按账号独立统计。
          </div>
        )}
      </Field>

      {statusMode && (
      <Field label="归档（放弃，不做了可随时恢复）">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={() => setForm((f) => ({ ...f, archived: false }))} style={{
            padding: '11px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
            background: !form.archived ? '#6b7280' : 'rgba(255,255,255,0.5)',
            color: !form.archived ? '#fff' : 'var(--text-sub)', border: 'none',
          }}>使用中</button>
          <button onClick={() => setForm((f) => ({ ...f, archived: true }))} style={{
            padding: '11px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
            background: form.archived ? '#ef4444' : 'rgba(255,255,255,0.5)',
            color: form.archived ? '#fff' : 'var(--text-sub)', border: 'none',
          }}>已归档</button>
        </div>
      </Field>
      )}

      <Field label="收货时间">
        <input type="date" style={inputStyle} value={toDateInput(form.receiveDate)} onChange={(e) => onReceiveChange(e.target.value)} />
      </Field>

      <Field label="截止时间（默认收货 +15 天）">
        <input type="date" style={inputStyle} value={toDateInput(form.deadline)} onChange={(e) => { setDeadlineTouched(true); setForm({ ...form, deadline: e.target.value }) }} />
      </Field>

      {!statusMode && (
      <Field label="备注">
        <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="备注信息" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
      </Field>
      )}
    </Modal>
  )
}

export default SampleForm
