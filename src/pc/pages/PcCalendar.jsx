import { useMemo, useState } from 'react'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { recordDelete } from '../../utils/sync'
import { WEATHER_LIST, WeatherIcon } from '../components/WeatherIcon'

// PC 版「日记本」（原「日历」页，用户要求改成记事本 / 日记）：
//   · 左侧：全部日记按日期倒序列出（可搜索），点一条就在右侧编辑
//   · 右侧：日期 / 心情 / 天气 / 正文，保存、删除都在这一栏
// 数据层完全沿用手机版 CalendarPage：直接读写 localStorage 的 `blogger_calendar_v1`
// （**不走 store**），删除时调 recordDelete 记墓碑以同步；存储结构不变，
// 所以手机端「日历」与这里看到的是同一批日记。
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
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

// 解析后必须保证是「普通对象」：备份恢复 / 历史脏数据可能把 null、数组、字符串写进这个 key，
// 后面 Object.entries(data) 遇到 null 会抛错，整页白屏。
const load = () => {
  try {
    const r = localStorage.getItem(STORAGE_KEY)
    if (!r) return {}
    const parsed = JSON.parse(r)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}
const persist = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function weekdayOf(dateStr) {
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? '' : `星期${WEEK[d.getDay()]}`
}

// 「2026-10-19」→「10月19日」
function shortDate(dateStr) {
  const p = String(dateStr).split('-')
  if (p.length < 3) return dateStr
  return `${parseInt(p[1], 10)}月${parseInt(p[2], 10)}日`
}

export function PcCalendar() {
  const { show } = useToast()
  const [data, setData] = useState(load)
  const [keyword, setKeyword] = useState('')

  // 正在编辑：editingKey 是「这条日记原本的日期」（新建时为空串）
  const [editingKey, setEditingKey] = useState(null)
  const [date, setDate] = useState('')
  const [mood, setMood] = useState('')
  const [weather, setWeather] = useState('')
  const [note, setNote] = useState('')
  const [delOpen, setDelOpen] = useState(false)

  const today = todayStr()

  // 全部日记按日期倒序；搜索命中日期、心情标签或正文
  const entries = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return Object.entries(data)
      .filter(([k, v]) => {
        if (!v) return false
        if (!kw) return true
        const moodLabel = (MOODS.find((m) => m.emoji === v.mood) || {}).label || ''
        return k.includes(kw) || String(v.note || '').toLowerCase().includes(kw) || moodLabel.includes(kw)
      })
      .sort(([a], [b]) => b.localeCompare(a))
  }, [data, keyword])

  const total = Object.keys(data).filter((k) => data[k]).length
  const thisMonth = Object.keys(data).filter((k) => k.startsWith(today.slice(0, 7))).length

  const openEntry = (key) => {
    const e = data[key] || {}
    setEditingKey(key)
    setDate(key)
    setMood(e.mood || '')
    setWeather(e.weather || '')
    setNote(e.note || '')
  }

  // 「写今天」：今天已有日记就打开它，否则建一条空白
  const writeToday = () => {
    if (data[today]) { openEntry(today); return }
    setEditingKey('')
    setDate(today)
    setMood('')
    setWeather('')
    setNote('')
  }

  const save = () => {
    if (!date) { show('请选择日期', 'error'); return }
    const next = { ...data }
    // 改过日期 → 把旧那天的条目挪走，避免同一篇留在两个日期下
    if (editingKey && editingKey !== date) delete next[editingKey]
    next[date] = { mood, weather, note: note.trim() }
    persist(next)
    setData(next)
    setEditingKey(date)
    show('已保存', 'success')
  }

  const del = () => {
    const key = editingKey || date
    if (!key) return
    const next = { ...data }
    delete next[key]
    persist(next)
    try { recordDelete(STORAGE_KEY, key) } catch (e) { /* 同步模块异常不影响本地删除 */ }
    setData(next)
    setDelOpen(false)
    setEditingKey(null)
    setNote('')
    show('已删除', 'success')
  }

  const editing = editingKey !== null
  const charCount = note.trim().length

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">日记本</div>
          <div className="pcv-sub">
            共 {total} 篇 · 本月 {thisMonth} 篇{total === 0 ? ' · 点右上角「写今天」开始' : ''}
          </div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 200 }}
          placeholder="搜索正文 / 日期 / 心情"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button className="pcv-btn" onClick={writeToday}>✎ 写今天</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        <div
          style={{
            display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 14,
            alignItems: 'stretch', height: '100%', minHeight: 0,
          }}
        >
          {/* 左：日记列表 */}
          <div className="pcv-card pcv-card--scroll">
            <div className="pcv-card-h">
              <span>全部日记</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>{entries.length} 篇</span>
            </div>
            {entries.length === 0 ? (
              <div className="pcv-empty">
                {keyword ? '没有匹配的日记' : '还没有日记，点右上角「写今天」写第一篇'}
              </div>
            ) : (
              <div>
                {entries.map(([key, e]) => {
                  const on = editingKey === key
                  const m = MOODS.find((x) => x.emoji === e.mood)
                  return (
                    <button
                      key={key}
                      onClick={() => openEntry(key)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                        padding: '10px 14px', border: 'none', borderBottom: '0.5px solid rgba(15,23,42,0.06)',
                        background: on ? '#fdf1f6' : 'transparent',
                        borderLeft: on ? '3px solid #b8517f' : '3px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: on ? '#b8517f' : '#333a45' }}>
                          {shortDate(key)}
                        </span>
                        <span style={{ fontSize: 11, color: '#9aa0a9' }}>{weekdayOf(key)}</span>
                        {key === today && (
                          <span className="pcv-chip" style={{ background: '#fdf1f6', color: '#b8517f', fontSize: 10 }}>今天</span>
                        )}
                        <div style={{ flex: 1 }} />
                        {m && <span style={{ fontSize: 12 }} title={m.label}>{m.emoji}</span>}
                        {e.weather && <WeatherIcon value={e.weather} size={13} />}
                      </div>
                      <div style={{
                        fontSize: 12, color: e.note ? '#6b7280' : '#c9cdd4',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {e.note || '（空白日记）'}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 右：编辑区 */}
          <div className="pcv-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {!editing ? (
              <div className="pcv-empty" style={{ padding: '60px 0' }}>
                选左边一篇日记，或点右上角「✎ 写今天」开始写
              </div>
            ) : (
              <>
                <div className="pcv-card-h">
                  <span>{date ? `${shortDate(date)} ${weekdayOf(date)}` : '新日记'}</span>
                  <div className="pcv-spacer" />
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>{charCount} 字</span>
                </div>

                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
                  {/* 日期 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="pcv-field-label" style={{ margin: 0, minWidth: 30 }}>日期</span>
                    <input
                      className="pcv-input"
                      type="date"
                      style={{ width: 170 }}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    {editingKey && editingKey !== date && (
                      <span style={{ fontSize: 11, color: '#b1702c' }}>保存后会从 {shortDate(editingKey)} 挪过来</span>
                    )}
                  </div>

                  {/* 心情 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="pcv-field-label" style={{ margin: 0, minWidth: 30 }}>心情</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {MOODS.map((m) => {
                        const on = mood === m.emoji
                        return (
                          <button
                            key={m.emoji}
                            title={m.label}
                            onClick={() => setMood(on ? '' : m.emoji)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
                              fontSize: 12, fontWeight: on ? 600 : 400,
                              border: `0.5px solid ${on ? m.color : 'rgba(15,23,42,0.10)'}`,
                              background: on ? `${m.color}18` : '#fff',
                              color: on ? m.color : '#4b5563',
                            }}
                          >{m.emoji}{m.label}</button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 天气 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="pcv-field-label" style={{ margin: 0, minWidth: 30 }}>天气</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {WEATHER_LIST.map((w) => {
                        const on = weather === w.emoji
                        return (
                          <button
                            key={w.emoji}
                            onClick={() => setWeather(on ? '' : w.emoji)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
                              fontSize: 12, fontWeight: on ? 600 : 400,
                              border: `0.5px solid ${on ? '#b8517f' : 'rgba(15,23,42,0.10)'}`,
                              background: on ? '#fdf1f6' : '#fff',
                              color: on ? '#b8517f' : '#4b5563',
                            }}
                          >
                            <WeatherIcon value={w.emoji} size={14} />{w.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 正文 */}
                  <textarea
                    className="pcv-input"
                    style={{
                      flex: 1, minHeight: 180, resize: 'none', lineHeight: 1.9,
                      padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
                    }}
                    placeholder="今天发生了什么？随便写点…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="pcv-dialog-f" style={{ borderTop: '0.5px solid rgba(15,23,42,0.06)', padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, color: '#9aa0a9' }}>按日期归档，手机端「日历」能看到同一批日记</span>
                  <div className="pcv-spacer" />
                  {editingKey && data[editingKey] && (
                    <button className="pcv-btn pcv-btn-ghost pcv-btn-ghost--danger" onClick={() => setDelOpen(true)}>删除</button>
                  )}
                  <button className="pcv-btn" style={{ marginLeft: 8 }} onClick={save}>保存</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={del}
        title="删除日记"
        message={`确定删除 ${editingKey ? shortDate(editingKey) : ''} 的日记吗？此操作不可撤销。`}
      />
    </>
  )
}
