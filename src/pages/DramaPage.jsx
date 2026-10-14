import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ConfirmModal, glassStyle } from '../components/Modal'
import { DRAMA_STATUS } from '../utils/dramaLib'

// 追剧：记录剧名 + 类型（电视剧/综艺）+ 状态（想看/在看/看完/放弃）

export function DramaPage() {
  const navigate = useNavigate()
  const { dramas, addDrama, updateDrama, deleteDrama } = useStore()
  const { show } = useToast()

  const [name, setName] = useState('')
  const [delId, setDelId] = useState(null)
  const [typeTab, setTypeTab] = useState('tv') // tv | variety
  const [statusTab, setStatusTab] = useState('all') // all | want | watching | done | dropped
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  const list = dramas || []
  // 旧数据没有 type 字段，默认归为电视剧
  const typedList = list.map((d) => ({ ...d, type: d.type || 'tv', status: d.status || 'want' }))
  const byType = typedList.filter((d) => d.type === typeTab)
  const filtered = statusTab === 'all' ? byType : byType.filter((d) => d.status === statusTab)
  const tvCount = typedList.filter((d) => (d.type || 'tv') === 'tv').length
  const varietyCount = typedList.filter((d) => d.type === 'variety').length
  const statusCount = (s) => byType.filter((d) => d.status === s).length

  const handleAdd = () => {
    const n = name.trim()
    if (!n) { show('请输入名称', 'error'); return }
    if (typedList.some((d) => (d.name || '').trim() === n)) {
      show('这部已经在列表里了', 'error')
      return
    }
    addDrama({ name: n, type: typeTab })
    setName('')
    show('已加入', 'success')
  }

  const handleDelete = () => {
    deleteDrama(delId)
    setDelId(null)
    show('已删除', 'success')
  }

  const startEdit = (d) => {
    setEditId(d.id)
    setEditName(d.name)
  }

  const saveEdit = () => {
    const n = editName.trim()
    if (!n) { show('名称不能为空', 'error'); return }
    updateDrama(editId, { name: n })
    setEditId(null)
    show('已修改', 'success')
  }

  const tabBtn = (active) => ({
    flex: 1, border: 'none', padding: '10px 0', borderRadius: '12px',
    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    color: active ? '#fff' : '#888',
    background: active ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'rgba(0,0,0,0.04)',
  })

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
            共 {list.length} 部
          </p>
        </div>
      </header>

      <div style={{ padding: '8px 16px calc(96px + var(--safe-bottom, 0px))' }}>
        {/* 类型 Tab */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button onClick={() => setTypeTab('tv')} style={tabBtn(typeTab === 'tv')}>
            📺 电视剧 ({tvCount})
          </button>
          <button onClick={() => setTypeTab('variety')} style={tabBtn(typeTab === 'variety')}>
            🎬 综艺 ({varietyCount})
          </button>
        </div>

        {/* 状态筛选 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {[{ key: 'all', label: '全部', c: '#666' }, ...DRAMA_STATUS].map((s) => {
            const active = statusTab === s.key
            const cnt = s.key === 'all' ? byType.length : statusCount(s.key)
            return (
              <button key={s.key} onClick={() => setStatusTab(s.key)} style={{
                border: 'none', padding: '5px 12px', borderRadius: '999px', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer',
                color: active ? '#fff' : s.c || '#888',
                background: active ? (s.c || '#666') : (s.bg || 'rgba(0,0,0,0.05)'),
              }}>{s.label} {cnt > 0 && `(${cnt})`}</button>
            )
          })}
        </div>

        {/* 新增区 */}
        <div style={{ ...glassStyle, padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder={typeTab === 'tv' ? '输入剧名，如：狂飙' : '输入综艺名，如：奔跑吧'}
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
        {filtered.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>{typeTab === 'tv' ? '📺' : '🎬'}</div>
            <p style={{ fontSize: '14px', margin: 0 }}>还没有{typeTab === 'tv' ? '电视剧' : '综艺'}，先加一个吧</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((d, i) => (
              <div key={d.id} style={{
                background: '#fff', borderRadius: '12px', padding: '10px 12px',
                border: '1px solid rgba(244,114,182,0.16)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ flexShrink: 0, fontSize: '12px', color: '#c9a3ab', fontWeight: 600, width: '20px' }}>{i + 1}</span>
                  {editId === d.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }}
                      style={{
                        flex: 1, minWidth: 0, boxSizing: 'border-box',
                        border: '1px solid #ec4899', borderRadius: '8px',
                        padding: '4px 10px', fontSize: '15px', color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <span style={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  )}
                  {editId === d.id ? (
                    <>
                      <button onClick={saveEdit} style={{
                        flexShrink: 0, border: 'none', background: '#ec4899', color: '#fff',
                        width: '28px', height: '28px', borderRadius: '50%', fontSize: '13px', cursor: 'pointer',
                      }}>✓</button>
                      <button onClick={() => setEditId(null)} style={{
                        flexShrink: 0, border: 'none', background: 'rgba(0,0,0,0.06)', color: '#888',
                        width: '28px', height: '28px', borderRadius: '50%', fontSize: '13px', cursor: 'pointer',
                      }}>✕</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(d)} style={{
                        flexShrink: 0, border: 'none', background: 'rgba(99,102,241,0.10)', color: '#6366f1',
                        width: '26px', height: '26px', borderRadius: '50%', fontSize: '12px', cursor: 'pointer',
                      }}>✏️</button>
                      <button onClick={() => setDelId(d.id)} style={{
                        flexShrink: 0, border: 'none', background: 'rgba(244,63,94,0.10)', color: '#f43f5e',
                        width: '26px', height: '26px', borderRadius: '50%', fontSize: '14px', lineHeight: 1, cursor: 'pointer',
                      }}>×</button>
                    </>
                  )}
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
