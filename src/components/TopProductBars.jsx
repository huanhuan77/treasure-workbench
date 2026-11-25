// 出单 Top N 产品：横向柱状条（PC 与手机端共用，样式一致）
// 一条产品一行：产品名 + 按账号分段的堆叠条 + 合计件数；鼠标悬停看每段是哪个号
import { ACCOUNT_COLOR } from '../utils/accounts'

export function TopProductBars({ rows = [], mask = (a) => a, max = 1, nameWidth = 118, barHeight = 16 }) {
  if (!rows.length) {
    return <div style={{ padding: '12px 4px', fontSize: 12, color: '#9aa0a9' }}>这个区间没有出单</div>
  }
  const denom = Math.max(1, max)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            title={r.name}
            style={{
              width: nameWidth, flexShrink: 0, fontSize: 11, color: '#4b5563',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >{r.name}</div>
          <div
            style={{
              flex: 1, minWidth: 0, height: barHeight, display: 'flex',
              borderRadius: 4, overflow: 'hidden', background: 'rgba(15,23,42,0.045)',
            }}
          >
            {r.parts.map((p) => {
              const col = ACCOUNT_COLOR[p.account] || {}
              const pct = (p.qty / denom) * 100
              if (p.qty <= 0) return null
              return (
                <div
                  key={p.account}
                  title={`${p.account}：${p.qty} 件`}
                  style={{
                    width: `${pct}%`, background: col.c || '#8a8f98', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 10, fontWeight: 600, overflow: 'hidden',
                  }}
                >{pct >= 9 ? p.qty : ''}</div>
              )
            })}
          </div>
          <div style={{ width: 46, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#333a45' }}>
            {r.total}
          </div>
        </div>
      ))}
      {/* 颜色说明：哪段是哪个号 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 2 }}>
        {[...new Set(rows.flatMap((r) => r.parts.filter((p) => p.qty > 0).map((p) => p.account)))].map((a) => {
          const col = ACCOUNT_COLOR[a] || {}
          return (
            <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6b7280' }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: col.c || '#8a8f98' }} />
              {mask(a)}
            </span>
          )
        })}
      </div>
    </div>
  )
}
