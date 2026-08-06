import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Popup } from 'antd-mobile'
import { useStore } from '../store'
import { useToast } from '../components/Toast'

const PUBLISH_KEY = 'daily_publish_plan_v1'

function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function getDateLabel(dateStr) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const STATUS_OPTS = [
  { key: 'all', label: '全部' },
  { key: 'unpublished', label: '未发布' },
  { key: 'published', label: '已发布' },
  { key: 'hit', label: '爆单' },
]
const ACCOUNT_OPTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']

const chipBase = {
  padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
  border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const fieldBox = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', padding: '13px 14px', borderRadius: '10px',
  background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
  fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', boxSizing: 'border-box',
}

export function NewPublishPlanPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { samples } = useStore()
  const { show } = useToast()
  // 默认从发布计划视图选中的日期跳转过来；若没有则默认明天
  const initDateStr = location.state?.publishDate
  const [publishDate, setPublishDate] = useState(() => {
    if (initDateStr) return new Date(initDateStr)
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  })
  const [pubAccount, setPubAccount] = useState(location.state?.account || '')
  const [pubStatus, setPubStatus] = useState('all')
  const [pubSampleIds, setPubSampleIds] = useState([])
  const [showSamples, setShowSamples] = useState(false)

  const publishDateStr = fmtDate(publishDate)
  const sampleList = (samples || []).filter((s) => s.status !== 'abandoned' && (pubStatus === 'all' || s.status === pubStatus))
  const accountFiltered = pubAccount
    ? sampleList.filter((s) => s.account === pubAccount)
    : sampleList

  const handleAdd = () => {
    if (!pubAccount) { show('请选择账号', 'error'); return }
    if (pubSampleIds.length === 0) { show('请选择样品', 'error'); return }
    const chosen = sampleList.filter((x) => pubSampleIds.includes(x.id))
    if (chosen.length === 0) return
    let data = {}
    try { data = JSON.parse(localStorage.getItem(PUBLISH_KEY) || '{}') } catch { data = {} }
    const arr = data[publishDateStr] || []
    for (const s of chosen) {
      arr.push({ id: uid(), account: pubAccount, sampleId: s.id, productName: s.name, createdAt: Date.now() })
    }
    data[publishDateStr] = arr
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('publishPlanUpdated'))
    // 通知 DailyPlanPage 跳转到对应日期视图
    navigate(-1)
    show(`已记录：${chosen.length} 个样品 → ${pubAccount}`, 'success')
  }

  const toggleSample = (id) => {
    setPubSampleIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
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
          添加发布计划（{getDateLabel(publishDateStr)}）
        </h1>
      </header>

      <div style={{ padding: '12px 16px', flex: 1 }}>
        {/* 发布时间：原生 input type=date（浏览器自带日期选择器，最稳定） */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布时间</div>
          <input
            type="date"
            value={publishDateStr}
            min="2000-01-01"
            max="2099-12-31"
            onChange={(e) => { if (e.target.value) setPublishDate(new Date(e.target.value)) }}
            style={{
              width: '100%', padding: '13px 14px', borderRadius: '10px',
              background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
              fontSize: '15px', color: 'var(--text-main)', boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{getDateLabel(publishDateStr)}</div>
        </div>

        {/* 发布账号：圆角按钮 chips */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布账号</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACCOUNT_OPTS.map((a) => {
              const selected = pubAccount === a
              return (
                <button key={a} onClick={() => setPubAccount(a)} style={{
                  ...chipBase,
                  minWidth: '96px',
                  padding: '10px 14px',
                  borderColor: selected ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                  background: selected
                    ? 'linear-gradient(135deg, #f472b6, #ec4899)'
                    : '#fff',
                  color: selected ? '#fff' : 'var(--text-main)',
                  boxShadow: selected ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
                }}>{a}</button>
              )
            })}
          </div>
        </div>

        {/* 状态筛选 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>样品状态</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STATUS_OPTS.map((st) => (
              <button key={st.key} onClick={() => { setPubStatus(st.key); setPubSampleIds([]) }} style={{
                ...chipBase,
                borderColor: pubStatus === st.key ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                background: pubStatus === st.key ? 'var(--primary)' : '#fff',
                color: pubStatus === st.key ? '#fff' : 'var(--text-sub)',
              }}>{st.label}</button>
            ))}
          </div>
        </div>

        {/* 选择样品：antd Popup 底部多选 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={sectionTitle}>选择样品 {pubAccount && `· ${pubAccount}`}</div>
          <div style={fieldBox} onClick={() => setShowSamples(true)}>
            <span style={{ color: pubSampleIds.length ? 'var(--text-main)' : '#9ca3af' }}>
              {pubSampleIds.length ? `已选 ${pubSampleIds.length} 个样品` : '点击选择样品'}
            </span>
            <span style={{ color: '#c4c9d0', fontSize: '13px' }}>▾</span>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div style={{ padding: '12px 16px 24px', display: 'flex', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{
          flex: 1, padding: '14px 0', borderRadius: '12px',
          border: '1.5px solid rgba(0,0,0,0.1)', background: '#f9fafb',
          color: 'var(--text-sub)', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
        }}>取消</button>
        <button onClick={handleAdd} style={{
          flex: 2, padding: '14px 0', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
        }}>添加</button>
      </div>

      {/* 样品多选弹层 */}
      <Popup
        visible={showSamples}
        onMaskClick={() => setShowSamples(false)}
        onClose={() => setShowSamples(false)}
        bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              选择样品 {pubAccount ? `· ${pubAccount}` : ''}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>已选 {pubSampleIds.length}</span>
          </div>
          {accountFiltered.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>
              {pubAccount ? '该账号暂无样品' : '暂无样品'}
            </div>
          ) : (
            <>
              {accountFiltered.map((s) => {
                const sel = pubSampleIds.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleSample(s.id)} style={{
                    display: 'flex', alignItems: 'center', width: '100%', gap: '10px',
                    padding: '11px 6px', borderRadius: '8px', border: 'none',
                    background: 'transparent', color: 'var(--text-main)',
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
                    {s.account && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{s.account}</span>}
                  </button>
                )
              })}
            </>
          )}
          <button onClick={() => setShowSamples(false)} style={{
            width: '100%', marginTop: '14px', padding: '13px 0', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
            fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          }}>完成</button>
        </div>
      </Popup>
    </div>
  )
}