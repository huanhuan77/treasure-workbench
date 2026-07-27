import { useState, useCallback, useEffect } from 'react'
import { useStore } from '../store'
import { todayStr } from '../utils/helpers'

const MOODS = ['😊', '🥰', '😐', '😢', '😡']

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const dt = new Date(y, m - 1, d)
  return `${m}月${d}日 周${weekdays[dt.getDay()]}`
}

export function MoodDrawer({ open, onClose }) {
  const { getMood, setMood, moodData } = useStore()
  const today = todayStr()
  const todayEntry = getMood(today)
  const [mood, setMoodState] = useState(todayEntry?.mood || '')
  const [quote, setQuote] = useState(todayEntry?.quote || '')

  // 当 drawer 打开时同步最新数据
  useEffect(() => {
    if (open) {
      const entry = getMood(today)
      setMoodState(entry?.mood || '')
      setQuote(entry?.quote || '')
    }
  }, [open, getMood, today])

  const handleMood = useCallback((emoji) => {
    setMoodState(emoji)
    setMood(today, emoji, quote)
  }, [today, quote, setMood])

  const handleBlur = useCallback(() => {
    setMood(today, mood, quote)
  }, [today, mood, quote, setMood])

  const recent = [...(moodData || [])].slice(0, 5)

  return (
    <>
      {/* 遮罩 */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 200,
            transition: 'opacity 0.3s',
          }}
        />
      )}

      {/* 抽屉 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '300px',
        maxWidth: '82vw',
        background: '#fff',
        zIndex: 201,
        transform: open ? 'translateX(0)' : 'translateX(-110%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '20px 16px 30px',
        boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
      }}>
        {/* 关闭按钮 */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '50%',
          width: '32px', height: '32px', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--gray-400)',
        }}>✕</button>

        {/* 标题 */}
        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>
          {formatDate(today)}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--gray-400)' }}>
          今天心情怎么样？
        </p>

        {/* 心情选择 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          {MOODS.map((m) => (
            <button key={m} onClick={() => handleMood(m)} style={{
              fontSize: '26px', cursor: 'pointer', padding: '6px 8px', borderRadius: '12px',
              border: mood === m ? '2px solid var(--primary)' : '2px solid transparent',
              background: mood === m ? 'rgba(236,72,182,0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}>{m}</button>
          ))}
        </div>

        {/* 每日一句话 */}
        <textarea
          placeholder="记录今天的感受…"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          onBlur={handleBlur}
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: '70px',
            padding: '10px 12px', borderRadius: '12px',
            border: '1px solid rgba(236,72,182,0.2)',
            background: 'rgba(252,231,243,0.3)',
            fontSize: '13px', lineHeight: 1.6, resize: 'vertical',
            outline: 'none', fontFamily: 'inherit',
            marginBottom: '20px',
          }}
        />

        {/* 最近记录 */}
        <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>最近记录</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recent.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--gray-300)', margin: 0 }}>暂无记录</p>
          )}
          {recent.map((entry) => (
            <div key={entry.date} style={{
              padding: '8px 10px', borderRadius: '10px',
              background: 'rgba(252,231,243,0.35)',
              fontSize: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: entry.quote ? '4px' : 0 }}>
                <span style={{ fontSize: '16px' }}>{entry.mood || '😶'}</span>
                <span style={{ color: 'var(--text-sub)', fontWeight: 500 }}>{formatDate(entry.date)}</span>
              </div>
              {entry.quote && (
                <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {entry.quote}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
