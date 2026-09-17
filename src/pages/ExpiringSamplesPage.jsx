import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getAccounts, ACCOUNT_COLOR } from '../utils/accounts'
import { SAMPLE_STATUS } from '../utils/sampleStatus'

function daysUntil(deadline) {
  if (!deadline) return null
  const t = new Date(deadline)
  if (Number.isNaN(t.getTime())) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((t - today) / 86400000)
}

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(236,72,153,0.12)', background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 100%)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function ExpiringSamplesPage() {
  const navigate = useNavigate()
  const { samples } = useStore()

  // 即将到期：有截止日期、且未发布/未放弃、7 天内到期（含已逾期），按截止日期升序
  const list = (samples || [])
    .filter((s) => {
      if (!s.deadline || s.status === 'published' || s.status === 'abandoned') return false
      const d = daysUntil(s.deadline)
      return d !== null && d <= 7
    })
    .sort((a, b) => (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999))

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh' }}>
      <PageHeader title={`即将到期（${list.length}）`} onBack={() => navigate(-1)} />
      <div style={{ padding: '10px 12px 16px' }}>
        {list.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '30px 16px', textAlign: 'center', color: '#16a34a', fontSize: '13px' }}>
            🎉 近 7 天没有即将到期的样品
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {list.map((s) => {
              const st = SAMPLE_STATUS[s.status] || SAMPLE_STATUS.published
              const du = daysUntil(s.deadline)
              const overdue = du !== null && du < 0
              const text = overdue
                ? `已逾期 ${Math.abs(du)} 天（截止 ${s.deadline}）`
                : du === 0 ? `今天截止（${s.deadline}）` : `剩 ${du} 天（截止 ${s.deadline}）`
              const color = overdue ? '#ef4444' : du <= 3 ? '#ea580c' : '#ca8a04'
              return (
                <div key={s.id} style={{ background: '#fff', border: '1px solid #fecdd3', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', color: st.color, background: st.bg, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '3px' }}>
                    <span style={{ fontSize: '11px', color, fontWeight: 600, lineHeight: 1.4 }}>
                      ⏰ {text}
                    </span>
                    {getAccounts(s).map((a) => (
                      <span key={a} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: '7px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                      flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', background: '#ec4899', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}>📹 补记发布</button>
                    <button onClick={() => navigate(`/samples/${s.id}/edit`)} style={{
                      flex: 1, padding: '7px 0', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', color: 'var(--text-sub)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}>调整状态</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
