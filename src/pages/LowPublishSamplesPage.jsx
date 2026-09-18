import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getAccounts, ACCOUNTS, ACCOUNT_COLOR } from '../utils/accounts'
import { SAMPLE_STATUS } from '../utils/sampleStatus'

// 「发布不足 5 条」列表页
// 口径与总览一致：已发布、发布数 < 5、且尚未出单的样品
const LOW_LIMIT = 5

function PageHeader({ title, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: 'calc(12px + var(--safe-top)) 16px 12px',
      borderBottom: '1px solid rgba(236,72,153,0.12)',
      background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 100%)',
      flexShrink: 0,
    }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function LowPublishSamplesPage() {
  const navigate = useNavigate()
  const { samples } = useStore()

  const [accountFilter, setAccountFilter] = useState('all')
  const [keyword, setKeyword] = useState('')
  // 排序：条数少→多（默认，最该补的排前面）/ 多→少 / 名称
  const [sortKey, setSortKey] = useState('countAsc')

  // 基础口径：已发布、未出单、发布数 < 5
  const base = useMemo(
    () => (samples || []).filter(
      (s) => s.status === 'published'
        && (Number(s.publishCount) || 0) < LOW_LIMIT
        && (Number(s.orderCount) || 0) === 0,
    ),
    [samples],
  )

  const list = useMemo(() => {
    let r = base
    if (accountFilter !== 'all') r = r.filter((s) => getAccounts(s).includes(accountFilter))
    const kw = keyword.trim().toLowerCase()
    if (kw) r = r.filter((s) => (s.name || '').toLowerCase().includes(kw))
    const arr = [...r]
    arr.sort((a, b) => {
      if (sortKey === 'countAsc') return (Number(a.publishCount) || 0) - (Number(b.publishCount) || 0)
      if (sortKey === 'countDesc') return (Number(b.publishCount) || 0) - (Number(a.publishCount) || 0)
      return (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN')
    })
    return arr
  }, [base, accountFilter, keyword, sortKey])

  // 顶部统计：发布数分布（0/1/2/3/4 条各几个）
  const dist = useMemo(() => {
    const d = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
    base.forEach((s) => { const n = Number(s.publishCount) || 0; if (d[n] !== undefined) d[n]++ })
    return d
  }, [base])

  const SORTS = [
    { key: 'countAsc', label: '条数少→多' },
    { key: 'countDesc', label: '条数多→少' },
    { key: 'name', label: '名称' },
  ]

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh' }}>
      <PageHeader title={`发布不足 ${LOW_LIMIT} 条（${base.length}）`} onBack={() => navigate(-1)} />

      {/* 筛选区：账号 + 排序 */}
      <div style={{ padding: '10px 16px 6px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {[{ k: 'all', label: '全部账号' }, ...ACCOUNTS.map((a) => ({ k: a, label: a }))].map((o) => {
            const active = accountFilter === o.k
            return (
              <button key={o.k} onClick={() => setAccountFilter(o.k)} style={{
                flex: '0 0 auto', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                border: active ? 'none' : '1px solid rgba(244,114,182,0.3)',
                background: active ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'rgba(255,255,255,0.7)',
                color: active ? '#fff' : 'var(--text-sub)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{o.label}</button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px',
            background: '#fff', borderRadius: '999px', padding: '7px 12px',
            boxShadow: '0 2px 10px rgba(244,114,182,0.06)',
          }}>
            <span style={{ fontSize: '13px', opacity: 0.6, flexShrink: 0 }}>🔍</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索样品名"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '13px', background: 'transparent', color: 'var(--text-main)' }}
            />
            {keyword && (
              <button onClick={() => setKeyword('')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-sub)', padding: 0, flexShrink: 0 }}>✕</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
          {SORTS.map((o) => {
            const active = sortKey === o.key
            return (
              <button key={o.key} onClick={() => setSortKey(o.key)} style={{
                flex: '0 0 auto', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                border: active ? 'none' : '1px solid rgba(244,114,182,0.35)',
                background: active ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                color: active ? '#fff' : 'var(--text-main)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{o.label}</button>
            )
          })}
        </div>
      </div>

      {/* 发布条数分布：让用户一眼看到每个缺口档位有多少产品 */}
      {base.length > 0 && (
        <div style={{ padding: '4px 16px 2px', display: 'flex', gap: '6px', flexShrink: 0 }}>
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} style={{
              flex: '1 1 0', minWidth: 0, textAlign: 'center', padding: '6px 2px',
              background: dist[n] > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.9)', borderRadius: '10px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: 600, whiteSpace: 'nowrap' }}>发{n}条</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: dist[n] > 0 ? 'var(--text-main)' : '#cfc4c8', lineHeight: 1.2 }}>{dist[n]}</div>
            </div>
          ))}
        </div>
      )}

      {/* 列表：底部留出 BottomNav 高度，避免最后几条被遮挡 */}
      <div style={{ padding: '8px 12px calc(80px + var(--safe-bottom, 0px))' }}>
        {list.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '30px 16px', textAlign: 'center', color: '#16a34a', fontSize: '13px' }}>
            {base.length === 0 ? '🎉 所有已发布产品都发满 5 条了' : '没有符合条件的样品'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {list.map((s) => {
              const st = SAMPLE_STATUS[s.status] || SAMPLE_STATUS.published
              const count = Number(s.publishCount) || 0
              return (
                <div key={s.id} style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      已发 {count} 条 · 还差 {LOW_LIMIT - count}
                    </span>
                  </div>

                  {/* 按账号显示各自发布数，不足 5 的标黄 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {getAccounts(s).map((a) => {
                      const ac = (s.countsByAccount && s.countsByAccount[a]?.publishCount) || 0
                      const lack = ac < LOW_LIMIT
                      return (
                        <span key={a} style={{
                          fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap',
                          background: lack ? '#fef3c7' : (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg,
                          color: lack ? '#d97706' : (ACCOUNT_COLOR[a] || { c: '#64748b' }).c,
                        }}>{a}({ac}条)</span>
                      )
                    })}
                    <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', color: st.color, background: st.bg, fontWeight: 600, whiteSpace: 'nowrap', alignSelf: 'center' }}>{st.icon} {st.label}</span>
                  </div>

                  <div style={{ marginTop: '7px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                      flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', background: '#ec4899', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}>📹 补发布</button>
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
