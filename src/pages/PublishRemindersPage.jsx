import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { needPublishReminder, daysSincePublish } from '../utils/publish'
import { getAccounts } from '../utils/accounts'
import { SAMPLE_STATUS } from '../utils/sampleStatus'

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(236,72,153,0.12)', background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 100%)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function PublishRemindersPage() {
  const navigate = useNavigate()
  const { samples } = useStore()
  const list = (samples || []).filter((s) => needPublishReminder(s))

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh' }}>
      <PageHeader title={`发布提醒（${list.length}）`} onBack={() => navigate(-1)} />
      <div style={{ padding: '16px' }}>
        {list.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#16a34a', fontSize: '14px' }}>
            🎉 没有需要提醒的样品，都已按时发了视频
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {list.map((s) => {
              const st = SAMPLE_STATUS[s.status] || SAMPLE_STATUS.published
              const days = daysSincePublish(s)
              return (
                <div key={s.id} style={{ background: '#fff', border: '1px solid #fecdd3', borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', color: st.color, background: st.bg, fontWeight: 600, flexShrink: 0 }}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px', fontWeight: 600 }}>
                    ⚠ {days === Infinity ? '从未发布视频' : `已 ${days} 天未发`}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                      flex: 1, padding: '11px 0', borderRadius: '10px', border: 'none', background: '#ec4899', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    }}>📹 补记发布</button>
                    <button onClick={() => navigate(`/samples/${s.id}/edit`)} style={{
                      flex: 1, padding: '11px 0', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', color: 'var(--text-sub)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
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
