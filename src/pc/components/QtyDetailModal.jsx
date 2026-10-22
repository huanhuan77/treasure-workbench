// 出单数量明细弹窗（用户要求「加个下划线证明可以点击，点击了弹出弹窗」）
// 三个页面（提醒中心 / 出单记录 / 样品列表）共用：
//   title    弹窗标题（产品名 / 样品名）
//   total    合计件数
//   count    出单笔数
//   accounts [{ name, color, qty }] 按账号汇总
//   lines    [string] 每笔明细（账号 日期 ×数量，已按日期倒序）
import { useEffect } from 'react'

export default function QtyDetailModal({ title, total, count, accounts, lines, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(31,27,45,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: '16px 18px',
          width: 340, maxHeight: '72vh', overflowY: 'auto',
          boxShadow: '0 18px 50px rgba(31,27,45,0.25)',
        }}
      >
        {/* 标题 + 关闭 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
          <strong style={{ fontSize: 14, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </strong>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, color: '#9aa1ab', lineHeight: 1, flexShrink: 0 }}
          >✕</button>
        </div>

        {/* 合计 */}
        <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12 }}>
          合计 <b style={{ color: '#b8517f', fontSize: 15 }}>{total}</b> 件 · {count} 笔
        </div>

        {/* 按账号汇总 */}
        {(accounts || []).map((a) => (
          <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, lineHeight: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: a.color }} />
            <span style={{ color: '#4b5563' }}>{a.name}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#b8517f' }}>{a.qty}</span>
          </div>
        ))}

        {/* 每笔明细 */}
        {(lines || []).length > 0 && (
          <>
            <div style={{ borderTop: '1px solid #f0e9ef', margin: '10px 0 8px' }} />
            <div style={{ fontSize: 11, color: '#a0a6b0', marginBottom: 4 }}>每笔明细</div>
            {(lines || []).map((t, i) => (
              <div key={i} style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.9, whiteSpace: 'nowrap' }}>{t}</div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
