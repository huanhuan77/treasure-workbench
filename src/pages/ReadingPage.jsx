import { useState, useEffect } from 'react'
import { glassStyle, inputStyle } from '../components/Modal'
import {
  BOOK_GROUPS,
  SELF_QUESTIONS,
  loadData,
  saveData,
  progressOf,
} from '../utils/readingThinking'

const PINK = '#b8517f'
const PINK_SOFT = '#ee8fb6'

export function ReadingPage() {
  const [data, setData] = useState(loadData)

  useEffect(() => {
    saveData(data)
  }, [data])

  const progress = progressOf(data)

  const patchBook = (id, patch) =>
    setData((d) => ({ ...d, books: d.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
  const patchShow = (id, patch) =>
    setData((d) => ({ ...d, shows: d.shows.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))

  const booksByGroup = BOOK_GROUPS.map((g) => ({
    ...g,
    items: data.books.filter((b) => b.group === g.key),
  }))

  return (
    <div className="app-container">
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(16px + var(--safe-top)) 8px 12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📚 思辨训练合集</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>书单 + 访谈片单 · 练习独立思考</p>
        </div>
      </div>

      {/* 进度卡片 */}
      <div style={{ padding: '0 8px 12px' }}>
        <div style={{ ...glassStyle, padding: '14px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>打卡进度</span>
            <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{progress.done}/{progress.total} 项 · {progress.percent}%</span>
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(135deg, ${PINK_SOFT}, ${PINK})`, width: `${progress.percent}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {/* 自检三问提示 */}
      <div style={{ padding: '0 8px 12px' }}>
        <div style={{ ...glassStyle, padding: '12px 14px', borderLeft: `3px solid ${PINK}` }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: PINK, marginBottom: '6px' }}>📌 通用自检三问（看书、看访谈每期 / 每章必问）</div>
          {SELF_QUESTIONS.map((q, i) => (
            <div key={i} style={{ fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.7, display: 'flex', gap: 6 }}>
              <span style={{ fontWeight: 700, color: PINK_SOFT, flexShrink: 0 }}>{i + 1}.</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 书单 */}
      <div style={{ padding: '0 8px calc(90px + var(--safe-bottom))' }}>
        <SectionTitle emoji="📖" title="书单" />
        {booksByGroup.map((g) => (
          <div key={g.key} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '10px 2px 8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{g.title}</span>
              {g.hint && <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{g.hint}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.items.map((b) => (
                <BookCard key={b.id} book={b} onChange={patchBook} />
              ))}
            </div>
          </div>
        ))}

        {/* 片单 */}
        <SectionTitle emoji="🎙️" title="访谈片单" style={{ marginTop: 18 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.shows.map((s) => (
            <ShowCard key={s.id} show={s} onChange={patchShow} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ emoji, title, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 2px 10px', ...style }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{title}</span>
      <span style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
    </div>
  )
}

function Checkbox({ done, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
        border: done ? 'none' : '1.5px solid rgba(0,0,0,0.18)',
        background: done ? PINK : 'rgba(255,255,255,0.6)',
        color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: '22px', padding: 0,
      }}
    >
      {done ? '✓' : ''}
    </button>
  )
}

function NoteAndAnswers({ item, onChange }) {
  const [open, setOpen] = useState(false)
  const setAnswer = (q, val) =>
    onChange(item.id, { answers: { ...item.answers, [q]: val } })

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        style={{ ...inputStyle, minHeight: 56, resize: 'vertical', fontSize: 13, lineHeight: 1.6 }}
        placeholder="笔记 / 感悟"
        value={item.note || ''}
        onChange={(e) => onChange(item.id, { note: e.target.value })}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(184,81,127,0.3)',
          background: 'rgba(184,81,127,0.08)', color: PINK, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {open ? '▾ 收起自检三问' : '▸ 自检三问'}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,251,235,0.7)' }}>
          {SELF_QUESTIONS.map((q, i) => {
            const key = `q${i + 1}`
            return (
              <div key={key}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#8a6a3a', marginBottom: 4 }}>{i + 1}. {q}</div>
                <textarea
                  style={{ ...inputStyle, minHeight: 48, resize: 'vertical', fontSize: 12.5, lineHeight: 1.6 }}
                  placeholder="写下你的思考…"
                  value={item.answers?.[key] || ''}
                  onChange={(e) => setAnswer(key, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BookCard({ book, onChange }) {
  return (
    <div style={{ ...glassStyle, padding: '12px 14px', borderLeft: `3px solid ${PINK_SOFT}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Checkbox done={book.done} onToggle={() => onChange(book.id, { done: !book.done })} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: book.done ? 'var(--text-sub)' : 'var(--text-main)', textDecoration: book.done ? 'line-through' : 'none' }}>
            {book.title}
          </div>
          {book.focus && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.55 }}>{book.focus}</p>}
        </div>
      </div>
      <NoteAndAnswers item={book} onChange={onChange} />
    </div>
  )
}

function ShowCard({ show, onChange }) {
  return (
    <div style={{ ...glassStyle, padding: '12px 14px', borderLeft: '3px solid #6d8a9a' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Checkbox done={show.done} onToggle={() => onChange(show.id, { done: !show.done })} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: show.done ? 'var(--text-sub)' : 'var(--text-main)', textDecoration: show.done ? 'line-through' : 'none' }}>
              {show.program}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{show.episode}</span>
          </div>
          <div style={{ fontSize: 11, color: '#6d4bc4', fontWeight: 600, marginTop: 2 }}>📍 {show.platform}</div>
          {show.focus && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.55 }}>{show.focus}</p>}
        </div>
      </div>
      <NoteAndAnswers item={show} onChange={onChange} />
    </div>
  )
}
