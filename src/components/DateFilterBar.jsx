import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 日期筛选（出单记录 / 视频发布记录 共用）
// 值 value 形式：'' 全部 | 'range:YYYY-MM-DD~YYYY-MM-DD'（时间段）
const PAD = (n) => String(n).padStart(2, '0')
export const dayKey = (d) => `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`

// 计算筛选区间 [startTs, endTs)；'' 返回 null（不过滤）
export function dateBounds(value) {
  if (!value) return null
  // 时间段 range:2026-09-01~2026-09-14
  const rm = String(value).match(/^range:(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/)
  if (rm) {
    const s = new Date(rm[1]).getTime()
    // 结束日期含当天 → 到次日 00:00
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

export function DateFilterBar({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  // 弹窗内的临时日期（打开时从 value 初始化，点确定才回写）
  const [startTmp, setStartTmp] = useState('')
  const [endTmp, setEndTmp] = useState('')

  const isRange = String(value || '').startsWith('range:')
  const toggle = () => {
    const el = btnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth, vh = window.innerHeight
      const left = Math.max(8, Math.min(r.left - 100, vw - 290))
      const panelMax = Math.min(vh * 0.55, 380)
      let top = r.bottom + 6
      if (top + panelMax > vh - 8) top = Math.max(8, vh - panelMax - 8)
      setPos({ top, left })
    }
    if (!open) {
      const { start, end } = parseRange(value)
      setStartTmp(start)
      setEndTmp(end)
    }
    setOpen((v) => !v)
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

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px',
    border: '1px solid rgba(244,114,182,0.3)', fontSize: '14px', color: 'var(--text-main)',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '4px' }
  const rowStyle = (sel) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px',
    background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
    color: sel ? '#fff' : 'var(--text-main)', fontWeight: sel ? 700 : 500,
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px 4px', flexShrink: 0,
    }}>
      {/* 左侧：全部 + 日期按钮 */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px',
        overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
      }}>
        <button onClick={() => onChange('')} style={{
          ...chipBase,
          border: !value ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: !value ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: !value ? '#fff' : 'var(--text-sub)',
        }}>全部</button>
      </div>
      {/* 日期弹窗入口 */}
      <button ref={btnRef} onClick={toggle} style={{
        ...chipBase, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
        border: isRange ? 'none' : '1px solid rgba(244,114,182,0.35)',
        background: isRange ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
        color: isRange ? '#fff' : 'var(--text-main)',
      }}>
        <span>📅 {dateLabel(value)}</span>
        <span style={{ fontSize: '9px', opacity: 0.8, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {/* Portal 弹窗 */}
      {open && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483000 }} />
          <div style={{
            position: 'fixed', top: (pos?.top ?? 0), left: (pos?.left ?? 0), zIndex: 2147483001,
            width: '280px', maxHeight: '55vh', overflowY: 'auto',
            background: '#fff', borderRadius: '14px', padding: '14px 16px',
            border: '1px solid rgba(244,114,182,0.22)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', textAlign: 'left', whiteSpace: 'normal',
          }}>
            <button onClick={() => { onChange(''); setOpen(false) }} style={rowStyle(!value)}>
              <span>全部（不限时间）</span>
            </button>

            <div style={{ marginTop: '12px' }}>
              <div style={labelStyle}>开始日期</div>
              <input type="date" value={startTmp} onChange={(e) => setStartTmp(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginTop: '10px' }}>
              <div style={labelStyle}>结束日期</div>
              <input type="date" value={endTmp} onChange={(e) => setEndTmp(e.target.value)} style={inputStyle} />
            </div>

            <button onClick={confirm} style={{
              width: '100%', marginTop: '14px', padding: '10px', borderRadius: '10px',
              border: 'none', background: 'linear-gradient(135deg,#f472b6,#ec4899)',
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
