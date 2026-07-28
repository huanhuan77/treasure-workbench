import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

const WEATHERS = ['☀️', '🌤', '☁️', '🌧', '⛈', '🌨', '🌫']

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {} }
  catch { return {} }
}
function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) }

export function CalendarDetailPage() {
  const { date } = useParams()
  const navigate = useNavigate()
  const { show } = useToast()
  const [mood, setMood] = useState('')
  const [weather, setWeather] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const data = loadData()
    const entry = data[date] || {}
    setMood(entry.mood || '')
    setWeather(entry.weather || '')
    setNote(entry.note || '')
  }, [date])

  const dateObj = new Date(date)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const label = `${parseInt(date.split('-')[1])}月${parseInt(date.split('-')[2])}日 星期${weekDays[dateObj.getDay()]}`
  const isToday = date === new Date().toISOString().slice(0, 10)

  const handleSave = () => {
    const data = loadData()
    data[date] = { mood, weather, note: note.trim() }
    saveData(data)
    show('已保存', 'success')
    navigate('/calendar')
  }

  const handleDelete = () => {
    const data = loadData()
    delete data[date]
    saveData(data)
    show('已删除', 'success')
    navigate('/calendar')
  }

  return (
    <div className="app-container">
      {/* 顶部栏 */}
      <div style={{
        padding: 'calc(16px + var(--safe-top)) 16px 12px',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <button onClick={() => navigate('/calendar')} style={{
          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
          background: 'rgba(244,114,182,0.08)', color: 'var(--primary)',
          fontSize: '18px', cursor: 'pointer', flexShrink: 0,
        }}>‹</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
            {isToday ? '今天' : label}
          </h1>
          {isToday && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>{label}</p>}
        </div>
        {mood && <span style={{ fontSize: '28px' }}>{mood}</span>}
      </div>

      <div style={{ padding: '16px' }}>
        {/* 心情选择 */}
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', display: 'block' }}>今天心情</label>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {MOODS.map(m => (
            <button key={m.emoji} onClick={() => setMood(mood === m.emoji ? '' : m.emoji)} style={{
              padding: '10px 14px', borderRadius: '10px', border: '1.5px solid',
              borderColor: mood === m.emoji ? m.color : 'rgba(0,0,0,0.06)',
              background: mood === m.emoji ? `${m.color}15` : '#fff',
              fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '20px' }}>{m.emoji}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{m.label}</span>
            </button>
          ))}
        </div>

        {/* 天气选择 */}
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', display: 'block' }}>天气</label>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {WEATHERS.map(w => (
            <button key={w} onClick={() => setWeather(weather === w ? '' : w)} style={{
              padding: '10px 14px', borderRadius: '10px', border: '1.5px solid',
              borderColor: weather === w ? '#6366f1' : 'rgba(0,0,0,0.06)',
              background: weather === w ? 'rgba(99,102,241,0.08)' : '#fff',
              fontSize: '20px', cursor: 'pointer',
            }}>{w}</button>
          ))}
        </div>

        {/* 心事（大输入框） */}
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', display: 'block' }}>
          日记 / 心事
        </label>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder={`今天发生了什么？\n有什么想记录的？`}
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: '240px', padding: '14px',
            borderRadius: '12px', border: '1.5px solid rgba(0,0,0,0.06)',
            fontSize: '15px', lineHeight: 1.7, outline: 'none', resize: 'vertical',
            fontFamily: 'inherit', background: '#fff',
          }}
        />

        {/* 保存/删除 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={handleSave} style={{
            flex: 1, padding: '14px 0', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
          }}>💾 保存</button>
          {mood && (
            <button onClick={handleDelete} style={{
              padding: '12px 20px', borderRadius: '10px', border: '1px solid #fecaca',
              background: '#fff', color: '#ef4444', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>删除</button>
          )}
        </div>

        {/* 提示 */}
        {!mood && !note && (
          <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-sub)', textAlign: 'center' }}>
            选择心情、天气，写下今天的故事吧 ✍️
          </p>
        )}
      </div>
    </div>
  )
}
