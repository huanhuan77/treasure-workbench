import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

// 归属账号（与样品/新建页保持一致）
const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#c2410c', bg: 'rgba(251,146,60,0.16)' },
  '晚梨不吃梨': { c: '#1d4ed8', bg: 'rgba(59,130,246,0.16)' },
  '努力成为富婆': { c: '#7e22ce', bg: 'rgba(168,85,247,0.16)' },
}

// 兼容多账号样品：老数据只有 account(string)，新数据有 accounts(array)
function getAccounts(s) {
  if (Array.isArray(s?.accounts) && s.accounts.length) return s.accounts
  return s?.account ? [s.account] : []
}

// 样品是否为"出单"状态（爆单 或 已发布·出单）
function isOrdered(s) {
  return s?.status === 'hit' || s?.status === 'published_paid'
}

// 解析样品日期（兼容 YYYY-MM-DD / YYYY/M/D），无效返回 null
function parseDateStr(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

// 出单排序基准：orderDate > deadline > receiveDate；都没填的排最末
function orderTs(s) {
  return parseDateStr(s?.orderDate) ?? parseDateStr(s?.deadline) ?? parseDateStr(s?.receiveDate) ?? null
}

// 显示日期：优先 orderDate，否则回退 deadline/receiveDate
function displayDate(s) {
  if (s?.orderDate) return s.orderDate
  if (s?.deadline) return s.deadline
  if (s?.receiveDate) return s.receiveDate
  return ''
}

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function RecentOrdersPage() {
  const navigate = useNavigate()
  const { samples } = useStore()

  // 每个账号 → 该账号出单的样品，按出单时间倒序
  const groups = useMemo(() => {
    const map = {}
    for (const acc of ACCOUNTS) map[acc] = []
    // 一个样品可能归属多账号，分别进入各组
    for (const s of samples || []) {
      if (!isOrdered(s)) continue
      const accs = getAccounts(s).filter((a) => ACCOUNTS.includes(a))
      if (accs.length === 0) continue
      for (const a of accs) map[a].push(s)
    }
    for (const acc of ACCOUNTS) {
      map[acc].sort((x, y) => {
        const a = orderTs(x), b = orderTs(y)
        if (a !== null && b !== null) return b - a
        if (a === null && b === null) return 0
        return a === null ? 1 : -1  // 无时间的排最后
      })
    }
    return map
  }, [samples])

  const total = (samples || []).filter(isOrdered).length

  return (
    <div className="app-container">
      <PageHeader title="每账号近出单" onBack={() => navigate('/')} />

      <div style={{ padding: '4px 16px 8px' }}>
        <p style={{ margin: '8px 0 12px', fontSize: '13px', color: 'var(--text-sub)' }}>
          共 {total} 个出单样品 · 按出单日期从新到旧排列（未填出单日期的排最后）
        </p>

        {ACCOUNTS.map((acc) => {
          const list = groups[acc] || []
          const color = ACCOUNT_COLOR[acc] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
          return (
            <div key={acc} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, background: color.bg, color: color.c }}>{acc}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{list.length} 个出单</span>
              </div>

              {list.length === 0 ? (
                <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', fontSize: '13px', color: 'var(--text-sub)', textAlign: 'center' }}>暂无出单样品</div>
              ) : (
                <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.55)' }}>
                  {list.map((s, i) => {
                    const hot = s.status === 'hit'
                    return (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/samples/${s.id}/edit`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer',
                          borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.04)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                            {displayDate(s) || '出单时间未知'}
                          </div>
                        </div>
                        <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: hot ? 'rgba(244,63,94,0.13)' : 'rgba(16,185,129,0.13)', color: hot ? '#e11d48' : '#059669' }}>
                          {hot ? '爆单' : '出单'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ padding: '16px', textAlign: 'center' }}>
        <button onClick={() => navigate('/samples')} style={{
          padding: '11px 24px', borderRadius: '999px', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>去样品管理</button>
      </div>
    </div>
  )
}
