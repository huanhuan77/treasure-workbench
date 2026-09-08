import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ConfirmModal, glassStyle } from '../components/Modal'
import { DRAMA_STATUS } from '../utils/dramaLib'

// 追剧：记录剧名 + 状态（想看/在看/看完/放弃）

// 追剧：极简版，只记录剧名（需要时再加回其他字段）
export function DramaPage() {
  const navigate = useNavigate()
  const { dramas, addDrama, updateDrama, deleteDrama } = useStore()
  const { show } = useToast()

  const [name, setName] = useState('')
  const [delId, setDelId] = useState(null)

  const list = dramas || []

  const handleAdd = () => {
    const n = name.trim()
    if (!n) { show('请输入剧名', 'error'); return }
    if (list.some((d) => (d.name || '').trim() === n)) {
      show('这部剧已经在列表里了', 'error')
      return
    }
    addDrama({ name: n })
    setName('')
    show('已加入追剧', 'success')
  }

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
          width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px',
          cursor: 'pointer', flexShrink: 0,
        }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            追剧
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            共 {list.length} 部 · 想追就记个剧名
          </p>
        </div>
      </header>

      <div style={{ padding: '8px 16px calc(96px + var(--safe-bottom, 0px))' }}>
        {/* 新增区：只填剧名 */}
        <div style={{ ...glassStyle, padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="输入剧名，如：狂飙"
              style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box',
                border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px',
                padding: '12px 14px', fontSize: '15px', color: 'var(--text-main)',
                outline: 'none', background: '#fff',
              }}
            />
            <button onClick={handleAdd} style={{
              flexShrink: 0, padding: '0 20px', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: 600, color: '#fff',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', cursor: 'pointer',
            }}>＋ 加入</button>
          </div>
        </div>

        {/* 列表 */}
        {list.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📺</div>
            <p style={{ fontSize: '14px', margin: 0 }}>还没有追剧记录，先加一部吧</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {list.map((d, i) => (
              <div key={d.id} style={{
                background: '#fff', borderRadius: '12px', padding: '10px 12px',
                border: '1px solid rgba(244,114,182,0.16)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ flexShrink: 0, fontSize: '12px', color: '#c9a3ab', fontWeight: 600, width: '20px' }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <button onClick={() => setDelId(d.id)} style={{
                    flexShrink: 0, border: 'none', background: 'rgba(244,63,94,0.10)', color: '#f43f5e',
                    width: '26px', height: '26px', borderRadius: '50%', fontSize: '14px', lineHeight: 1, cursor: 'pointer',
                  }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', marginLeft: '30px' }}>
                  {DRAMA_STATUS.map((s) => {
                    const active = (d.status || 'want') === s.key
                    return (
                      <button key={s.key} onClick={() => updateDrama(d.id, { status: s.key })} style={{
                        border: 'none', padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
                        color: active ? '#fff' : s.c,
                        background: active ? s.c : s.bg,
                      }}>{s.label}</button>
                    )
                  })}
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
