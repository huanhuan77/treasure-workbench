import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost } from '../components/Modal'
import { ACCOUNTS, ACCOUNT_COLOR, hasAccount } from '../utils/accounts'
import { isSelectableForOrder } from '../utils/publish'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 新增 / 编辑出单表单（弹窗内，供出单记录页与总览页复用）
export function OrderFormModal({ open, onClose, editing, onSave, prefill }) {
  const [account, setAccount] = useState(editing?.account || prefill?.account || '')
  const [sampleId, setSampleId] = useState(editing?.sampleId || prefill?.sampleId || '')
  const [name, setName] = useState(editing?.name || prefill?.name || '')
  const [date, setDate] = useState(editing?.date || todayStr())
  const [qty, setQty] = useState(editing?.qty ? String(editing.qty) : '1')
  const [remark, setRemark] = useState(editing?.remark || '')
  const [sampleOpen, setSampleOpen] = useState(false)  // 样品搜索面板展开
  const [sampleQuery, setSampleQuery] = useState('')    // 样品搜索关键词
  const { samples } = useStore()
  const { show } = useToast()

  // 先选账号 → 该账号下「已发布」的样品才可关联
  const candidateSamples = useMemo(() => {
    const base = (samples || []).filter((sm) => isSelectableForOrder(sm.status) && hasAccount(sm, account))
    // 编辑旧数据时，若原关联样品已不在候选中（账号变更/状态变化），仍把它列出来以便原样保存
    const oldSm = editing?.sampleId ? (samples || []).find((x) => x.id === editing.sampleId) : null
    if (oldSm && !base.some((x) => x.id === oldSm.id)) return [...base, oldSm]
    return base
  }, [samples, account, editing])

  // 当前账号下可搜的样品（按名称关键词过滤，已选的置顶）
  const searchableSamples = useMemo(() => {
    const q = sampleQuery.trim().toLowerCase()
    const list = candidateSamples.filter((sm) => !q || (sm.name || '').toLowerCase().includes(q))
    return list.sort((a, b) => {
      if (a.id === sampleId) return -1
      if (b.id === sampleId) return 1
      return 0
    })
  }, [candidateSamples, sampleQuery, sampleId])

  const currentSample = sampleId ? (samples || []).find((x) => x.id === sampleId) : null

  const onPickAccount = (a) => {
    setAccount(a)
    const sm = sampleId ? (samples || []).find((x) => x.id === sampleId) : null
    // 切换账号后原样品不属于新账号 → 清空，避免误关联
    if (sm && !hasAccount(sm, a)) { setSampleId(''); setName('') }
  }
  const onPickSample = (sid) => {
    setSampleId(sid)
    setSampleOpen(false)
    setSampleQuery('')
    const sm = (samples || []).find((x) => x.id === sid)
    if (sm) setName(sm.name)
  }
  const openSamplePicker = () => {
    if (!account) { show('请先选择账号', 'error'); return }
    setSampleQuery('')
    setSampleOpen((v) => !v)
  }

  const handleSave = () => {
    if (!account) { show('请先选择账号', 'error'); return }
    if (!sampleId) { show('请选择该账号下已发布的样品', 'error'); return }
    const sm = (samples || []).find((x) => x.id === sampleId)
    if (!sm || !isSelectableForOrder(sm.status) || !hasAccount(sm, account)) {
      show('所选样品需属于该账号且为已发布状态', 'error')
      return
    }
    onSave({
      name: (name.trim() || sm?.name?.trim() || ''),
      date,
      account,
      sampleId,
      productId: sm?.productId || '',
      qty: Number(qty) || 1,
      remark: remark.trim(),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? '编辑出单' : '记一笔出单'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
        <Field label="账号" required>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
              const sel = account === a
              return (
                <button key={a} onClick={() => onPickAccount(a)} style={{
                  padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
                  border: sel ? 'none' : '1px solid rgba(0,0,0,0.08)',
                  background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                  color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer',
                }}>{a}</button>
              )
            })}
          </div>
        </Field>

        <Field label="关联样品（仅该账号已发布）" required>
          {/* 已选样品展示框（点击展开搜索） */}
          <button type="button" onClick={openSamplePicker} style={{
            width: '100%', minHeight: '44px', padding: '12px 14px',
            border: currentSample ? '1.5px solid #16a34a' : '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: '12px', background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            color: 'var(--text-main)', textAlign: 'left', fontFamily: 'inherit', fontSize: '15px',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSample ? (
                <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {currentSample.name}</span>
              ) : (
                <span style={{ color: 'var(--text-sub)' }}>{account ? '点击搜索并选择样品…' : '请先在上方选择账号'}</span>
              )}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>{sampleOpen ? '▲' : '🔍'}</span>
          </button>

          {/* 搜索面板：内联展开 */}
          {sampleOpen && account && (
            <div style={{ marginTop: '8px', border: '1px solid rgba(244,114,182,0.22)', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '8px', borderBottom: '1px solid rgba(244,114,182,0.10)' }}>
                <input
                  autoFocus
                  placeholder="搜索样品名称…"
                  value={sampleQuery}
                  onChange={(e) => setSampleQuery(e.target.value)}
                  style={{ ...inputStyle, minHeight: '38px', padding: '8px 12px', fontSize: '14px' }}
                />
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
                {searchableSamples.length === 0 ? (
                  <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: '13px', color: 'var(--text-sub)' }}>
                    没有匹配的样品
                  </div>
                ) : (
                  searchableSamples.map((sm) => {
                    const valid = isSelectableForOrder(sm.status) && hasAccount(sm, account)
                    const sel = sm.id === sampleId
                    return (
                      <button key={sm.id} type="button" onClick={() => onPickSample(sm.id)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: sel ? 'rgba(22,163,74,0.10)' : 'transparent',
                        color: 'var(--text-main)', textAlign: 'left', fontFamily: 'inherit', fontSize: '14px',
                      }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sm.name}
                          {!valid && <span style={{ fontSize: '11px', color: '#f59e0b' }}>（当前不可选，原记录保留）</span>}
                        </span>
                        {sel && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>已选 ✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>
            {account ? `已列出「${account}」的已发布样品，可搜索` : '选完账号后即可搜索并选择样品'}
          </div>
        </Field>

        <Field label="出单日期">
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="出单数量" required>
          <input type="number" min="1" style={inputStyle} value={qty} onChange={(e) => setQty(e.target.value)} />
          <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>只记本次出单数量，同一产品会按数量累计</div>
        </Field>

        <Field label="备注（选填）">
          <textarea style={{ ...inputStyle, minHeight: '54px', resize: 'vertical' }} placeholder="平台 / 链接 / 说明" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={onClose}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </Modal>
  )
}
