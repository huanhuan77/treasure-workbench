import { useMemo } from 'react'
import { SwipeRow } from './SwipeRow'

function dispDate(v) {
  if (!v) return '未填日期'
  return String(v).replace(/-/g, '/')
}
const fmtQty = (q) => (q && q > 1 ? `${q}单` : '1单')

/**
 * 出单记录页：点击产品卡弹出的底部详情面板
 * - 展示该产品的出单记录列表（可点开编辑、右滑删除）
 * - 顶部按日期分组：每个日期右侧「×」= 删除该天全部出单（onDeleteDate(date, entries)）
 * - 底部「＋ 继续新增一单」：新增时自动带上该产品的账号/样品
 */
export function ProductOrdersSheet({ open, group, onClose, onEdit, onDelete, onDeleteDate, onAddMore, accMeta }) {
  // 按日期分组（无日期的归为 '' 一组），日期倒序；同一天内保持原有顺序
  const byDate = useMemo(() => {
    if (!group) return []
    const map = new Map()
    for (const o of group.entries) {
      const k = o.date || ''
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(o)
    }
    return [...map.entries()]
      .map(([date, entries]) => ({
        date,
        entries,
        qty: entries.reduce((s, e) => s + (Number(e.qty) || 0), 0),
      }))
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
  }, [group])

  if (!open || !group) return null

  // 某天右侧的删除按钮（只删这一天的出单记录）
  const dateDelBtn = (date, entries, big) => (
    <button
      onClick={(e) => { e.stopPropagation(); onDeleteDate && onDeleteDate(date, entries) }}
      aria-label={date ? `删除 ${date} 的出单记录` : '删除未填日期的出单记录'}
      title={date ? `删除 ${dispDate(date)} 的记录` : '删除未填日期的记录'}
      style={{
        flexShrink: 0, padding: 0, cursor: 'pointer', lineHeight: 1,
        width: big ? '22px' : '20px', height: big ? '22px' : '20px',
        borderRadius: '50%', border: 'none',
        background: 'rgba(244,63,94,0.12)', color: '#f43f5e',
        fontSize: big ? '14px' : '13px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >×</button>
  )

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

        {/* 记录列表：按日期分组，每组标题右侧可「删除该天全部」 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {group.entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-sub)', fontSize: '13px' }}>暂无记录</div>
          ) : (
            byDate.map(({ date, entries, qty }) => (
              <div key={date || '__nodate__'}>
                {/* 日期分组头 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '0 2px 6px',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                    📅 {dispDate(date)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {entries.length} 笔 · {qty} 单
                  </span>
                  <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    {dateDelBtn(date, entries, true)}
                  </span>
                </div>
                {/* 该天记录 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {entries.map((o) => {
                    const meta = accMeta(o.account)
                    return (
                      <SwipeRow key={o.id} onDelete={() => onDelete(o)} radius={10}>
                        <div
                          style={{
                            position: 'relative',
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 38px 10px 10px',
                            background: '#fff', border: '1px solid rgba(244,114,182,0.12)',
                            borderRadius: '10px',
                          }}
                        >
                          <span
                            onClick={() => onEdit(o)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, cursor: 'pointer',
                            }}
                          >
                            <span style={{ flexShrink: 0, width: '9px', height: '9px', borderRadius: '50%', background: meta.c }} />
                            <span style={{ fontSize: '12px', color: o.account ? meta.c : '#94a3b8', flexShrink: 0 }}>{o.account || '未选账号'}</span>
                            <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.remark || ''}</span>
                            <span style={{ flexShrink: 0, fontSize: '14px', fontWeight: 700, color: 'var(--primary-dark)' }}>+{fmtQty(o.qty)}</span>
                          </span>
                          {/* 单条删除（右滑手势外，也提供直接点击） */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(o) }}
                            aria-label="删除该出单"
                            style={{
                              position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)',
                              width: '26px', height: '26px', borderRadius: '50%',
                              border: '1px solid rgba(236,72,153,0.18)', background: '#fce7f3',
                              color: '#ec4899', cursor: 'pointer', padding: 0,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M18 6 6 18M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </SwipeRow>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部：继续新增一单。底部 padding 加大到 76px + 安全区，主动避开底部 BottomNav(~60px)+安全区，避免按钮被遮挡。 */}
        <div style={{ padding: '10px 16px calc(76px + var(--safe-bottom, 0px))', borderTop: '1px solid rgba(244,114,182,0.14)' }}>
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
