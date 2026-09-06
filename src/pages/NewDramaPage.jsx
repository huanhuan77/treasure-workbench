import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'
import { findDramaExact, searchDramas, lookupDramaOnline } from '../utils/dramaLib'

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function NewDramaPage() {
  const navigate = useNavigate()
  const { addDrama } = useStore()
  const { show } = useToast()

  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [cast, setCast] = useState('')
  const [remark, setRemark] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)
  const [looking, setLooking] = useState(false)
  const lookupSeq = useRef(0)

  const suggestions = useMemo(() => (showSuggest ? searchDramas(name) : []), [showSuggest, name])

  // 输入剧名：内置库精确命中自动带出年份 + 主演；未命中则联网兜底查询
  const handleNameChange = (v) => {
    setName(v)
    setShowSuggest(true)
    const hit = findDramaExact(v)
    if (hit) {
      if (!year) setYear(String(hit.year))
      if (!cast) setCast(hit.cast)
      setLooking(false)
      return
    }
    const q = v.trim()
    if (!q) { setLooking(false); return }
    const seq = ++lookupSeq.current
    setLooking(true)
    lookupDramaOnline(q)
      .then((r) => {
        if (seq !== lookupSeq.current) return
        setLooking(false)
        if (r) {
          setYear((y) => y || r.year)
          setCast((c) => c || r.cast)
        }
      })
      .catch(() => { if (seq === lookupSeq.current) setLooking(false) })
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
    const hit = findDramaExact(n)
    addDrama({
      name: n,
      year: year.trim() || (hit ? String(hit.year) : ''),
      cast: cast.trim() || (hit ? hit.cast : ''),
      remark: remark.trim(),
    })
    show('已加入追剧列表', 'success')
    navigate('/dramas')
  }

  return (
    <div className="app-container">
      <PageHeader title="新增追剧" onBack={() => navigate('/dramas')} />

      <div style={{ padding: '12px 16px 16px' }}>
        <div style={{ ...glassStyle, padding: '14px' }}>
          {/* 剧名 + 联想 */}
          <div style={{ position: 'relative' }}>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setShowSuggest(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="输入剧名，如：狂飙"
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

          {looking && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#db2777', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', border: '2px solid #fbcfe8', borderTopColor: '#ec4899', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              联网查询年份 / 主演中…
            </div>
          )}

          <button onClick={handleAdd}
            style={{
              width: '100%', marginTop: '12px', padding: '13px 0', border: 'none',
              borderRadius: '12px', fontSize: '15px', fontWeight: 600, color: '#fff',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', cursor: 'pointer',
            }}>＋ 加入追剧</button>
        </div>
      </div>
    </div>
  )
}
