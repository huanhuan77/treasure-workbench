import { useMemo, useState } from 'react'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { recordDelete } from '../../utils/sync'

// PC 版「日历」（日记 / 心情 / 天气）。
// 数据照手机版 CalendarPage / CalendarDetailPage：直接读写 localStorage 的
// `blogger_calendar_v1`（**不走 store**），删除时调 recordDelete 记墓碑以同步。
// 结构：左月历 + 右「本月记录」列表；点某一天开弹窗写日记（PC 端不跳页面，
// 手机版是跳到 /calendar/:date 整页 —— 那个页面在 PC 侧没有入口）。
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
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const load = () => {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}
const persist = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateLabel(dateStr) {
  const parts = String(dateStr).split('-')
  const d = new Date(dateStr)
  return `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日 星期${WEEK[d.getDay()]}`
}

export function PcCalendar() {
  const { show } = useToast()
  // 手机版是挂载时读一次；这里存到 state，写完/删完能立刻反映到月历上（存储格式完全一致）
  const [data, setData] = useState(load)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [openDate, setOpenDate] = useState(null)
  const [delOpen, setDelOpen] = useState(false)
  const [mood, setMood] = useState('')
  const [weather, setWeather] = useState('')
  const [note, setNote] = useState('')

  const today = todayStr()
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const monthPrefix = `${year}-${pad(month)}`

  const monthEntries = useMemo(
    () => Object.entries(data)
      .filter(([k]) => k.startsWith(monthPrefix))
      .sort(([a], [b]) => b.localeCompare(a)),
    [data, monthPrefix],
  )

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }
  const goToday = () => {
    const d = new Date()
    setYear(d.getFullYear()); setMonth(d.getMonth() + 1)
    openDay(todayStr())
  }

  const openDay = (dateStr) => {
    const e = data[dateStr] || {}
    setMood(e.mood || '')
    setWeather(e.weather || '')
    setNote(e.note || '')
    setOpenDate(dateStr)
  }

  const saveEntry = () => {
    if (!openDate) return
    const next = { ...data, [openDate]: { mood, weather, note: note.trim() } }
    persist(next)
    setData(next)
    show('已保存', 'success')
    setOpenDate(null)
  }

  const delEntry = () => {
    if (!openDate) return
    const next = { ...data }
    delete next[openDate]
    persist(next)
    try { recordDelete(STORAGE_KEY, openDate) } catch (e) { /* 同步模块异常不影响本地删除 */ }
    setData(next)
    setDelOpen(false)
    setOpenDate(null)
    show('已删除', 'success')
  }

  const isEntryDate = openDate && data[openDate]

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">日历</div>
          <div className="pcv-sub">
            {year} 年 {month} 月 · 本月 {monthEntries.length}/{daysInMonth} 天有记录
          </div>
        </div>
        <div className="pcv-spacer" />
        <button className="pcv-btn pcv-btn-ghost" onClick={prevMonth}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 84, textAlign: 'center' }}>{year}年{month}月</span>
        <button className="pcv-btn pcv-btn-ghost" onClick={nextMonth}>›</button>
        <button className="pcv-btn" onClick={goToday}>今天</button>
      </div>

      <div className="pcv-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
          {/* 月历 */}
          <div className="pcv-card">
            <div className="pcv-card-h">
              <span>📅 {year} 年 {month} 月</span>
              <div className="pcv-spacer" />
              <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>
                点日期写日记 · 今天已框出
              </span>
            </div>
            <div className="pcv-cal">
              <div className="pcv-cal-week">
                {WEEK.map((w) => <div key={w}>{w}</div>)}
              </div>
              <div className="pcv-cal-grid">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="pcv-cal-cell empty" />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dateStr = `${monthPrefix}-${pad(day)}`
                  const e = data[dateStr]
                  const isToday = dateStr === today
                  return (
                    <div
                      key={day}
                      className={`pcv-cal-cell${isToday ? ' today' : ''}`}
                      onClick={() => openDay(dateStr)}
                      title={e?.note || ''}
                    >
                      <span className="pcv-cal-day">{day}</span>
                      {(e?.mood || e?.weather) && (
                        <span className="pcv-cal-mark">
                          {e?.mood || ''}{e?.weather ? ` ${e.weather}` : ''}
                        </span>
                      )}
                      {e?.note && <span className="pcv-cal-note">{e.note}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 本月记录 */}
          <div className="pcv-card pcv-card--scroll">
            <div className="pcv-card-h">
              <span>{month} 月记录</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>{monthEntries.length} 天</span>
            </div>
            {monthEntries.length === 0 ? (
              <div className="pcv-empty">这个月还没有记录，点左边任意一天开始写</div>
            ) : monthEntries.map(([dateStr, entry]) => (
              <div
                key={dateStr}
                className="pcv-copyitem"
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => openDay(dateStr)}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#9aa0a9', minWidth: 34, flexShrink: 0 }}>
                  {parseInt(dateStr.split('-')[2], 10)}日
                </span>
                {entry.mood && <span style={{ fontSize: 18, flexShrink: 0 }}>{entry.mood}</span>}
                {entry.weather && <span style={{ fontSize: 14, flexShrink: 0 }}>{entry.weather}</span>}
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#333a45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.note || <span style={{ color: '#c9cdd4' }}>（没写内容）</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 写日记：弹窗 */}
      {openDate && (
        <div className="pcv-overlay" onClick={() => setOpenDate(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{openDate === today ? '今天' : dateLabel(openDate)}</span>
              {openDate === today && (
                <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>{dateLabel(openDate)}</span>
              )}
              {mood && <span style={{ fontSize: 18 }}>{mood}</span>}
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setOpenDate(null)}>×</button>
            </div>

            <div className="pcv-dialog-b">
              <div className="pcv-field-label">今天心情</div>
              <div className="pcv-catpick">
                {MOODS.map((m) => (
                  <button
                    key={m.emoji}
                    className={mood === m.emoji ? 'on' : ''}
                    style={mood === m.emoji ? { borderColor: m.color, background: `${m.color}15`, color: m.color } : undefined}
                    onClick={() => setMood(mood === m.emoji ? '' : m.emoji)}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16 }}>天气</div>
              <div className="pcv-catpick">
                {WEATHERS.map((w) => (
                  <button
                    key={w}
                    className={weather === w ? 'on' : ''}
                    onClick={() => setWeather(weather === w ? '' : w)}
                  >{w}</button>
                ))}
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16 }}>日记 / 心事</div>
              <textarea
                className="pcv-input"
                style={{ width: '100%', minHeight: 200, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                placeholder={'今天发生了什么？\n有什么想记录的？'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
            </div>

            <div className="pcv-dialog-f">
              {isEntryDate && (
                <button
                  className="pcv-btn pcv-btn-ghost"
                  style={{ color: '#b96a66', borderColor: 'rgba(185, 106, 102, 0.35)' }}
                  onClick={() => setDelOpen(true)}
                >删除</button>
              )}
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setOpenDate(null)}>取消</button>
              <button className="pcv-btn" onClick={saveEntry}>保存</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={delEntry}
        title="删除这天的记录"
        message={openDate ? `确定删除「${dateLabel(openDate)}」的心情与日记吗？` : ''}
        confirmText="删除"
        danger
      />
    </>
  )
}
