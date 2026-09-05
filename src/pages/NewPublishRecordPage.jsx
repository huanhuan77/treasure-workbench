import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, glassStyle } from '../components/Modal'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../utils/accounts'
import { isSelectableForPublish } from '../utils/publish'

function getDateLabel(dateStr) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}

const chipBase = {
  padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
  border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
}
const fieldBox = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', padding: '13px 14px', borderRadius: '10px',
  background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
  fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', boxSizing: 'border-box',
}

export function NewPublishRecordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { samples, addPublishRecord } = useStore()
  const { show } = useToast()

  const init = location.state || {}
  const initSample = init.sampleId || ''
  const initAccounts = Array.isArray(init.accounts) && init.accounts.length ? init.accounts : []

  const [publishDate, setPublishDate] = useState(() => init.publishDate || new Date().toISOString().slice(0, 10))
  const [accounts, setAccounts] = useState(initAccounts)        // 发布账号：多选
  const [sampleId, setSampleId] = useState(initSample)
  const [qty, setQty] = useState('1')                           // 发布数量（≥1）
  const [showSamples, setShowSamples] = useState(false)

  // 可选样品：仅「已拍摄 / 已发布」状态（与发布记录板块对齐）
  const sampleList = useMemo(
    () => (samples || []).filter((s) => isSelectableForPublish(s.status)),
    [samples],
  )
  const chosen = sampleList.find((s) => s.id === sampleId) || null

  const toggleAccount = (a) =>
    setAccounts((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))

  const handleSave = () => {
    if (accounts.length === 0) { show('请选择至少一个发布账号', 'error'); return }
    if (!sampleId) { show('请选择关联样品', 'error'); return }
    addPublishRecord({
      sampleId,
      productId: chosen?.productId || '',
      accounts: [...accounts],
      publishDate,
      qty: Math.max(1, Number(qty) || 1),
    })
    show('已记录发布', 'success')
    navigate(-1)
  }

  const sectionTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          记视频发布{getDateLabel(publishDate) ? `（${getDateLabel(publishDate)}）` : ''}
        </h1>
      </header>

      <div style={{ padding: '12px 16px', flex: 1 }}>
        {/* 发布时间：可填过去日期（补记） */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布时间</div>
          <input
            type="date"
            value={publishDate}
            onChange={(e) => { if (e.target.value) setPublishDate(e.target.value) }}
            style={fieldBox}
          />
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{getDateLabel(publishDate)}</div>
        </div>

        {/* 发布账号：多选 chips */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布账号（可多选，自动归属到所选账号下）</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
              const selected = accounts.includes(a)
              const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
              return (
                <button key={a} onClick={() => toggleAccount(a)} style={{
                  ...chipBase,
                  minWidth: '92px',
                  borderColor: selected ? col.c : 'rgba(0,0,0,0.06)',
                  background: selected ? col.bg : '#fff',
                  color: selected ? col.c : 'var(--text-main)',
                  boxShadow: selected ? `0 4px 14px ${col.c}26` : 'none',
                }}>{a}{selected && <span style={{ color: col.c, fontSize: '12px', fontWeight: 700 }}>✓</span>}</button>
              )
            })}
          </div>
        </div>

        {/* 关联样品：仅已拍摄/已发布 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>关联样品（仅已拍摄 / 已发布可选）</div>
          <div style={fieldBox} onClick={() => setShowSamples(true)}>
            <span style={{ color: chosen ? 'var(--text-main)' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {chosen ? (
                <>
                  <span>{chosen.name}</span>
                  {getAccounts(chosen).map((a) => (
                    <span key={a} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600 }}>{a}</span>
                  ))}
                </>
              ) : '点击选择样品'}
            </span>
            <span style={{ color: '#c4c9d0', fontSize: '13px' }}>▾</span>
          </div>
        </div>

        {/* 发布数量 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={sectionTitle}>发布数量（一次记多条视频时填写实际条数）</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" onClick={() => setQty((v) => String(Math.max(1, (Number(v) || 1) - 1)))} style={{
              width: '38px', height: '38px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.08)',
              background: '#fff', fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', flexShrink: 0,
            }}>−</button>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                if (Number.isNaN(n) || n < 1) setQty('')
                else setQty(String(n))
              }}
              onBlur={() => setQty((v) => (Number(v) >= 1 ? v : '1'))}
              style={{ ...fieldBox, flex: 1, textAlign: 'center', fontWeight: 700 }}
            />
            <button type="button" onClick={() => setQty((v) => String((Number(v) || 1) + 1))} style={{
              width: '38px', height: '38px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.08)',
              background: '#fff', fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', flexShrink: 0,
            }}>＋</button>
            <span style={{ fontSize: '12px', color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>条视频</span>
          </div>
        </div>
      </div>

      {/* 底部保存 */}
      <div style={{ padding: '12px 16px 24px', display: 'flex', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{
          flex: 1, padding: '14px 0', borderRadius: '12px',
          border: '1.5px solid rgba(0,0,0,0.1)', background: '#f9fafb',
          color: 'var(--text-sub)', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
        }}>取消</button>
        <button onClick={handleSave} style={{
          flex: 2, padding: '14px 0', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
        }}>保存发布记录</button>
      </div>

      {/* 样品选择弹层（仅已拍摄/已发布） */}
      <Modal open={showSamples} onClose={() => setShowSamples(false)} title="选择样品">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '60vh', overflowY: 'auto' }}>
          {sampleList.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>暂无可发布的样品（需已拍摄或已发布）</div>
          ) : (
            sampleList.map((s) => {
              const sel = s.id === sampleId
              return (
                <button key={s.id} onClick={() => { setSampleId(s.id); setShowSamples(false) }} style={{
                  display: 'flex', alignItems: 'center', width: '100%', gap: '10px',
                  padding: '11px 6px', borderRadius: '8px', border: 'none',
                  background: sel ? 'rgba(244,114,182,0.1)' : 'transparent', color: 'var(--text-main)',
                  textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <span style={{
                    width: '22px', height: '22px', minWidth: '22px', borderRadius: '6px',
                    border: sel ? 'none' : '2px solid #d1d5db',
                    background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
                    color: '#fff', fontSize: '14px', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{sel ? '✓' : ''}</span>
                  <span style={{ flex: 1, fontSize: '15px', fontWeight: sel ? 600 : 500 }}>{s.name}</span>
                  {getAccounts(s).map((a) => <span key={a} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '5px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600 }}>{a}</span>)}
                </button>
              )
            })
          )}
        </div>
      </Modal>
    </div>
  )
}
