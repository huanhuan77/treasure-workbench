import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ConfirmModal, glassStyle } from '../components/Modal'
import { DRAMA_LIB, findDramaExact, searchDramas } from '../utils/dramaLib'

const STATUS = {
  watching: { label: '在追', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  done: { label: '已看完', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  dropped: { label: '弃剧', color: '#9ca3af', bg: 'rgba(156,163,175,0.14)' },
}
const STATUS_ORDER = ['watching', 'done', 'dropped']

export function DramaPage() {
  const navigate = useNavigate()
  const { dramas, addDrama, updateDrama, deleteDrama } = useStore()
  const { show } = useToast()

  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [cast, setCast] = useState('')
  const [status, setStatus] = useState('watching')
  const [remark, setRemark] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)
  const [delId, setDelId] = useState(null)

  const list = dramas || []

  // 实时联想：输入时匹配剧名库
  const suggestions = useMemo(() => (showSuggest ? searchDramas(name) : []), [showSuggest, name])

  // 输入剧名：精确命中自动带出年份 + 主演
  const handleNameChange = (v) => {
    setName(v)
    setShowSuggest(true)
    const hit = findDramaExact(v)
    if (hit) {
      if (!year) setYear(String(hit.year))
      if (!cast) setCast(hit.cast)
    }
  }

  const pick = (d) => {
    setName(d.name)
    setYear(String(d.year))
    setCast(d.cast)
    setShowSuggest(false)
  }

  const handleAdd = () => {
    const n = name.trim()
    if (!n) {
      show('请输入在追的剧名', 'error')
      return
    }
    // 提交时再尝试用剧名库补全年份 / 主演（用户没手填的情况下）
    const hit = findDramaExact(n)
    addDrama({
      name: n,
      year: year.trim() || (hit ? String(hit.year) : ''),
      cast: cast.trim() || (hit ? hit.cast : ''),
      status,
      remark: remark.trim(),
    })
    setName(''); setYear(''); setCast(''); setRemark(''); setStatus('watching'); setShowSuggest(false)
    show('已加入追剧列表', 'success')
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
          width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px',
          cursor: 'pointer', flexShrink: 0,
        }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            追剧
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            在追 {list.filter((d) => d.status === 'watching').length} 部 · 内置剧名库自动带出年份与主演
          </p>
        </div>
      </header>

      <div style={{ padding: '8px 16px 16px' }}>
        {/* 新增区 */}
        <div style={{ ...glassStyle, padding: '14px', marginBottom: '16px' }}>
          {/* 剧名 + 联想 */}
          <div style={{ position: 'relative' }}>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setShowSuggest(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="输入在追的剧名，如：狂飙"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px',
                padding: '11px 14px', fontSize: '15px', color: 'var(--text-main)',
                outline: 'none', background: '#fff',
              }}
            />
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                background: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.06)', maxHeight: '220px', overflowY: 'auto',
              }}>
                {suggestions.map((d) => (
                  <button key={d.name} onClick={() => pick(d)} style={{
                    width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                    padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: '10px',
                    alignItems: 'center', borderBottom: '1px solid #f3f4f6', fontSize: '14px',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.name}</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{d.year}</span>
                    <span style={{ fontSize: '12px', color: '#c9a3ab', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>{d.cast}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 年份 + 主演 */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              placeholder="年份"
              inputMode="numeric"
              style={{
                width: '96px', flexShrink: 0, boxSizing: 'border-box',
                border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px',
                padding: '11px 14px', fontSize: '15px', color: 'var(--text-main)',
                outline: 'none', background: '#fff',
              }}
            />
            <input
              value={cast}
              onChange={(e) => setCast(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="主演（可自动带出）"
              style={{
                flex: 1, boxSizing: 'border-box',
                border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px',
                padding: '11px 14px', fontSize: '15px', color: 'var(--text-main)',
                outline: 'none', background: '#fff',
              }}
            />
          </div>

          {/* 状态 */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {STATUS_ORDER.map((k) => (
              <button key={k} onClick={() => setStatus(k)} style={{
                padding: '7px 14px', borderRadius: '999px', fontSize: '13px', cursor: 'pointer',
                border: `1px solid ${STATUS[k].color}`,
                background: status === k ? STATUS[k].bg : 'transparent',
                color: STATUS[k].color, fontWeight: status === k ? 600 : 500,
              }}>{STATUS[k].label}</button>
            ))}
          </div>

          <button onClick={handleAdd}
            style={{
              width: '100%', marginTop: '12px', padding: '13px 0', border: 'none',
              borderRadius: '12px', fontSize: '15px', fontWeight: 600, color: '#fff',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', cursor: 'pointer',
            }}>＋ 加入追剧</button>
        </div>

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
