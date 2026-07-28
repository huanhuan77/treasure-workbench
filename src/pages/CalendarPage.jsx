import { useState, useMemo } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'

const STORAGE_KEY = 'blogger_calendar_v1'

const MOODS = [
  { emoji: '😊', label: '开心', color: '#f59e0b' },
  { emoji: '😌', label: '平静', color: '#10b981' },
  { emoji: '😐', label: '一般', color: '#6b7280' },
  { emoji: '😢', label: '难过', color: '#3b82f6' },
  { emoji: '😡', label: '生气', color: '#ef4444' },
  { emoji: '😴', label: '疲惫', color: '#8b5cf6' },
  { emoji: '🥰', label: '恋爱', color: '#ec4899' },
  { emoji: '🤩', label: '兴奋', color: '#f97316' },
]

const WEATHERS = [
  { emoji: '☀️', label: '晴' },
  { emoji: '🌤', label: '多云' },
  { emoji: '☁️', label: '阴' },
  { emoji: '🌧', label: '雨' },
  { emoji: '⛈', label: '雷雨' },
  { emoji: '🌨', label: '雪' },
  { emoji: '🌫', label: '雾' },
  { emoji: '🌪', label: '大风' },
]

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function CalendarPage() {
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const [today] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(today)
  const [editMood, setEditMood] = useState('')
  const [editWeather, setEditWeather] = useState('')
  const [editNote, setEditNote] = useState('')

  const entry = data[selectedDate] || {}

  const openDay = (dateStr) => {
    setSelectedDate(dateStr)
    const d = data[dateStr] || {}
    setEditMood(d.mood || '')
    setEditWeather(d.weather || '')
    setEditNote(d.note || '')
  }

  const saveEntry = () => {
    const next = { ...data, [selectedDate]: { mood: editMood, weather: editWeather, note: editNote.trim() } }
    setData(next)
    saveData(next)
    show('已保存', 'success')
  }

  const deleteEntry = () => {
    const next = { ...data }
    delete next[selectedDate]
    setData(next)
    saveData(next)
    setEditMood(''); setEditWeather(''); setEditNote('')
    show('已删除', 'success')
  }

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay() // 0=Sun
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const monthLabel = `${viewYear}年${viewMonth}月`
  const weekDayHeaders = weekDays.map(d => (
    <div key={d} style={{
      width: '14.28%', textAlign: 'center', padding: '6px 0',
      fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)',
    }}>{d}</div>
  ))

  const dayCells = []
  for (let i = 0; i < firstDay; i++) {
    dayCells.push(<div key={`empty-${i}`} style={{ width: '14.28%' }} />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const dayData = data[dateStr]
    const isToday = dateStr === today
    const isSelected = dateStr === selectedDate

    let dotColor = null
    if (dayData?.mood) {
      const m = MOODS.find(x => x.emoji === dayData.mood)
      if (m) dotColor = m.color
    }

    dayCells.push(
      <div key={dateStr} onClick={() => openDay(dateStr)} style={{
        width: '14.28%', padding: '4px 0', cursor: 'pointer',
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: isToday ? 700 : 500,
          background: isSelected ? 'var(--primary)' : (isToday ? 'var(--primary-light)' : 'transparent'),
          color: isSelected ? '#fff' : 'var(--text-main)',
          transition: 'all 0.15s',
        }}>{d}</div>
        {dotColor && <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: dotColor, marginTop: '2px',
        }} />}
        {dayData?.weather && !dotColor && <div style={{ fontSize: '8px', marginTop: '1px' }}>{dayData.weather}</div>}
      </div>
    )
  }

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const dateLabel = selectedDate ? `${parseInt(selectedDate.split('-')[1])}月${parseInt(selectedDate.split('-')[2])}日` : ''

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 8px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📅 我的日历</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>记录每天的心情和心事</p>
      </header>

      {/* 月历头部 */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ ...glassStyle, padding: '12px 8px 8px' }}>
          {/* 月份切换 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px' }}>
            <button onClick={prevMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '16px', cursor: 'pointer' }}>‹</button>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{monthLabel}</span>
            <button onClick={nextMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '16px', cursor: 'pointer' }}>›</button>
          </div>
          {/* 星期 */}
          <div style={{ display: 'flex' }}>{weekDayHeaders}</div>
          {/* 日期 */}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>{dayCells}</div>
        </div>

        {/* 选中日期的编辑区 */}
        <div style={{ ...glassStyle, padding: '16px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              {selectedDate === today ? '📌 今天' : `📌 ${dateLabel}`}
            </h3>
            {entry.mood && <span style={{ fontSize: '24px' }}>{entry.mood}</span>}
          </div>

          {/* 心情选择 */}
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>心情</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {MOODS.map(m => (
              <button key={m.emoji} onClick={() => setEditMood(editMood === m.emoji ? '' : m.emoji)} style={{
                padding: '6px 10px', borderRadius: '8px', border: '1.5px solid',
                borderColor: editMood === m.emoji ? m.color : 'rgba(0,0,0,0.06)',
                background: editMood === m.emoji ? `${m.color}15` : '#fff',
                fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                <span style={{ fontSize: '16px' }}>{m.emoji}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{m.label}</span>
              </button>
            ))}
          </div>

          {/* 天气选择 */}
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>天气</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {WEATHERS.map(w => (
              <button key={w.emoji} onClick={() => setEditWeather(editWeather === w.emoji ? '' : w.emoji)} style={{
                padding: '6px 10px', borderRadius: '8px', border: '1.5px solid',
                borderColor: editWeather === w.emoji ? '#6366f1' : 'rgba(0,0,0,0.06)',
                background: editWeather === w.emoji ? 'rgba(99,102,241,0.08)' : '#fff',
                fontSize: '13px', cursor: 'pointer',
              }}>
                {w.emoji}
              </button>
            ))}
          </div>

          {/* 心事 */}
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>心事</label>
          <textarea value={editNote} onChange={e => setEditNote(e.target.value)}
            placeholder="今天发生了什么？有什么想记录的？"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px',
              border: '1.5px solid rgba(0,0,0,0.06)', fontSize: '14px', outline: 'none',
              resize: 'vertical', fontFamily: 'inherit', marginBottom: '12px',
            }}
          />

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={saveEntry} style={{
              flex: 1, padding: '12px 0', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}>💾 保存</button>
            {entry.mood && (
              <button onClick={deleteEntry} style={{
                padding: '12px 16px', borderRadius: '8px', border: '1px solid #fecaca',
                background: '#fff', color: '#ef4444', fontSize: '13px', cursor: 'pointer',
              }}>🗑</button>
            )}
          </div>
        </div>

        {/* 本月统计 */}
        <div style={{ ...glassStyle, padding: '12px 16px', marginTop: '10px', fontSize: '13px', color: 'var(--text-sub)' }}>
          📊 本月已记录 <b style={{ color: 'var(--text-main)' }}>{Object.keys(data).filter(k => k.startsWith(`${viewYear}-${String(viewMonth).padStart(2,'0')}`)).length}</b> 天
        </div>

        {/* 列表视图 */}
        <div style={{ marginTop: '12px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
            📋 {monthLabel} 记录
          </h3>
          {Object.entries(data)
            .filter(([k]) => k.startsWith(`${viewYear}-${String(viewMonth).padStart(2,'0')}`))
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([dateStr, entry]) => (
              <div key={dateStr} onClick={() => openDay(dateStr)} style={{
                ...glassStyle, padding: '10px 12px', marginBottom: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', minWidth: '36px' }}>
                  {parseInt(dateStr.split('-')[2])}日
                </span>
                <span style={{ fontSize: '16px' }}>{entry.mood || ''}</span>
                <span style={{ fontSize: '13px' }}>{entry.weather || ''}</span>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.note || (entry.mood ? '已记录' : '')}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
