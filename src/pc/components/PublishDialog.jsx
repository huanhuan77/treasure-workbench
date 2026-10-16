import { useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../../utils/accounts'
import { todayStr } from '../../utils/helpers'

// PC 版「记录/补记发布」弹窗。
// 用户要求：PC 端的按钮操作走弹窗、不跳页面（手机版仍跳 NewPublishRecordPage）。
// 落库字段照抄 NewPublishRecordPage.handleSave：
//   { sampleId, productId, accounts: [账号], publishDate, qty }
// 手机版是「账号分组 × 多条样品」的复杂录入；这个弹窗定位是快速补记：
// 一个样品 + 勾若干账号 + 一个日期 + 一个数量，逐个账号各写一条记录。
// onClose 关闭；sampleId/accounts 为调用处的预填。
export function PublishDialog({ sampleId: initSampleId = '', accounts: initAccounts = [], onClose }) {
  const { samples, addPublishRecord } = useStore()
  const { show } = useToast()

  const [sampleId, setSampleId] = useState(initSampleId)
  const [date, setDate] = useState(todayStr())
  const [qty, setQty] = useState('1')
  const [picked, setPicked] = useState(() => new Set(initAccounts))

  const sample = (samples || []).find((s) => s.id === sampleId) || null
  // 选了样品就只列它自己的账号（手机版同口径：记录是记到该样品的账号上的）
  const accountOptions = sample ? getAccounts(sample) : ACCOUNTS
  const sampleOptions = (samples || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'))

  const toggle = (a) => {
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(a) ? next.delete(a) : next.add(a)
      return next
    })
  }

  const save = () => {
    if (!sampleId) { show('请选择样品', 'error'); return }
    const list = [...picked]
    if (list.length === 0) { show('请至少选一个账号', 'error'); return }
    const n = Math.max(1, Number(qty) || 1)
    for (const a of list) {
      addPublishRecord({
        sampleId,
        productId: sample?.productId || '',
        accounts: [a],
        publishDate: date,
        qty: n,
      })
    }
    show(`已记录 ${list.length} 条发布`, 'success')
    onClose()
  }

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span>记录发布</span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          <div className="pcv-field-label">样品 <span style={{ color: '#b96a66' }}>*</span></div>
          <select
            className="pcv-input"
            style={{ width: '100%' }}
            value={sampleId}
            onChange={(e) => { setSampleId(e.target.value); setPicked(new Set()) }}
          >
            <option value="">请选择样品</option>
            {sampleOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <div className="pcv-field-label">发布日期</div>
              <input className="pcv-input" style={{ width: '100%' }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div style={{ width: 110 }}>
              <div className="pcv-field-label">数量</div>
              <input className="pcv-input" style={{ width: '100%' }} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>

          <div className="pcv-field-label" style={{ marginTop: 16 }}>
            发布账号 <span style={{ color: '#b96a66' }}>*</span>
            <span style={{ fontWeight: 400, color: '#9aa0a9', marginLeft: 6 }}>（每个账号各记一条）</span>
          </div>
          <div className="pcv-catpick">
            {accountOptions.map((a) => (
              <button
                key={a}
                className={picked.has(a) ? 'on' : ''}
                onClick={() => toggle(a)}
                style={picked.has(a) ? undefined : { borderColor: (ACCOUNT_COLOR[a] || {}).c || undefined, color: (ACCOUNT_COLOR[a] || {}).c || undefined }}
              >{a}</button>
            ))}
          </div>
        </div>

        <div className="pcv-dialog-f">
          <div className="pcv-spacer" />
          <button className="pcv-btn pcv-btn-ghost" onClick={onClose}>取消</button>
          <button className="pcv-btn" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}
