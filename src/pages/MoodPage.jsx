import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost } from '../components/Modal'

const MOOD_OPTIONS = [
  { emoji: '😄', label: '超开心', color: '#fcd34d' },
  { emoji: '😊', label: '开心', color: '#fde68a' },
  { emoji: '😐', label: '一般', color: '#d1d5db' },
  { emoji: '😢', label: '难过', color: '#93c5fd' },
  { emoji: '😡', label: '烦躁', color: '#fca5a5' },
  { emoji: '🥱', label: '疲惫', color: '#c4b5fd' },
  { emoji: '🤒', label: '生病', color: '#fdba74' },
  { emoji: '🎉', label: '庆祝', color: '#fde68a' },
]

export function MoodPage() {
  const { moodData, setMood } = useStore()
  const { show } = useToast()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [editDay, setEditDay] = useState(null)
  const [editMood, setEditMood] = useState('')
  const [editQuote, setEditQuote] = useState('')

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const moodMap = useMemo(() => {
    const map = {}
    // Only show mood data for the current month
    const prefix = year + '-' + String(month).padStart(2, '0')
    moodData?.forEach((m) => {
      if (m.date && m.date.startsWith(prefix)) {
        map[m.date] = m
      }
    })
    return map
  }, [moodData, year, month])

  const today = new Date()
  const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0')

  // Navigation
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const openDay = (day) => {
    const dateKey = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0')
    const existing = moodMap[dateKey]
    setEditDay(dateKey)
    setEditMood(existing?.mood || '')
    setEditQuote(existing?.quote || '')
  }

  const saveMood = () => {
    if (!editDay) return
    setMood(editDay, editMood, editQuote)
    show(editMood ? '已保存心情' : '已更新', 'success')
    setEditDay(null)
  }

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      <header style={{ padding: 'calc(20px + var(--safe-top)) 20px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>心情日历</h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>记录每天的心情和一句话</p>
      </header>

      {/* 月份导航 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '8px 16px' }}>
        <button onClick={prevMonth} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(244,114,182,0.25)', background: 'rgba(255,255,255,0.5)', color: 'var(--text-sub)', fontSize: '18px', cursor: 'pointer' }}>‹</button>
        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', minWidth: '100px', textAlign: 'center' }}>{year}年{month}月</span>
        <button onClick={nextMonth} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(244,114,182,0.25)', background: 'rgba(255,255,255,0.5)', color: 'var(--text-sub)', fontSize: '18px', cursor: 'pointer' }}>›</button>
      </div>

      {/* 日历网格 */}
      <div style={{ padding: '8px 12px' }}>
        {/* 星期头 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
          {['日','一','二','三','四','五','六'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        {/* 日期格子 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
          {/* 空白占位 */}
          {Array.from({length: firstDay}).map((_, i) => (
            <div key={'blank-'+i} style={{ aspectRatio: '1', padding: '2px' }} />
          ))}
          {/* 日期 */}
          {Array.from({length: daysInMonth}).map((_, i) => {
            const day = i + 1
            const dateKey = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0')
            const entry = moodMap[dateKey]
            const isToday = dateKey === todayStr
            return (
              <div
                key={day}
                onClick={() => openDay(day)}
                style={{
                  aspectRatio: '1',
                  padding: '3px',
                  borderRadius: '10px',
                  background: entry ? 'rgba(255,255,255,0.5)' : 'transparent',
                  border: isToday ? '2px solid #f472b6' : '1px solid rgba(244,114,182,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  minHeight: '48px',
                }}
              >
                <span style={{
                  fontSize: '12px',
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#ec4899' : 'var(--text-main)',
                  lineHeight: 1.2,
                }}>{day}</span>
                {entry?.mood && (
                  <span style={{ fontSize: '16px', lineHeight: 1.2, marginTop: '1px' }}>{entry.mood}</span>
                )}
                {entry?.quote && (
                  <span style={{
                    fontSize: '7px', color: 'var(--text-sub)', lineHeight: 1.1,
                    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                    whiteSpace: 'nowrap', marginTop: '1px',
                  }}>{entry.quote}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 已有记录列表（当月） */}
      <div style={{ padding: '12px 16px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>本月心情记录</h3>
        {Object.keys(moodMap).length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>暂无记录，点击日期开始记录</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(moodMap).sort(([a], [b]) => b.localeCompare(a)).map(([date, entry]) => {
              const day = date.split('-')[2]
              return (
                <div key={date} onClick={() => {
                  setEditDay(date); setEditMood(entry.mood); setEditQuote(entry.quote || '')
                }} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(244,114,182,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', minWidth: '28px' }}>{day}日</span>
                  <span style={{ fontSize: '20px' }}>{entry.mood || '😐'}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.quote || '（无）'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <Modal open={!!editDay} onClose={() => setEditDay(null)} title={editDay ? `编辑 ${editDay}` : ''}
        footer={
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button style={btnGhost} onClick={() => {
              if (editDay) { setMood(editDay, '', ''); show('已清除', 'success'); setEditDay(null) }
            }}>清除记录</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={saveMood}>保存</button>
          </div>
        }
      >
        <Field label="今天心情">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.emoji}
                onClick={() => setEditMood(m.emoji)}
                style={{
                  padding: '8px 10px', borderRadius: '10px', border: '1.5px solid',
                  borderColor: editMood === m.emoji ? m.color : 'rgba(244,114,182,0.15)',
                  background: editMood === m.emoji ? m.color : 'rgba(255,255,255,0.5)',
                  fontSize: '20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <span>{m.emoji}</span>
                <span style={{ fontSize: '11px', color: editMood === m.emoji ? '#fff' : 'var(--text-sub)', fontWeight: 600 }}>{m.label}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="今日一句话">
          <input style={inputStyle} value={editQuote} onChange={(e) => setEditQuote(e.target.value)} placeholder="写点什么…" />
        </Field>
      </Modal>
    </div>
  )
}

export default MoodPage
