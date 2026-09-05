import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../utils/accounts'

const chipBase = {
  padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

export function PublishRecordsPage() {
  const navigate = useNavigate()
  const { publishRecords, samples, deletePublishRecord } = useStore()
  const { show } = useToast()
  const [accFilter, setAccFilter] = useState([])   // 账号多选筛选

  const sampleMap = useMemo(() => Object.fromEntries((samples || []).map((s) => [s.id, s])), [samples])
  const records = useMemo(
    () => [...(publishRecords || [])].sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))),
    [publishRecords],
  )
  const filtered = useMemo(
    () => (accFilter.length ? records.filter((r) => (r.accounts || []).some((a) => accFilter.includes(a))) : records),
    [records, accFilter],
  )

  const toggleAcc = (a) => setAccFilter((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))

  const handleDelete = (r) => {
    if (confirm('删除该发布记录？')) { deletePublishRecord(r.id); show('已删除', 'success') }
  }

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh', color: '#1a1a1a' }}>
      <header style={{ padding: 'calc(18px + var(--safe-top)) 20px 14px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(236,72,153,0.12)' }}>
        <button onClick={() => navigate(-1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111' }}>视频发布记录</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#b3888f' }}>共 {records.length} 条 · 仅关联已拍摄 / 已发布的样品</p>
        </div>
        <button onClick={() => navigate('/publish-record/new')} style={{
          padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#ec4899', color: '#fff',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 记发布</button>
      </header>

      {/* 账号筛选 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 16px 4px' }}>
        <button onClick={() => setAccFilter([])} style={{
          ...chipBase,
          borderColor: accFilter.length === 0 ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: accFilter.length === 0 ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: accFilter.length === 0 ? '#fff' : 'var(--text-sub)',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const sel = accFilter.includes(a)
          const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
          return (
            <button key={a} onClick={() => toggleAcc(a)} style={{
              ...chipBase,
              borderColor: sel ? col.c : 'rgba(0,0,0,0.06)',
              background: sel ? col.bg : '#fff',
              color: sel ? col.c : 'var(--text-main)',
            }}>{a}</button>
          )
        })}
      </div>

      <div style={{ padding: '10px 16px calc(88px + var(--safe-bottom, 0px))' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎬</div>
            <p style={{ fontSize: '14px', margin: 0 }}>暂无发布记录</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((r) => {
              const sm = sampleMap[r.sampleId]
              return (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sm ? sm.name : '（样品已删除）'}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>📅 {r.publishDate}</div>
                    </div>
                    <button onClick={() => handleDelete(r)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecdd3', background: '#fff', color: '#f43f5e', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>删除</button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {(r.accounts && r.accounts.length ? r.accounts : getAccounts(sm || {})).map((a) => (
                      <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
                    ))}
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
