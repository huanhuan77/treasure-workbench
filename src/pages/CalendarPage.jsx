import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'

const STORAGE_KEY = 'blogger_calendar_v1'

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {} }
  catch { return {} }
}

export function CalendarPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const importRef = useRef(null)

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const today = new Date().toISOString().slice(0, 10)

  const monthEntries = Object.entries(data)
    .filter(([k]) => k.startsWith(`${year}-${String(month).padStart(2,'0')}`))
    .sort(([a], [b]) => b.localeCompare(a))

  const goDate = (dateStr) => navigate(`/calendar/${dateStr}`)
  const goToday = () => goDate(today)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `日历备份_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    show('已导出', 'success')
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (typeof imported !== 'object') throw new Error()
        localStorage.setItem('blogger_calendar_v1', JSON.stringify(imported))
        setData(imported)
        show(`已导入 ${Object.keys(imported).length} 条记录`, 'success')
      } catch {
        show('文件格式错误', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📅 日历</h1>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={handleExport} style={{
            padding: '8px 10px', borderRadius: '8px', border: 'none',
            background: 'rgba(16,185,129,0.1)', color: '#059669',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>⬇ 导出</button>
          <button onClick={() => importRef.current?.click()} style={{
            padding: '8px 10px', borderRadius: '8px', border: 'none',
            background: 'rgba(99,102,241,0.1)', color: '#4f46e5',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>⬆ 导入</button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} hidden />
          <button onClick={goToday} style={{
            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
            fontSize: '20px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,114,182,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>+</button>
        </div>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 月历 */}
        <div style={{ ...glassStyle, padding: '12px 8px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '0 8px' }}>
            <button onClick={() => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }}
              style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '16px', cursor: 'pointer' }}>‹</button>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{year}年{month}月</span>
            <button onClick={() => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }}
              style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '16px', cursor: 'pointer' }}>›</button>
          </div>
          <div style={{ display: 'flex' }}>
            {weekDays.map(d => <div key={d} style={{ width: '14.28%', textAlign: 'center', padding: '4px 0', fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)' }}>{d}</div>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} style={{ width: '14.28%' }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const entry = data[dateStr]
              const isToday = dateStr === today
              return (
                <div key={day} onClick={() => goDate(dateStr)} style={{
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
                  ) : <span style={{ height: '16px' }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* 进度 */}
        <div style={{ ...glassStyle, padding: '10px 16px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-sub)' }}>
          📊 本月 {monthEntries.length}/{daysInMonth} 天
          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(244,114,182,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '4px', width: `${Math.min(100, (monthEntries.length / daysInMonth) * 100)}%`, background: 'linear-gradient(90deg,#f472b6,#ec4899)' }} />
          </div>
        </div>

        {/* 列表 */}
        <h3 style={{ margin: '16px 0 8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{month}月记录</h3>
        {monthEntries.length === 0 ? (
          <div style={{ ...glassStyle, padding: '24px 16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-sub)' }}>
            还没有记录，点右上角 + 开始写日记
          </div>
        ) : (
          monthEntries.map(([dateStr, entry]) => (
            <div key={dateStr} onClick={() => goDate(dateStr)} style={{
              ...glassStyle, padding: '10px 14px', marginBottom: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-sub)', minWidth: '32px' }}>{parseInt(dateStr.split('-')[2])}日</span>
              {entry.mood && <span style={{ fontSize: '22px' }}>{entry.mood}</span>}
              {entry.weather && <span style={{ fontSize: '16px' }}>{entry.weather}</span>}
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.note || ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
