import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 日期筛选（出单记录 / 视频发布记录 共用）
// 值 value 形式：'' 全部 | 'today' | 'yesterday' | 'last7' | 'thisWeek' | 'thisMonth'
//              | 'range:YYYY-MM-DD~YYYY-MM-DD'（时间段，弹窗日历选）
export const DATE_CHIPS = [
  { id: 'today', label: '今天' },
  { id: 'yesterday', label: '昨天' },
  { id: 'last7', label: '近7天' },
  { id: 'thisWeek', label: '本周' },
  { id: 'thisMonth', label: '本月' },
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
    const off = day === 0 ? 6 : day - 1
    return [new Date(y, m, d - off).getTime(), new Date(y, m, d - off + 7).getTime()]
  }
  if (value === 'thisMonth') return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()]
  // 时间段 range:2026-09-01~2026-09-14
  const rm = String(value).match(/^range:(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/)
  if (rm) {
    const s = new Date(rm[1]).getTime()
    const ed = new Date(rm[2])
    const e = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate() + 1).getTime()
    return [s, e]
  }
  // 兼容旧格式 day:YYYY-MM-DD
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
  const rm = String(value).match(/^range:(\d{4})-(\d{2})-(\d{2})~(\d{4})-(\d{2})-(\d{2})$/)
  if (rm) return `${rm[2]}/${rm[3]} ~ ${rm[5]}/${rm[6]}`
  const dm = String(value).match(/^day:(\d{4})-(\d{2})-(\d{2})$/)
  if (dm) return `${dm[2]}/${dm[3]}`
  return '日期'
}

const chipBase = {
  padding: '5px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto',
}

function parseRange(value) {
  const m = String(value || '').match(/^range:(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/)
  return m ? { start: m[1], end: m[2] } : { start: '', end: '' }
}

/* ---------- 双月日历弹窗 ---------- */

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']

// 生成某月的日历行（每行 7 个 cell），cell: { key, day, isCurrentMonth, dateObj }
function buildMonth(year, month) {
  // month: 0-based
  const firstDay = new Date(year, month, 1)
  // 周一为第 0 列：getDay()=0(日)→6, =1→0, ...
  let startCol = firstDay.getDay() - 1
  if (startCol < 0) startCol = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rows = []
  let cells = []
  // 前面补空
  for (let i = 0; i < startCol; i++) cells.push({ key: `e-${i}`, day: 0, isCurrentMonth: false })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: `${year}-${month}-${d}`, day: d, isCurrentMonth: true, dateObj: new Date(year, month, d) })
    if (cells.length === 7) { rows.push(cells); cells = [] }
  }
  // 后面补空凑满最后一行
  if (cells.length > 0) { while (cells.length < 7) cells.push({ key: `a-${cells.length}`, day: 0, isCurrentMonth: false }); rows.push(cells) }
  return rows
}

function sameDay(a, b) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function CalendarPanel({ startTmp, endTmp, onSelect, viewYear, viewMonth }) {
  const m1Rows = buildMonth(viewYear, viewMonth)
  const y2 = viewMonth === 11 ? viewYear + 1 : viewYear
  const m2 = (viewMonth + 1) % 12
  const m2Rows = buildMonth(y2, m2)

  const renderCell = (cell) => {
    if (!cell.isCurrentMonth) return <div key={cell.key} style={{ height: '34px' }} />
    const k = dayKey(cell.dateObj)
    const isStart = startTmp && k === startTmp
    const isEnd = endTmp && k === endTmp
    const isInRange = startTmp && endTmp && k > startTmp && k < endTmp
    const isSelected = isStart || isEnd

    return (
      <button key={k} onClick={() => onSelect(cell.dateObj)} style={{
        height: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
        background: isSelected ? '#3b82f6' : isInRange ? '#dbeafe' : 'transparent',
        color: isSelected ? '#fff' : isInRange ? '#1d4ed8' : 'var(--text-main)',
        padding: 0, lineHeight: 1.2,
      }}>
        <span>{cell.day}</span>
        {(isStart || isEnd) && (
          <span style={{ fontSize: '9px', opacity: 0.85, fontWeight: 600 }}>{isStart ? '开始' : '结束'}</span>
        )}
      </button>
    )
  }

  const monthTitle = (y, m) => (
    <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
      {y}年{m + 1}月
    </div>
  )

  const weekRow = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '2px' }}>
      {WEEK_DAYS.map((w) => (
        <div key={w} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, padding: '2px 0' }}>{w}</div>
      ))}
    </div>
  )

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {monthTitle(viewYear, viewMonth)}
        {weekRow}
        <div style={gridStyle}>{m1Rows.flat().map(renderCell)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {monthTitle(y2, m2)}
        {weekRow}
        <div style={gridStyle}>{m2Rows.flat().map(renderCell)}</div>
      </div>
    </div>
  )
}

/* ---------- 主组件 ---------- */

export function DateFilterBar({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  // 弹窗内临时选中的日期
  const [startTmp, setStartTmp] = useState('')
  const [endTmp, setEndTmp] = useState('')
  // 日历视图月份（打开时初始化）
  const [viewY, setViewY] = useState(0)
  const [viewM, setViewM] = useState(0)

  const isChip = DATE_CHIPS.some((c) => c.id === value)
  const isRange = String(value || '').startsWith('range:')
  const toggle = () => {
    const el = btnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth, vh = window.innerHeight
      // 双月日历更宽，留 320px
      const left = Math.max(8, Math.min(r.left - 160, vw - 340))
      const panelMax = Math.min(vh * 0.78, 480)
      let top = r.bottom + 6
      if (top + panelMax > vh - 8) top = Math.max(8, vh - panelMax - 8)
      setPos({ top, left })
    }
    if (!open) {
      const { start, end } = parseRange(value)
      setStartTmp(start)
      setEndTmp(end)
      // 视图月份：如果有已选开始日期就显示那个月，否则显示当前月
      if (start) {
        const d = new Date(start)
        setViewY(d.getFullYear()); setViewM(d.getMonth())
      } else {
        const n = new Date()
        setViewY(n.getFullYear()); setViewM(n.getMonth())
      }
    }
    setOpen((v) => !v)
  }

  const handleSelectDate = (dateObj) => {
    const k = dayKey(dateObj)
    if (!startTmp || (startTmp && endTmp)) {
      // 新选开始（或重新开始）
      setStartTmp(k)
      setEndTmp('')
    } else {
      // 已有开始，选结束
      if (k >= startTmp) {
        setEndTmp(k)
      } else {
        // 点了开始之前的日期 → 把它当新的开始
        setStartTmp(k)
        setEndTmp(startTmp)
      }
    }
  }

  const confirm = () => {
    if (startTmp && endTmp) {
      onChange(`range:${startTmp}~${endTmp}`)
    } else if (startTmp) {
      onChange(`range:${startTmp}~${startTmp}`)
    } else {
      onChange('')
    }
    setOpen(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px 4px', flexShrink: 0,
    }}>
      {/* 左侧：可横滑的快捷筛选 chips */}
      <div className="hide-scrollbar" style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px',
        overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
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
      </div>
      {/* 日期弹窗入口 */}
      <button ref={btnRef} onClick={toggle} style={{
        ...chipBase, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
        border: (isRange && value) ? 'none' : '1px solid rgba(244,114,182,0.35)',
        background: (isRange && value) ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
        color: (isRange && value) ? '#fff' : 'var(--text-main)',
      }}>
        <span>📅 {dateLabel(value)}</span>
        <span style={{ fontSize: '9px', opacity: 0.8, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {/* 弹窗：双月日历 */}
      {open && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483000 }} />
          <div style={{
            position: 'fixed', top: (pos?.top ?? 0), left: (pos?.left ?? 0), zIndex: 2147483001,
            width: '320px', maxHeight: '78vh', overflowY: 'auto',
            background: '#fff', borderRadius: '14px', padding: '14px',
            border: '1px solid rgba(244,114,182,0.22)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', textAlign: 'left', whiteSpace: 'normal',
          }}>
            {/* 关闭按钮 */}
            <button onClick={() => setOpen(false)} style={{
              position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none',
              fontSize: '18px', color: 'var(--text-sub)', cursor: 'pointer', lineHeight: 1, padding: '2px',
            }}>✕</button>

            {/* 全部按钮 */}
            <button onClick={() => { onChange(''); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', width: '100%',
              padding: '8px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px',
              background: !value ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
              color: !value ? '#fff' : 'var(--text-main)', fontWeight: !value ? 700 : 500, marginBottom: '4px',
            }}>
              全部（不限时间）
            </button>

            {/* 双月日历 */}
            <CalendarPanel
              startTmp={startTmp} endTmp={endTmp}
              onSelect={handleSelectDate}
              viewYear={viewY} viewMonth={viewM}
            />

            {/* 确定按钮 */}
            <button onClick={confirm} style={{
              width: '100%', marginTop: '12px', padding: '10px', borderRadius: '999px',
              border: 'none', background: '#3b82f6',
              color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}>确定</button>
          </div>
        </>,
        document.body,
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
