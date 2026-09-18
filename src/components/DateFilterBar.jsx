import { useEffect, useRef, useState } from 'react'
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
  padding: '4px 7px', borderRadius: 0, fontSize: '12px', fontWeight: 600, textAlign: 'center',
  cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto',
  border: 'none', background: 'transparent',
}

// 快捷日期chips 均分样式：flex 1 撑满、minWidth 0 允许收缩、overflow hidden 防文字溢出
const chipFill = {
  flex: '1 1 0', minWidth: 0, textAlign: 'center',
  overflow: 'hidden', textOverflow: 'ellipsis',
  paddingLeft: 2, paddingRight: 2,
}

function parseRange(value) {
  const m = String(value || '').match(/^range:(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/)
  return m ? { start: m[1], end: m[2] } : { start: '', end: '' }
}

/* ---------- 竖向滚动日历 ---------- */

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']
const BLUE = '#3b82f6'

// 生成从当前月起往前 count 个月的列表（升序）
function buildMonths(endY, endM, count) {
  const arr = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endY, endM - i, 1)
    arr.push({ y: d.getFullYear(), m: d.getMonth() })
  }
  return arr
}

// 某月日历格子（周一为第一列），返回数组，含前置空格
function monthCells(year, month) {
  const first = new Date(year, month, 1)
  let startCol = first.getDay() - 1
  if (startCol < 0) startCol = 6
  const days = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startCol; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return cells
}

function CalendarMonths({ months, startTmp, endTmp, onSelect, todayStr }) {
  const scrollRef = useRef(null)

  // 打开后滚动到已选月份 / 当前月（等布局稳定再校正一次，避免露出上个月尾巴）
  const focusKey = (startTmp ? startTmp.slice(0, 7) : todayStr.slice(0, 7))
  useEffect(() => {
    const doScroll = () => {
      const cont = scrollRef.current
      if (!cont) return
      const el = cont.querySelector(`[data-mkey="${focusKey}"]`)
      if (el) cont.scrollTop = el.offsetTop
    }
    doScroll()
    const t = setTimeout(doScroll, 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={scrollRef} style={{
      flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch',
    }}>
      {months.map(({ y, m }) => (
        <div key={`${y}-${m}`} data-mkey={`${y}-${PAD(m + 1)}`}>
          <div style={{
            position: 'sticky', top: 0, zIndex: 2, background: '#fff',
            textAlign: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)',
            padding: '8px 0',
          }}>{y}年{m + 1}月</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '2px' }}>
            {WEEK_DAYS.map((w) => (
              <div key={w} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-sub)', fontWeight: 600, padding: '4px 0' }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', paddingBottom: '8px' }}>
            {monthCells(y, m).map((day, idx) => {
              if (!day) return <div key={`e${idx}`} style={{ height: '46px' }} />
              const dobj = new Date(y, m, day)
              const k = dayKey(dobj)
              const isFuture = k > todayStr
              const isStart = !!startTmp && k === startTmp
              const isEnd = !!endTmp && k === endTmp
              const inRange = startTmp && endTmp && k > startTmp && k < endTmp
              const selected = isStart || isEnd
              const noEnd = !endTmp || endTmp === startTmp
              let tag = ''
              if (isStart) tag = noEnd ? '开始/结束' : '开始'
              else if (isEnd) tag = '结束'

              return (
                <button
                  key={k}
                  disabled={isFuture}
                  onClick={() => onSelect(k)}
                  style={{
                    height: '46px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px', border: 'none', padding: 0, lineHeight: 1.1,
                    cursor: isFuture ? 'default' : 'pointer',
                    background: selected ? BLUE : inRange ? '#dbeafe' : 'transparent',
                    color: isFuture ? '#cfcfcf' : selected ? '#fff' : inRange ? '#1d4ed8' : 'var(--text-main)',
                    fontSize: '14px', fontWeight: selected ? 700 : 500,
                  }}
                >
                  <span>{day}</span>
                  {tag && <span style={{ fontSize: '9px', fontWeight: 600, marginTop: '1px' }}>{tag}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- 主组件 ---------- */

export function DateFilterBar({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [startTmp, setStartTmp] = useState('')
  const [endTmp, setEndTmp] = useState('')

  const todayStr = dayKey(new Date())
  const isRange = String(value || '').startsWith('range:')
  const months = buildMonths(new Date().getFullYear(), new Date().getMonth(), 24)

  const toggle = () => {
    if (!open) {
      const { start, end } = parseRange(value)
      setStartTmp(start)
      setEndTmp(end)
    }
    setOpen((v) => !v)
  }

  const handleSelect = (k) => {
    if (!startTmp || (startTmp && endTmp)) {
      setStartTmp(k); setEndTmp('')
    } else if (k >= startTmp) {
      setEndTmp(k)
    } else {
      setEndTmp(startTmp); setStartTmp(k)
    }
  }

  const confirm = () => {
    if (startTmp && endTmp) onChange(`range:${startTmp}~${endTmp}`)
    else if (startTmp) onChange(`range:${startTmp}~${startTmp}`)
    else onChange('')
    setOpen(false)
  }

  const reset = () => { setStartTmp(''); setEndTmp('') }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexShrink: 0,
      margin: '4px 0 8px', padding: '5px 10px',
      background: 'rgba(255,255,255,0.5)',
      borderTop: '1px solid rgba(244,114,182,0.16)',
      borderBottom: '1px solid rgba(244,114,182,0.16)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>
      {/* 左侧：快捷日期chips，等分撑满，超出时才横滑 */}
      <div className="hide-scrollbar" style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
        overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
      }}>
      <button onClick={() => onChange('')} style={{
        ...chipBase, ...chipFill,
        color: !value ? '#ec4899' : 'var(--text-sub)',
      }}>
        <span style={{
          display: 'inline-block', position: 'relative', paddingBottom: '3px',
          borderBottom: !value ? '2px solid #ec4899' : '2px solid transparent',
        }}>全部</span>
      </button>
      {DATE_CHIPS.map((c) => {
        const sel = value === c.id
        return (
          <button key={c.id} onClick={() => onChange(sel ? '' : c.id)} style={{
            ...chipBase, ...chipFill,
            color: sel ? '#ec4899' : 'var(--text-main)',
          }}>
            <span style={{
              display: 'inline-block', position: 'relative', paddingBottom: '3px',
              borderBottom: sel ? '2px solid #ec4899' : '2px solid transparent',
            }}>{c.label}</span>
          </button>
        )
      })}
      </div>
      {/* 右侧：日期弹窗入口，固定不滚动 */}
      <button onClick={toggle} style={{
        ...chipBase, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '2px',
        borderBottom: (isRange && value) ? '2px solid #ec4899' : '2px solid transparent',
        color: (isRange && value) ? '#ec4899' : 'var(--text-main)',
      }}>
        <span>📅{dateLabel(value)}</span>
        <span style={{ fontSize: '9px', opacity: 0.8, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {/* 底部弹出式日历弹窗 */}
      {open && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483000,
            background: 'rgba(0,0,0,0.35)',
          }} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, margin: '0 auto', maxWidth: '440px',
            zIndex: 2147483001, height: '82vh', maxHeight: '820px',
            display: 'flex', flexDirection: 'column',
            background: '#fff', borderRadius: '16px 16px 0 0',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
            paddingBottom: 'var(--safe-bottom, 0px)',
          }}>
            {/* 顶部标题行 */}
            <div style={{ position: 'relative', flexShrink: 0, paddingTop: '6px' }}>
              <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', padding: '8px 0' }}>选择日期</div>
              <button onClick={() => setOpen(false)} style={{
                position: 'absolute', top: '6px', right: '10px', background: 'none', border: 'none',
                fontSize: '20px', color: 'var(--text-sub)', cursor: 'pointer', lineHeight: 1, padding: '6px',
              }}>✕</button>
            </div>

            {/* 已选提示 + 重置 */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                {startTmp ? `${startTmp}${endTmp && endTmp !== startTmp ? ` ~ ${endTmp}` : ''}` : '点击选择开始日期'}
              </span>
              {(startTmp || endTmp) && (
                <button onClick={reset} style={{ background: 'none', border: 'none', color: BLUE, fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}>重置</button>
              )}
            </div>

            {/* 日历滚动区 */}
            <CalendarMonths months={months} startTmp={startTmp} endTmp={endTmp} onSelect={handleSelect} todayStr={todayStr} />

            {/* 底部确定 */}
            <div style={{ flexShrink: 0, padding: '10px 16px 14px' }}>
              <button onClick={confirm} style={{
                width: '100%', padding: '12px', borderRadius: '999px', border: 'none', background: BLUE,
                color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              }}>确定</button>
            </div>
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
