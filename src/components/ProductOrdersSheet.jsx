import { SwipeRow } from './SwipeRow'

function dispDate(v) {
  if (!v) return '未填日期'
  return String(v).replace(/-/g, '/')
}
const fmtQty = (q) => (q && q > 1 ? `${q}单` : '1单')

/**
 * 出单记录页：点击产品卡弹出的底部详情面板
 * - 展示该产品的出单记录列表（可点开编辑、右滑删除）
 * - 底部「＋ 继续新增一单」：新增时自动带上该产品的账号/样品
 */
export function ProductOrdersSheet({ open, group, onClose, onEdit, onDelete, onAddMore, accMeta }) {
  if (!open || !group) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 70 }} />
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 71,
          background: '#fff', borderRadius: '20px 20px 0 0',
          maxHeight: '74vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* 顶部小横条 */}
        <div style={{ padding: '10px 0 2px', display: 'flex', justifyContent: 'center' }}>
          <span style={{ display: 'block', width: '38px', height: '4px', borderRadius: '999px', background: 'rgba(0,0,0,0.12)' }} />
        </div>

        {/* 头部：品名 + 汇总 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 16px 10px', borderBottom: '1px solid rgba(244,114,182,0.14)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '3px' }}>
              共 {group.count} 笔 · 累计 <b style={{ color: 'var(--primary-dark)' }}>{group.qty}</b> 单
            </div>
            {group.accounts.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                {group.accounts.map((a) => {
                  const c = accMeta(a)
                  return (
                    <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: c.bg, color: c.c, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {a}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
            ✕
          </button>
        </div>

        {/* 记录列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {group.entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-sub)', fontSize: '13px' }}>暂无记录</div>
          ) : (
            group.entries.map((o) => {
              const meta = accMeta(o.account)
              return (
                <SwipeRow key={o.id} onDelete={() => onDelete(o)} radius={10}>
                  <div
                    onClick={() => onEdit(o)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px',
                      background: '#fff', border: '1px solid rgba(244,114,182,0.12)',
                      borderRadius: '10px', cursor: 'pointer',
                    }}
                  >
                    <span style={{ flexShrink: 0, width: '9px', height: '9px', borderRadius: '50%', background: meta.c }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)', flexShrink: 0, minWidth: '52px' }}>{dispDate(o.date)}</span>
                    <span style={{ fontSize: '12px', color: o.account ? meta.c : '#94a3b8', flexShrink: 0 }}>{o.account || '未选账号'}</span>
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.remark || ''}</span>
                    <span style={{ flexShrink: 0, fontSize: '14px', fontWeight: 700, color: 'var(--primary-dark)' }}>+{fmtQty(o.qty)}</span>
                  </div>
                </SwipeRow>
              )
            })
          )}
        </div>

        {/* 底部：继续新增一单 */}
        <div style={{ padding: '10px 16px calc(14px + var(--safe-bottom, 0px))', borderTop: '1px solid rgba(244,114,182,0.14)' }}>
          <button
            onClick={onAddMore}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            ＋ 继续新增一单
          </button>
        </div>
      </div>
    </>
  )
}
