// 「已建计划」灰色小标 + 悬停竖向明细卡（用户要求「悬停里面的样式布局竖向排列」）。
// 明细一行一条：账号（带主题色圆点）/ 发布日期 / ×数量，按发布日期升序 + 账号固定顺序排。
// 用 fixed + portal 渲染，避免被表格或卡片的 overflow 裁掉。
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ACCOUNTS, ACCOUNT_COLOR } from '../utils/accounts'

const accRank = (a) => { const i = ACCOUNTS.indexOf(a); return i === -1 ? 999 : i }

export default function PlanBadge({ plans, style }) {
  const list = plans || []
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  if (list.length === 0) return null

  const ordered = [...list].sort((x, y) => {
    const dx = x.planDate || '', dy = y.planDate || ''
    if (dx && dy && dx !== dy) return dx < dy ? -1 : 1
    if (!dx && dy) return 1
    if (dx && !dy) return -1
    return accRank(x.account) - accRank(y.account)
  })

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-block', ...(style || {}) }}
      onMouseEnter={() => {
        const r = ref.current && ref.current.getBoundingClientRect()
        if (r) setPos({ top: r.bottom + 6, left: r.left })
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span
        style={{
          display: 'inline-block', fontSize: 10, fontWeight: 700, lineHeight: '16px',
          padding: '0 6px', borderRadius: 999, cursor: 'default',
          background: '#f3f4f6', color: '#6b7280',
          border: '1px solid rgba(107,114,128,0.35)',
          whiteSpace: 'nowrap',
        }}
      >已建计划</span>
      {pos && createPortal(
        <div
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            background: '#fff', border: '1px solid #ece3e6', borderRadius: 10,
            boxShadow: '0 10px 28px rgba(31,27,45,0.14)',
            padding: '8px 12px', minWidth: 176, pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa1ab', marginBottom: 4 }}>已在发布计划</div>
          {ordered.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 12, color: '#4b5563', lineHeight: 1.9, whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: (ACCOUNT_COLOR[p.account] || {}).c || '#c9cdd4' }} />
              <span style={{ fontWeight: 600 }}>{p.account || '未指定'}</span>
              <span style={{ color: '#9aa1ab' }}>{p.planDate || '未填日期'}</span>
              <span style={{ marginLeft: 'auto', paddingLeft: 14, fontWeight: 700, color: '#6b7280' }}>×{p.qty}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </span>
  )
}
