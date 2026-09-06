import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ConfirmModal, glassStyle } from '../components/Modal'

const STATUS = {
  want: { label: '想看', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  watching: { label: '在追', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  done: { label: '已看完', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  dropped: { label: '弃剧', color: '#9ca3af', bg: 'rgba(156,163,175,0.14)' },
}
const STATUS_ORDER = ['want', 'watching', 'done', 'dropped']

export function DramaPage() {
  const navigate = useNavigate()
  const { dramas, updateDrama, deleteDrama } = useStore()
  const { show } = useToast()

  const [delId, setDelId] = useState(null)

  const list = dramas || []

  const handleDelete = () => {
    deleteDrama(delId)
    setDelId(null)
    show('已删除', 'success')
  }

  return (
    <div className="app-container">
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 12px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate(-1)} style={{
          border: 'none', background: 'rgba(236,72,153,0.10)', color: 'var(--primary)',
          width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px',
          cursor: 'pointer', flexShrink: 0,
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            追剧
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            在追 {list.filter((d) => d.status === 'watching').length} 部 · 内置剧名库自动带出年份与主演
          </p>
        </div>
        <button onClick={() => navigate('/dramas/new')} style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: '999px', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>＋ 新增追剧</button>
      </header>

      <div style={{ padding: '8px 16px 16px' }}>
        {/* 列表 */}
        {list.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📺</div>
            <p style={{ fontSize: '14px', margin: 0 }}>还没有在追的剧，添加第一部吧</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {list.map((d) => (
              <div key={d.id} style={{
                background: '#fff', borderRadius: '14px', padding: '14px',
                border: '1px solid rgba(244,114,182,0.16)', boxShadow: '0 2px 8px rgba(244,114,182,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    {d.year && <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>{d.year}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 9px', borderRadius: '999px', color: STATUS[d.status]?.color, background: STATUS[d.status]?.bg }}>{STATUS[d.status]?.label}</span>
                    <button onClick={() => setDelId(d.id)} style={{
                      border: 'none', background: 'rgba(244,63,94,0.10)', color: '#f43f5e',
                      width: '22px', height: '22px', borderRadius: '50%', fontSize: '13px', lineHeight: 1, cursor: 'pointer',
                    }}>×</button>
                  </div>
                </div>
                {d.cast && <div style={{ fontSize: '13px', color: '#c9a3ab', marginTop: '6px' }}>主演：{d.cast}</div>}
                {/* 状态切换 */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  {STATUS_ORDER.map((k) => (
                    <button key={k} onClick={() => updateDrama(d.id, { status: k })} style={{
                      padding: '5px 11px', borderRadius: '999px', fontSize: '12px', cursor: 'pointer',
                      border: '1px solid #eee',
                      background: d.status === k ? STATUS[k].bg : 'transparent',
                      color: d.status === k ? STATUS[k].color : '#9ca3af', fontWeight: d.status === k ? 600 : 500,
                    }}>{STATUS[k].label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={handleDelete}
        title="删除追剧"
        message="确定从追剧列表移除吗？"
        confirmText="删除"
        danger
      />
    </div>
  )
}
