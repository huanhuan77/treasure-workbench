import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { todayStr } from '../utils/helpers'

const MOODS = [
  { emoji: '😊', label: '开心' },
  { emoji: '🥰', label: '很赞' },
  { emoji: '😐', label: '一般' },
  { emoji: '😢', label: '难过' },
  { emoji: '😡', label: '生气' },
]

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const dt = new Date(y, m - 1, d)
  return `${m}月${d}日 周${weekdays[dt.getDay()]}`
}

function getRecentDates(n) {
  const today = new Date()
  const dates = []
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yy}-${mm}-${dd}`)
  }
  return dates
}

export function MoodPage() {
  const { moodData, getMood, setMood } = useStore()
  const today = todayStr()
  const todayEntry = getMood(today)
  const [mood, setMoodState] = useState(todayEntry?.mood || '')
  const [quote, setQuote] = useState(todayEntry?.quote || '')
  const [saved, setSaved] = useState(false)

  // 切换心情
  const handleMood = useCallback((emoji) => {
    setMoodState(emoji)
    setMood(today, emoji, quote)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [today, quote, setMood])

  // 保存每日一句话（失焦时）
  const handleBlur = useCallback(() => {
    setMood(today, mood, quote)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [today, mood, quote, setMood])

  const recentDates = getRecentDates(7)

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%)',
        borderRadius: '20px',
        padding: '24px 20px',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
          {formatDate(today)}
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--gray-400)' }}>
          今天心情怎么样？
        </p>

        {/* 心情选择 */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '20px' }}>
          {MOODS.map((m) => (
            <button
              key={m.emoji}
              onClick={() => handleMood(m.emoji)}
              style={{
                background: mood === m.emoji ? 'rgba(236,72,182,0.15)' : 'rgba(255,255,255,0.6)',
                border: mood === m.emoji ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: '16px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
                fontSize: '24px',
              }}
            >
              <span>{m.emoji}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: mood === m.emoji ? 600 : 400 }}>{m.label}</span>
            </button>
          ))}
        </div>

        {/* 每日一句话 */}
        <div style={{ position: 'relative' }}>
          <textarea
            placeholder="记录今天的感受或一句话…"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            onBlur={handleBlur}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: '80px',
              padding: '12px 14px',
              borderRadius: '14px',
              border: '1px solid rgba(236,72,182,0.2)',
              background: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--text-main)',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {saved && (
            <span style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              fontSize: '12px',
              color: 'var(--primary)',
              background: 'rgba(255,255,255,0.85)',
              padding: '2px 8px',
              borderRadius: '8px',
              fontWeight: 500,
            }}>已保存 ✓</span>
          )}
        </div>
      </div>

      {/* 最近记录 */}
      <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>最近记录</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {recentDates.map((date) => {
          const entry = getMood(date)
          if (!entry) {
            return (
              <div key={date} style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(0,0,0,0.02)',
                fontSize: '13px',
                color: 'var(--gray-300)',
              }}>
                {formatDate(date)} 未记录
              </div>
            )
          }
          return (
            <div key={date} style={{
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'rgba(252,231,243,0.4)',
              border: '1px solid rgba(236,72,182,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: entry.quote ? '6px' : 0 }}>
                <span style={{ fontSize: '20px' }}>{entry.mood || '😶'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 500 }}>{formatDate(date)}</span>
              </div>
              {entry.quote && (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {entry.quote}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
