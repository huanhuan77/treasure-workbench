import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const DATE_OPTS = [
  { offset: 0, label: '今天' },
  { offset: 1, label: '明天' },
  { offset: 2, label: '后天' },
  { offset: 3, label: '3天后' },
  { offset: 7, label: '1周后' },
]
const STATUS_OPTS = [
  { key: 'all', label: '全部' },
  { key: 'unpublished', label: '未发布' },
  { key: 'published', label: '已发布' },
  { key: 'hit', label: '爆单' },
]

// 紧凑样式（旧式精致，不堆空间）
const chipBase = {
  padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
  border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

export function NewPublishPlanPage() {
  const navigate = useNavigate()
  const { samples } = useStore()
  const { show } = useToast()
  const [pubAccount, setPubAccount] = useState('')
  const [pubStatus, setPubStatus] = useState('all')
  const [pubSampleIds, setPubSampleIds] = useState([])
  const [dateOffset, setDateOffset] = useState(1)  // 0=今天, 1=明天, 2=后天, 可调

  const publishDate = fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + dateOffset))
  const accountOptions = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
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
    const arr = data[publishDate] || []
    for (const s of chosen) {
      arr.push({ id: uid(), account: pubAccount, sampleId: s.id, productName: s.name, createdAt: Date.now() })
    }
    data[publishDate] = arr
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('publishPlanUpdated'))
    show(`已记录：${chosen.length} 个样品 → ${pubAccount}`, 'success')
    navigate(-1)
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
          添加发布计划（{getDateLabel(publishDate)}）
        </h1>
      </header>

      <div style={{ padding: '12px 16px', flex: 1 }}>
        {/* 发布时间选择 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布时间</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DATE_OPTS.map((d) => (
              <button key={d.offset} onClick={() => setDateOffset(d.offset)} style={{
                ...chipBase,
                borderColor: dateOffset === d.offset ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                background: dateOffset === d.offset ? 'rgba(244,114,182,0.1)' : '#fff',
                color: dateOffset === d.offset ? 'var(--primary)' : 'var(--text-sub)',
              }}>{d.label}</button>
            ))}
          </div>
        </div>

        {/* 发布账号 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={sectionTitle}>发布账号</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {accountOptions.map((a) => (
              <button key={a} onClick={() => setPubAccount(a)} style={{
                ...chipBase,
                borderColor: pubAccount === a ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                background: pubAccount === a ? 'var(--primary)' : '#fff',
                color: pubAccount === a ? '#fff' : 'var(--text-sub)',
              }}>{a}</button>
            ))}
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

        {/* 选择样品 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>选择样品 {pubAccount && `· ${pubAccount}`}</span>
            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>已选 {pubSampleIds.length}/{accountFiltered.length}</span>
          </div>
          {accountFiltered.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '24px 0', textAlign: 'center', background: 'rgba(255,255,255,0.4)', borderRadius: '10px' }}>
              {pubAccount ? '该账号暂无样品' : '暂无样品'}
            </div>
          ) : (
            <div style={{ maxHeight: '44vh', overflowY: 'auto', borderRadius: '10px', background: 'rgba(255,255,255,0.4)', padding: '4px' }}>
              {accountFiltered.map((s) => {
                const sel = pubSampleIds.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleSample(s.id)} style={{
                    display: 'flex', alignItems: 'center', width: '100%', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px', border: 'none',
                    background: sel ? 'var(--primary)' : 'transparent',
                    color: sel ? '#fff' : 'var(--text-main)',
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}>
                    <span style={{
                      width: '20px', height: '20px', minWidth: '20px', borderRadius: '50%',
                      border: sel ? 'none' : '2px solid #d1d5db',
                      background: sel ? '#fff' : 'transparent',
                      color: 'var(--primary)', fontSize: '13px', fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>{sel ? '✓' : ''}</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: sel ? 600 : 500 }}>{s.name}</span>
                    {s.account && <span style={{ fontSize: '11px', opacity: 0.7 }}>{s.account}</span>}
                  </button>
                )
              })}
            </div>
          )}
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
    </div>
  )
}
