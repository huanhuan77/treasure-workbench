import { useEffect, useMemo, useRef, useState } from 'react'

// PC 版「日期范围选择器」：手动实现，不引入 antd（体积太大）。
// 交互照用户给的参考图：左边快捷区间（今天/昨天/本周/上周/本月/上月/最近N天），
// 右边双月日历，点两下选开始/结束，选完立刻生效。
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const WD = ['一', '二', '三', '四', '五', '六', '日']

// 周一开头的一个月格子（前后补 null 对齐）
function monthCells(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const total = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7))

// 快捷区间
const PRESETS = [
  { label: '今天', get: (t) => [t, t] },
  { label: '昨天', get: (t) => [addDays(t, -1), addDays(t, -1)] },
  { label: '本周', get: (t) => [mondayOf(t), addDays(mondayOf(t), 6)] },
  { label: '上周', get: (t) => [addDays(mondayOf(t), -7), addDays(mondayOf(t), -1)] },
  { label: '本月', get: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)] },
  { label: '上月', get: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)] },
  { label: '最近7天', get: (t) => [addDays(t, -6), t] },
  { label: '最近30天', get: (t) => [addDays(t, -29), t] },
  { label: '最近90天', get: (t) => [addDays(t, -89), t] },
  { label: '最近半年', get: (t) => [addDays(t, -181), t] },
]

function Field({ value, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        minWidth: 132, height: 32, padding: '0 10px', borderRadius: 8,
        border: '1px solid rgba(15,23,42,0.14)', background: '#fff',
        color: value ? '#333a45' : '#b0b6bf', fontSize: 12.5, cursor: 'pointer',
      }}
    >
      <span>{value || '年/月/日'}</span>
      {/* 日历图标 */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    </button>
  )
}

export function DateRangePicker({ start, end, onChange, onClear }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState('')     // 已点的开始日期（还没点结束）
  const [hover, setHover] = useState('')
  // 左日历显示的月份
  const [cursor, setCursor] = useState(() => {
    const base = start ? new Date(`${start}T00:00:00`) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const boxRef = useRef(null)

  // 点面板外面关闭
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayStr = ymd(today)

  const months = useMemo(() => {
    const a = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const b = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    return [a, b]
  }, [cursor])

  const apply = (s, e) => {
    const a = ymd(s) <= ymd(e) ? ymd(s) : ymd(e)
    const b = ymd(s) <= ymd(e) ? ymd(e) : ymd(s)
    onChange({ start: a, end: b })
    setPending('')
    setHover('')
    setOpen(false)
  }

  const pickDay = (d) => {
    const s = ymd(d)
    if (!pending) { setPending(s); setHover(s); return }
    apply(new Date(`${pending}T00:00:00`), d)
  }

  const inRange = (d) => {
    const s = pending || start
    const e = pending ? (hover || pending) : end
    if (!s || !e) return false
    const [a, b] = ymd(s) <= ymd(e) ? [ymd(s), ymd(e)] : [ymd(e), ymd(s)]
    const k = ymd(d)
    return k > a && k < b
  }
  const isEdge = (d) => {
    const k = ymd(d)
    return k === pending || k === start || k === end || k === hover && !!pending
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Field value={start} onOpen={() => { setOpen((v) => !v); setPending('') }} />
      <span style={{ color: '#9aa0a9', fontSize: 12 }}>~</span>
      <Field value={end} onOpen={() => { setOpen((v) => !v); setPending('') }} />
      {(start || end) && (
        <button
          type="button"
          onClick={() => { onClear && onClear(); setPending(''); setHover('') }}
          style={{ border: 'none', background: 'transparent', color: '#9aa0a9', fontSize: 12, cursor: 'pointer' }}
        >清空</button>
      )}

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 40,
          display: 'flex', background: '#fff', borderRadius: 12,
          border: '1px solid rgba(15,23,42,0.10)', boxShadow: '0 12px 32px rgba(15,23,42,0.14)',
          overflow: 'hidden',
        }}>
          {/* 左：快捷区间 */}
          <div style={{ width: 108, padding: '10px 0', borderRight: '1px solid rgba(15,23,42,0.06)' }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { const [s, e] = p.get(today); apply(s, e) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 14px',
                  border: 'none', background: 'transparent', color: '#4b5563', fontSize: 12.5, cursor: 'pointer',
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = '#f7f8fa' }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
              >{p.label}</button>
            ))}
          </div>

          {/* 右：双月日历 */}
          <div style={{ padding: '10px 12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                style={{ border: 'none', background: 'transparent', color: '#9aa0a9', fontSize: 14, cursor: 'pointer', padding: '0 6px' }}
              >‹</button>
              <div style={{ fontSize: 12, color: '#8a8f98' }}>
                {pending ? `已选开始：${pending}（再点结束日期）` : '点两下选择开始与结束'}
              </div>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                style={{ border: 'none', background: 'transparent', color: '#9aa0a9', fontSize: 14, cursor: 'pointer', padding: '0 6px' }}
              >›</button>
            </div>

            <div style={{ display: 'flex', gap: 18 }}>
              {months.map((m, mi) => (
                <div key={mi} style={{ width: 196 }}>
                  <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: '#333a45', marginBottom: 6 }}>
                    {m.getFullYear()} 年 {m.getMonth() + 1} 月
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                    {WD.map((w) => (
                      <div key={w} style={{ textAlign: 'center', fontSize: 11, color: '#b0b6bf', paddingBottom: 2 }}>{w}</div>
                    ))}
                    {monthCells(m.getFullYear(), m.getMonth()).map((d, i) => {
                      if (!d) return <div key={`e${i}`} />
                      const k = ymd(d)
                      const edge = isEdge(d)
                      const mid = inRange(d)
                      const isToday = k === todayStr
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => pickDay(d)}
                          onMouseEnter={() => { if (pending) setHover(k) }}
                          style={{
                            height: 26, border: 'none', borderRadius: 6, cursor: 'pointer',
                            fontSize: 12, fontWeight: edge ? 700 : 400,
                            background: edge ? '#b8517f' : mid ? '#fdf1f6' : 'transparent',
                            color: edge ? '#fff' : isToday ? '#b8517f' : '#4b5563',
                            outline: isToday && !edge ? '1px solid rgba(184,81,127,0.35)' : 'none',
                          }}
                        >{d.getDate()}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
