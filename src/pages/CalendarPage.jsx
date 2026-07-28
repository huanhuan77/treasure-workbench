import { useState } from 'react'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'

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
]

function loadData() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {} }
  catch { return {} }
}
function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

export function CalendarPage() {
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [showAdd, setShowAdd] = useState(false)
  const [detailDay, setDetailDay] = useState(null)
  const [form, setForm] = useState({ mood: '', weather: '', note: '' })

  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const monthLabel = `${year}年${month}月`

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const openAdd = () => {
    const d = new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const exist = data[key] || {}
    setForm({ mood: exist.mood || '', weather: exist.weather || '', note: exist.note || '' })
    setShowAdd(true)
  }

  const openDetail = (day) => {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const entry = data[dateStr] || {}
    setDetailDay({ dateStr, day, ...entry })
  }

  const handleSave = () => {
    const d = new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const next = { ...data, [key]: { mood: form.mood, weather: form.weather, note: form.note.trim() } }
    setData(next); saveData(next); setShowAdd(false); show('已记录', 'success')
  }

  const handleEditSave = () => {
    if (!detailDay) return
    const next = { ...data, [detailDay.dateStr]: { mood: detailDay.mood, weather: detailDay.weather, note: detailDay.note ? detailDay.note.trim() : '' } }
    setData(next); saveData(next); show('已更新', 'success')
  }

  const handleDelete = () => {
    if (!detailDay) return
    const next = { ...data }; delete next[detailDay.dateStr]
    setData(next); saveData(next); setDetailDay(null); show('已删除', 'success')
  }

  // 按日期排序的列表
  const monthEntries = Object.entries(data)
    .filter(([k]) => k.startsWith(`${year}-${String(month).padStart(2,'0')}`))
    .sort(([a], [b]) => b.localeCompare(a))

  return (
    <div className="app-container">
      {/* 头部 */}
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📅 我的日历</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>记录每天心情</p>
        </div>
        <button onClick={openAdd} style={{
          width: '40px', height: '40px', borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
          fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,114,182,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 月历卡片 */}
        <div style={{ ...glassStyle, padding: '12px 8px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '0 8px' }}>
            <button onClick={prevMonth} style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '16px', cursor: 'pointer' }}>‹</button>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{monthLabel}</span>
            <button onClick={nextMonth} style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '16px', cursor: 'pointer' }}>›</button>
          </div>
          <div style={{ display: 'flex' }}>
            {weekDays.map(d => <div key={d} style={{ width: '14.28%', textAlign: 'center', padding: '4px 0', fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)' }}>{d}</div>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} style={{ width: '14.28%' }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const entry = data[dateStr]
              const isToday = dateStr === todayStr
              return (
                <div key={day} onClick={() => openDetail(day)} style={{
                  width: '14.28%', padding: '3px 0', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: isToday ? 700 : 500,
                    background: isToday ? 'var(--primary-light)' : 'transparent',
                    color: 'var(--text-main)',
                  }}>{day}</div>
                  {entry?.mood ? (
                    <span style={{ fontSize: '14px', lineHeight: 1.2 }}>{entry.mood}</span>
                  ) : (
                    <span style={{ fontSize: '14px', lineHeight: 1.2, opacity: 0 }}>·</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 每日心情进度条 */}
        <div style={{ ...glassStyle, padding: '10px 16px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-sub)' }}>
          📊 本月记录
          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(244,114,182,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '4px', width: `${Math.min(100, (monthEntries.length / daysInMonth) * 100)}%`, background: 'linear-gradient(90deg,#f472b6,#ec4899)' }} />
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{monthEntries.length}/{daysInMonth}</span>
        </div>

        {/* 列表标题 */}
        <h3 style={{ margin: '16px 0 8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
          📋 {monthLabel} 心情记录
        </h3>

        {/* 列表 */}
        {monthEntries.length === 0 ? (
          <div style={{ ...glassStyle, padding: '24px 16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-sub)' }}>
            {month}月还没有记录，点右上角 + 添加今天的心情
          </div>
        ) : (
          monthEntries.map(([dateStr, entry]) => {
            const day = parseInt(dateStr.split('-')[2])
            return (
              <div key={dateStr} onClick={() => openDetail(day)} style={{
                ...glassStyle, padding: '10px 14px', marginBottom: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-sub)', minWidth: '32px' }}>{day}日</span>
                <span style={{ fontSize: '22px' }}>{entry.mood || '❓'}</span>
                {entry.weather && <span style={{ fontSize: '16px' }}>{entry.weather}</span>}
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.note || ''}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* 添加弹窗 */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="记录心情"
        footer={<div style={{ display: 'flex', gap: '10px' }}>
          <button style={btnGhost} onClick={() => setShowAdd(false)}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>}
      >
        <Field label="今天心情">
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button key={m.emoji} onClick={() => setForm(f => ({ ...f, mood: f.mood === m.emoji ? '' : m.emoji }))} style={{
                padding: '8px 12px', borderRadius: '8px', border: '1.5px solid',
                borderColor: form.mood === m.emoji ? m.color : 'rgba(0,0,0,0.06)',
                background: form.mood === m.emoji ? `${m.color}15` : '#fff',
                fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                <span style={{ fontSize: '18px' }}>{m.emoji}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="天气">
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {WEATHERS.map(w => (
              <button key={w.emoji} onClick={() => setForm(f => ({ ...f, weather: f.weather === w.emoji ? '' : w.emoji }))} style={{
                padding: '8px 12px', borderRadius: '8px', border: '1.5px solid',
                borderColor: form.weather === w.emoji ? '#6366f1' : 'rgba(0,0,0,0.06)',
                background: form.weather === w.emoji ? 'rgba(99,102,241,0.08)' : '#fff',
                fontSize: '14px', cursor: 'pointer',
              }}>{w.emoji}</button>
            ))}
          </div>
        </Field>
        <Field label="心事">
          <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="今天发生了什么？" rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', minHeight: '80px' }} />
        </Field>
      </Modal>

      {/* 查看/编辑详情弹窗 */}
      <Modal open={!!detailDay} onClose={() => setDetailDay(null)}
        title={detailDay ? `${detailDay.day}日 详情` : ''}
        footer={<div style={{ display: 'flex', gap: '10px' }}>
          {detailDay?.mood && <button style={{ ...btnGhost, color: '#fb7185' }} onClick={handleDelete}>删除</button>}
          <button style={btnGhost} onClick={() => setDetailDay(null)}>关闭</button>
          {detailDay?.mood && <button style={{ ...btnPrimary, flex: 1 }} onClick={handleEditSave}>保存修改</button>}
        </div>}
      >
        {detailDay && (
          <>
            <Field label="心情">
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {MOODS.map(m => (
                  <button key={m.emoji} onClick={() => setDetailDay(d => ({ ...d, mood: d.mood === m.emoji ? '' : m.emoji }))} style={{
                    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid',
                    borderColor: detailDay.mood === m.emoji ? m.color : 'rgba(0,0,0,0.06)',
                    background: detailDay.mood === m.emoji ? `${m.color}15` : '#fff',
                    fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    <span style={{ fontSize: '18px' }}>{m.emoji}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="天气">
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {WEATHERS.map(w => (
                  <button key={w.emoji} onClick={() => setDetailDay(d => ({ ...d, weather: d.weather === w.emoji ? '' : w.emoji }))} style={{
                    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid',
                    borderColor: detailDay.weather === w.emoji ? '#6366f1' : 'rgba(0,0,0,0.06)',
                    background: detailDay.weather === w.emoji ? 'rgba(99,102,241,0.08)' : '#fff',
                    fontSize: '14px', cursor: 'pointer',
                  }}>{w.emoji}</button>
                ))}
              </div>
            </Field>
            <Field label="心事">
              <textarea value={detailDay.note || ''} onChange={e => setDetailDay(d => ({ ...d, note: e.target.value }))}
                placeholder="今天发生了什么？" rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', minHeight: '80px' }} />
            </Field>
          </>
        )}
      </Modal>
    </div>
  )
}
