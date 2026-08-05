import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'

const PUBLISH_KEY = 'daily_publish_plan_v1'

function getTomorrow() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
}
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

export function NewPublishPlanPage() {
  const navigate = useNavigate()
  const { samples } = useStore()
  const { show } = useToast()
  const [pubAccount, setPubAccount] = useState('')
  const [pubStatus, setPubStatus] = useState('all')
  const [pubSampleId, setPubSampleId] = useState('')
  const [dateOffset, setDateOffset] = useState(1)  // 0=今天, 1=明天, 2=后天, 可调

  const publishDate = fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + dateOffset))
  // 账号固定三个
  const accountOptions = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']  // 固定三个账号
  // 选择来源：样品列表的数据（不是产品库），排除「放弃」，可按 未发布/已发布/爆单 筛选
  const sampleList = (samples || []).filter((s) => s.status !== 'abandoned' && (pubStatus === 'all' || s.status === pubStatus))
  // 选账号后只显示该账号的样品；不选账号显示所有样品
  const accountFiltered = pubAccount
    ? sampleList.filter((s) => !s.account || s.account === pubAccount)
    : sampleList

  const handleAdd = () => {
    if (!pubAccount) { show('请选择账号', 'error'); return }
    if (!pubSampleId) { show('请选择样品', 'error'); return }
    const s = sampleList.find((x) => x.id === pubSampleId)
    if (!s) return
    let data = {}
    try { data = JSON.parse(localStorage.getItem(PUBLISH_KEY) || '{}') } catch { data = {} }
    const item = { id: uid(), account: pubAccount, sampleId: s.id, productName: s.name, createdAt: Date.now() }
    const arr = data[publishDate] || []
    arr.push(item)
    data[publishDate] = arr
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('publishPlanUpdated'))
    show(`已记录：${s.name} → ${pubAccount}`, 'success')
    navigate(-1)
  }

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

      <div style={{ padding: '16px 20px', flex: 1 }}>
        {/* 发布时间选择 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>发布时间</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { offset: 0, label: '今天' },
              { offset: 1, label: '明天' },
              { offset: 2, label: '后天' },
              { offset: 3, label: '3天后' },
              { offset: 7, label: '1周后' },
            ].map((d) => (
              <button key={d.offset} onClick={() => setDateOffset(d.offset)} style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, border: '1.5px solid',
                borderColor: dateOffset === d.offset ? 'var(--primary)' : 'rgba(0,0,0,0.08)',
                background: dateOffset === d.offset ? 'rgba(244,114,182,0.1)' : '#fff',
                color: dateOffset === d.offset ? 'var(--primary)' : 'var(--text-sub)',
                cursor: 'pointer',
              }}>{d.label}</button>
            ))}
          </div>
        </div>

        {/* 发布账号 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>发布账号</div>
          <select value={pubAccount} onChange={(e) => setPubAccount(e.target.value)} style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            border: pubAccount ? '1.5px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.08)',
            fontSize: '15px', outline: 'none', background: '#fff', color: 'var(--text-main)',
            boxSizing: 'border-box',
          }}>
            <option value="" disabled>请选择账号</option>
            {accountOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {accountOptions.length === 0 && (
            <div style={{ fontSize: '12px', color: '#92400e', marginTop: '6px', padding: '8px 12px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px' }}>
              暂无账号，请先在「样品」里给样品填写账号名称
            </div>
          )}
        </div>

        {/* 状态筛选：未发布 / 已发布 / 爆单（放弃的不出现在列表） */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>样品状态（筛选）</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: '全部' },
              { key: 'unpublished', label: '⚪️ 未发布' },
              { key: 'published', label: '🟢 已发布' },
              { key: 'hit', label: '🔥 爆单' },
            ].map((st) => (
              <button key={st.key} onClick={() => { setPubStatus(st.key); setPubSampleId('') }} style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, border: '1.5px solid',
                borderColor: pubStatus === st.key ? 'var(--primary)' : 'rgba(0,0,0,0.08)',
                background: pubStatus === st.key ? 'rgba(244,114,182,0.1)' : '#fff',
                color: pubStatus === st.key ? 'var(--primary)' : 'var(--text-sub)',
                cursor: 'pointer',
              }}>{st.label}</button>
            ))}
          </div>
        </div>

        {/* 选择样品（来自样品列表，按所选账号预过滤） */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>
            {pubAccount ? `选择样品 · ${pubAccount}（共 ${accountFiltered.length} 个）` : `选择样品（共 ${sampleList.length} 个）`}
          </div>
          <select value={pubSampleId} onChange={(e) => setPubSampleId(e.target.value)} multiple style={{
            width: '100%', padding: '12px 14px', borderRadius: '12px',
            border: '1.5px solid rgba(0,0,0,0.08)',
            fontSize: '15px', outline: 'none', background: '#fff', color: 'var(--text-main)',
            boxSizing: 'border-box', height: '260px',
          }}>
            {accountFiltered.length === 0 && <option value="" disabled>{pubAccount ? '该账号暂无样品，请先在样品中绑定账号' : '暂无样品'}</option>}
            {accountFiltered.map((s) => <option key={s.id} value={s.id}>{s.name}{s.account ? `（${s.account}）` : ''}</option>)}
          </select>
        </div>
      </div>

      {/* 底部按钮 */}
      <div style={{ padding: '12px 20px 24px', display: 'flex', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
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
