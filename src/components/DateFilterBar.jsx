import { useRef, useState } from 'react'

// 日期筛选（出单记录 / 视频发布记录 共用）
// 值 value 形式：'' 全部 | 'today' | 'yesterday' | 'last7' | 'thisWeek' | 'thisMonth'
//              | 'lastMonth' | 'halfYear' | 'thisYear' | 'day:YYYY-MM-DD'
export const DATE_CHIPS = [
  { id: 'today', label: '今天' },
  { id: 'yesterday', label: '昨天' },
  { id: 'last7', label: '近7天' },
  { id: 'thisWeek', label: '本周' },
  { id: 'thisMonth', label: '本月' },
]

const RANGE_ITEMS = [
  { id: 'thisMonth', label: '本月' },
  { id: 'lastMonth', label: '上月' },
  { id: 'halfYear', label: '近半年' },
  { id: 'thisYear', label: '本年' },
]

const PAD = (n) => String(n).padStart(2, '0')
export const dayKey = (d) => `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`

// 计算筛选区间 [startTs, endTs)；'' 返回 null（不过滤）
export function dateBounds(value) {
  if (!value) return null
  const n = new Date()
  const y = n.getFullYear(), m = n.getMonth(), d = n.getDate()
  const today0 = new Date(y, m, d).getTime()
  const tomorrow0 = new Date(y, m, d + 1).getTime()
  if (value === 'today') return [today0, tomorrow0]
  if (value === 'yesterday') return [new Date(y, m, d - 1).getTime(), today0]
  if (value === 'last7') return [new Date(y, m, d - 6).getTime(), tomorrow0]
  if (value === 'thisWeek') {
    const day = n.getDay()
    const off = day === 0 ? 6 : day - 1 // 周一为起点
    return [new Date(y, m, d - off).getTime(), new Date(y, m, d - off + 7).getTime()]
  }
  if (value === 'thisMonth') return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()]
  if (value === 'lastMonth') return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]
  if (value === 'halfYear') return [new Date(y, m - 5, 1).getTime(), new Date(y, m + 1, 1).getTime()]
  if (value === 'thisYear') return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()]
  const dm = String(value).match(/^day:(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dm) {
    const s = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3])).getTime()
    return [s, new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]) + 1).getTime()]
  }
  return null
}

// 按钮上显示的文字
export function dateLabel(value) {
  if (!value) return '日期'
  const chip = DATE_CHIPS.find((c) => c.id === value)
  if (chip) return chip.label
  const range = RANGE_ITEMS.find((r) => r.id === value)
  if (range) return range.label
  const dm = String(value).match(/^day:(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dm) return `${dm[1]}/${PAD(dm[2])}/${PAD(dm[3])}`
  return '日期'
}

const chipBase = {
  padding: '5px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto',
}

export function DateFilterBar({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)

  const isChip = DATE_CHIPS.some((c) => c.id === value)
  const toggle = () => {
    const el = btnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left - 150, window.innerWidth - 258)) })
    }
    setOpen((v) => !v)
  }
  const pick = (v) => { onChange(v); setOpen(false) }

  const rowStyle = (sel) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    padding: '9px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px',
    background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
    color: sel ? '#fff' : 'var(--text-main)', fontWeight: sel ? 700 : 500,
  })
  const sectionTitle = { fontSize: '11px', fontWeight: 700, color: '#b3888f', padding: '8px 10px 4px' }

  return (
    <div className="hide-scrollbar" style={{
      display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px 4px',
      overflowX: 'auto', whiteSpace: 'nowrap', flexShrink: 0, WebkitOverflowScrolling: 'touch',
    }}>
      <button onClick={() => onChange('')} style={{
        ...chipBase,
        border: !value ? 'none' : '1px solid rgba(244,114,182,0.35)',
        background: !value ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
        color: !value ? '#fff' : 'var(--text-sub)',
      }}>全部</button>
      {DATE_CHIPS.map((c) => {
        const sel = value === c.id
        return (
          <button key={c.id} onClick={() => onChange(sel ? '' : c.id)} style={{
            ...chipBase,
            border: sel ? 'none' : '1px solid rgba(244,114,182,0.35)',
            background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
            color: sel ? '#fff' : 'var(--text-main)',
          }}>{c.label}</button>
        )
      })}
      {/* 日期选择弹窗入口：可选快捷键、具体某一天、本月/上月/近半年/本年 */}
      <button ref={btnRef} onClick={toggle} style={{
        ...chipBase, display: 'inline-flex', alignItems: 'center', gap: '4px',
        position: 'relative', zIndex: open ? 41 : 'auto',
        border: (!isChip && value) ? 'none' : '1px solid rgba(244,114,182,0.35)',
        background: (!isChip && value) ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
        color: (!isChip && value) ? '#fff' : 'var(--text-main)',
      }}>
        <span>📅 {dateLabel(value)}</span>
        <span style={{ fontSize: '9px', opacity: 0.8, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'fixed', top: (pos?.top ?? 0), left: (pos?.left ?? 0), zIndex: 41,
            width: '250px', maxHeight: '70vh', overflowY: 'auto',
            background: '#fff', borderRadius: '14px', padding: '6px',
            border: '1px solid rgba(244,114,182,0.22)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', textAlign: 'left', whiteSpace: 'normal',
          }}>
            <button onClick={() => pick('')} style={rowStyle(!value)}>
              <span>全部</span>
            </button>

            <div style={sectionTitle}>快捷键</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 10px 6px' }}>
              {DATE_CHIPS.map((c) => {
                const sel = value === c.id
                return (
                  <button key={c.id} onClick={() => pick(c.id)} style={{
                    padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: sel ? 'none' : '1px solid rgba(244,114,182,0.35)',
                    background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                    color: sel ? '#fff' : 'var(--text-main)',
                  }}>{c.label}</button>
                )
              })}
            </div>

            <div style={sectionTitle}>具体某一天</div>
            <div style={{ padding: '0 10px 8px' }}>
              <input
                type="date"
                value={String(value).startsWith('day:') ? String(value).slice(4) : ''}
                onChange={(e) => { if (e.target.value) pick(`day:${e.target.value}`) }}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '10px',
                  border: '1px solid rgba(244,114,182,0.3)', fontSize: '13px', color: 'var(--text-main)',
                  background: '#fff', outline: 'none',
                }}
              />
            </div>

            <div style={sectionTitle}>时间段</div>
            {RANGE_ITEMS.map((r) => (
              <button key={r.id} onClick={() => pick(r.id)} style={rowStyle(value === r.id)}>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// 排序：日期 新→旧 / 旧→新（其它排序项由各页面自己追加）
export const DATE_SORT_ITEMS = [
  { id: 'dateDesc', label: '日期新→旧' },
  { id: 'dateAsc', label: '日期旧→新' },
]

export function SortChips({ items, value, onChange, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0, ...style }}>
      <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
      {items.map((it) => {
        const sel = value === it.id
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            flex: '0 0 auto', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            border: sel ? 'none' : '1px solid rgba(244,114,182,0.35)',
            background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
            color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{it.label}</button>
        )
      })}
    </div>
  )
}
