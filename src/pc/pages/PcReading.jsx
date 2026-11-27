import { useMemo, useState } from 'react'
import { useToast } from '../../components/Toast'
import {
  BOOK_GROUPS,
  SELF_QUESTIONS,
  loadData,
  saveData,
  progressOf,
} from '../../utils/readingThinking'

// PC 版「思辨训练合集」。
// 数据与手机端 ReadingPage 共用 readingThinking 模块，读写同一 localStorage key；
// 展示为分组表格，行内勾选完成，感悟 / 自检三问在弹窗里编辑。
export function PcReading() {
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const [target, setTarget] = useState(null) // { kind: 'book' | 'show', id }

  const persist = (next) => { saveData(next); setData(next) }
  const progress = progressOf(data)

  const patchItem = (kind, id, patch) =>
    persist({
      ...data,
      [kind]: data[kind].map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })

  const booksByGroup = useMemo(
    () => BOOK_GROUPS.map((g) => ({ ...g, items: data.books.filter((b) => b.group === g.key) })),
    [data],
  )

  const openEdit = (kind, id) => setTarget({ kind, id })
  const targetItem = target
    ? data[target.kind].find((x) => x.id === target.id)
    : null

  const closeEdit = () => setTarget(null)

  const saveEdit = (note, answers) => {
    if (!target) return
    patchItem(target.kind, target.id, { note, answers })
    show('已保存', 'success')
    closeEdit()
  }

  const hasAnswers = (it) => it.answers && Object.values(it.answers).some((v) => (v || '').trim())

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">思辨训练合集</div>
          <div className="pcv-sub">书单 + 访谈片单 · 练习独立思考 · 已完成 {progress.done}/{progress.total}（{progress.percent}%）</div>
        </div>
      </div>

      <div className="pcv-body pcv-body--fill" style={{ overflowY: 'auto' }}>
        {/* 自检三问提示 */}
        <div className="pcv-card" style={{ padding: '12px 16px', marginBottom: 14, borderLeft: '3px solid #b8517f' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#b8517f', marginBottom: 6 }}>📌 通用自检三问（看书、看访谈每期 / 每章必问）</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {SELF_QUESTIONS.map((q, i) => (
              <div key={i} style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.6, display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, color: '#ee8fb6' }}>{i + 1}.</span><span>{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 书单 */}
        {booksByGroup.map((g) => (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 2px 8px' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>📖 {g.title}</span>
              {g.hint && <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{g.hint}</span>}
            </div>
            <div className="pcv-card pcv-card--scroll" style={{ padding: 0 }}>
              <table className="pcv-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>已读</th>
                    <th style={{ width: 210 }}>书名</th>
                    <th>阅读重点</th>
                    <th style={{ width: 150 }}>感悟 / 三问</th>
                    <th style={{ width: 90 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <Check done={it.done} onToggle={() => patchItem('books', it.id, { done: !it.done })} />
                      </td>
                      <td>
                        <span className="pcv-nametext" style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? '#9aa0a9' : undefined }}>{it.title}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: '#475569' }} title={it.focus || ''}>{it.focus || '—'}</span>
                      </td>
                      <td>{NoteCell(it)}</td>
                      <td>
                        <button className="pcv-btn-text" onClick={() => openEdit('books', it.id)}>✏️ 填写</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* 片单 */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 2px 8px' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>🎙️ 访谈片单</span>
          </div>
          <div className="pcv-card pcv-card--scroll" style={{ padding: 0 }}>
            <table className="pcv-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>已看</th>
                  <th style={{ width: 160 }}>节目</th>
                  <th style={{ width: 190 }}>期数 / 嘉宾</th>
                  <th style={{ width: 140 }}>观看平台</th>
                  <th>练习重点</th>
                  <th style={{ width: 150 }}>感悟 / 三问</th>
                  <th style={{ width: 90 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.shows.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <Check done={it.done} onToggle={() => patchItem('shows', it.id, { done: !it.done })} />
                    </td>
                    <td><span className="pcv-nametext" style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? '#9aa0a9' : undefined }}>{it.program}</span></td>
                    <td><span style={{ fontSize: 12, color: '#475569' }}>{it.episode}</span></td>
                    <td><span style={{ fontSize: 11, color: '#6d4bc4', fontWeight: 600 }}>📍 {it.platform}</span></td>
                    <td><span style={{ fontSize: 12, color: '#475569' }} title={it.focus || ''}>{it.focus || '—'}</span></td>
                    <td>{NoteCell(it)}</td>
                    <td>
                      <button className="pcv-btn-text" onClick={() => openEdit('shows', it.id)}>✏️ 填写</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 感悟 / 三问编辑弹窗 */}
      {targetItem && (
        <EditDialog
          item={targetItem}
          onClose={closeEdit}
          onSave={saveEdit}
        />
      )}
    </>
  )

  function NoteCell(it) {
    if (it.note || hasAnswers(it)) {
      return (
        <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
          {it.note && <span className="pcv-chip" style={{ background: '#fef3c7', color: '#a16207' }}>有感悟</span>}
          {hasAnswers(it) && <span className="pcv-chip" style={{ background: 'rgba(184,81,127,0.12)', color: '#b8517f' }}>三问已答</span>}
        </span>
      )
    }
    return <span style={{ fontSize: 12, color: '#c9cdd4' }}>—</span>
  }
}

function Check({ done, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="点一下切换"
      style={{
        width: 20, height: 20, borderRadius: 6, cursor: 'pointer', padding: 0,
        border: done ? 'none' : '1.5px solid rgba(0,0,0,0.18)',
        background: done ? '#b8517f' : 'rgba(255,255,255,0.6)',
        color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: '20px',
      }}
    >
      {done ? '✓' : ''}
    </button>
  )
}

function EditDialog({ item, onClose, onSave }) {
  const [note, setNote] = useState(item.note || '')
  const [answers, setAnswers] = useState({ ...(item.answers || { q1: '', q2: '', q3: '' }) })

  const title = item.title || `${item.program} ${item.episode}`

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span>📝 感悟与自检三问</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>{title}</span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>
        <div className="pcv-dialog-b">
          <div className="pcv-field-label">笔记 / 感悟</div>
          <textarea
            className="pcv-input"
            style={{ width: '100%', minHeight: 80, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            placeholder="摘抄 / 感想 / 行动清单…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {SELF_QUESTIONS.map((q, i) => {
            const key = `q${i + 1}`
            return (
              <div key={key} style={{ marginTop: 16 }}>
                <div className="pcv-field-label">{i + 1}. {q}</div>
                <textarea
                  className="pcv-input"
                  style={{ width: '100%', minHeight: 64, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                  placeholder="写下你的思考…"
                  value={answers[key] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                />
              </div>
            )
          })}
        </div>
        <div className="pcv-dialog-f">
          <div className="pcv-spacer" />
          <button className="pcv-btn pcv-btn-ghost" onClick={onClose}>取消</button>
          <button className="pcv-btn" onClick={() => onSave(note.trim(), answers)}>保存</button>
        </div>
      </div>
    </div>
  )
}
