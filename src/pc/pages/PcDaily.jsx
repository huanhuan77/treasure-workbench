import { useMemo, useState } from 'react'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { recordDelete } from '../../utils/sync'

// PC 版「每日计划」。
// 数据与语义照手机版 DailyPlanPage 的**每日计划**部分：**直接读写 localStorage 的 `daily_plan_v1`**，
// 结构 { 'YYYY-MM-DD': { tasks: [{ id, title, done }] } }；删除任务要 recordDelete 记墓碑；
// 写完 dispatch `dailyPlanUpdated` 事件（手机版总览靠它刷新）。
//
// ⚠️ 手机版那个页面顶上还有「发布计划」tab —— 但**它的正文根本没渲染**（render 里不区分 tab，
// 永远画每日计划），而且 FAB 里 nvigate 的 `/publish-plan/new` 路由在 App.jsx 里不存在。
// 属于没删干净的死代码，PC 版**只做每日计划**，不搬那半个 tab。
//
// PC 侧差异：拖拽排序（@dnd-kit）换成行内 ↑↓ 按钮（同样是把任务数组顺序写回），
// 新增从 FAB 弹窗换成顶栏输入行，历史从弹窗里的两级视图改成同样的弹窗但布局是表格。
const DAY_KEY = 'daily_plan_v1'
const MAX_LEN = 100

const load = () => {
  try { const r = localStorage.getItem(DAY_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}
const persist = (d) => localStorage.setItem(DAY_KEY, JSON.stringify(d))
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
function dateLabel(dateStr, today) {
  if (dateStr === today) return '今天'
  const i = WEEK[new Date(dateStr).getDay()]
  return `${parseInt(dateStr.split('-')[1], 10)}月${parseInt(dateStr.split('-')[2], 10)}日 周${i}`
}

export function PcDaily() {
  const { show } = useToast()
  const today = todayStr()
  const tomorrow = addDays(today, 1)

  const [data, setData] = useState(load)
  const [dayTab, setDayTab] = useState('today')     // today | tomorrow
  const [input, setInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDate, setHistoryDate] = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  const viewDate = dayTab === 'today' ? today : tomorrow
  const tasks = data[viewDate]?.tasks || []

  const total = tasks.length
  const done = tasks.filter((t) => t.done).length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const sync = (nextTasks, date = viewDate) => {
    const next = { ...data, [date]: { tasks: nextTasks } }
    persist(next)
    setData(next)
    try { window.dispatchEvent(new Event('dailyPlanUpdated')) } catch (e) { /* 忽略 */ }
  }

  const addTask = () => {
    const title = input.trim()
    if (!title) return
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    sync([...tasks, { id, title, done: false }])
    setInput('')
    show('已添加', 'success')
  }

  const toggle = (id) => sync(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  // 上移 / 下移（手机版是拖拽，PC 用按钮，效果都是把数组顺序写回）
  const move = (idx, delta) => {
    const to = idx + delta
    if (to < 0 || to >= tasks.length) return
    const next = [...tasks]
    const [it] = next.splice(idx, 1)
    next.splice(to, 0, it)
    sync(next)
  }

  const doDelete = () => {
    if (!delTarget) return
    try { recordDelete(DAY_KEY, delTarget.id) } catch (e) { /* 同步异常不影响本地删除 */ }
    sync(tasks.filter((t) => t.id !== delTarget.id))
    setDelTarget(null)
    show('已删除', 'success')
  }

  // 历史：有任务的日期（排除今天），按日期倒序
  const historyDays = useMemo(
    () => Object.keys(data)
      .filter((d) => d !== today && (data[d]?.tasks || []).length > 0)
      .sort((a, b) => b.localeCompare(a)),
    [data, today],
  )
  const historyTasks = historyDate ? (data[historyDate]?.tasks || []) : []
  const toggleHistory = (id) => {
    if (!historyDate) return
    sync(historyTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)), historyDate)
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">每日计划</div>
          <div className="pcv-sub">
            {dateLabel(viewDate, today)} · {viewDate} · {done}/{total} 项完成（{progress}%）
          </div>
        </div>
        <div className="pcv-spacer" />
        <div className="pcv-seg">
          <button className={dayTab === 'today' ? 'on' : ''} onClick={() => setDayTab('today')}>
            <span>今日</span><span className="pcv-count">{((data[today]?.tasks) || []).length}</span>
          </button>
          <button className={dayTab === 'tomorrow' ? 'on' : ''} onClick={() => setDayTab('tomorrow')}>
            <span>明日</span><span className="pcv-count">{((data[tomorrow]?.tasks) || []).length}</span>
          </button>
        </div>
        <input
          className="pcv-input"
          style={{ width: 260 }}
          maxLength={MAX_LEN}
          placeholder={dayTab === 'today' ? '今天要做什么？' : '明天要做什么？'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
        />
        <button className="pcv-btn" onClick={addTask} disabled={!input.trim()}>＋ 添加</button>
        <button className="pcv-btn pcv-btn-ghost" onClick={() => { setHistoryOpen(true); setHistoryDate(null) }}>
          📅 历史
        </button>
      </div>

      <div className="pcv-body pcv-body--fill">
        {/* 进度 */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(15,23,42,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'linear-gradient(90deg,#8fbfa3,#5f8a74)' : 'linear-gradient(90deg,#ee8fb6,#d9648f)' }} />
          </div>
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 46 }}>#</th>
                <th style={{ width: 46 }}>完成</th>
                <th>任务</th>
                <th style={{ width: 130 }}>顺序</th>
                <th style={{ width: 80 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pcv-empty">
                    {dayTab === 'today' ? '今天还没有任务，在上面输入框加一条' : '明天还没有计划，在上面输入框加一条'}
                  </td>
                </tr>
              ) : tasks.map((t, i) => (
                <tr key={t.id}>
                  <td style={{ color: '#c9cdd4', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                  <td>
                    <button
                      onClick={() => toggle(t.id)}
                      title={t.done ? '标记为未完成' : '标记为已完成'}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
                        border: `1.5px solid ${t.done ? '#5f8a74' : '#c4b5fd'}`,
                        background: t.done ? '#5f8a74' : 'transparent',
                        color: '#fff', fontSize: 11, lineHeight: 1,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{t.done ? '✓' : ''}</button>
                  </td>
                  <td>
                    <span
                      className="pcv-nametext"
                      title={t.title}
                      style={{
                        color: t.done ? '#9aa0a9' : '#333a45',
                        textDecoration: t.done ? 'line-through' : 'none',
                      }}
                    >{t.title}</span>
                  </td>
                  <td>
                    {/* 手机版是拖拽排序，PC 用 ↑↓ 实现同样的效果（数组顺序就是展示顺序） */}
                    <button
                      className="pcv-btn-text"
                      disabled={i === 0}
                      style={{ opacity: i === 0 ? 0.35 : 1, cursor: i === 0 ? 'default' : 'pointer' }}
                      onClick={() => move(i, -1)}
                      title="上移"
                    >↑ 上移</button>
                    <button
                      className="pcv-btn-text"
                      disabled={i === tasks.length - 1}
                      style={{ marginLeft: 8, opacity: i === tasks.length - 1 ? 0.35 : 1, cursor: i === tasks.length - 1 ? 'default' : 'pointer' }}
                      onClick={() => move(i, 1)}
                      title="下移"
                    >↓ 下移</button>
                  </td>
                  <td>
                    <button className="pcv-btn-text" style={{ color: '#b96a66' }} onClick={() => setDelTarget(t)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 历史计划 */}
      {historyOpen && (
        <div className="pcv-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="pcv-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              {historyDate ? (
                <button className="pcv-btn pcv-btn-ghost" onClick={() => setHistoryDate(null)}>‹ 返回</button>
              ) : null}
              <span>{historyDate ? dateLabel(historyDate, today) : '历史计划'}</span>
              {historyDate && (
                <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>
                  {historyTasks.filter((t) => t.done).length}/{historyTasks.length} 完成
                </span>
              )}
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setHistoryOpen(false)}>×</button>
            </div>

            <div className="pcv-dialog-b">
              {historyDate ? (
                historyTasks.length === 0 ? (
                  <div className="pcv-empty">这一天没有任务</div>
                ) : (
                  <div className="pcv-entrylist">
                    {historyTasks.map((t) => (
                      <div key={t.id} className="pcv-entry" style={{ cursor: 'pointer' }} onClick={() => toggleHistory(t.id)}>
                        <button
                          style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
                            border: `1.5px solid ${t.done ? '#5f8a74' : '#c4b5fd'}`,
                            background: t.done ? '#5f8a74' : 'transparent',
                            color: '#fff', fontSize: 10, lineHeight: 1,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >{t.done ? '✓' : ''}</button>
                        <span style={{
                          flex: 1, minWidth: 0, fontSize: 13,
                          color: t.done ? '#9aa0a9' : '#333a45',
                          textDecoration: t.done ? 'line-through' : 'none',
                        }}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : historyDays.length === 0 ? (
                <div className="pcv-empty">还没有历史计划（每天加过任务后会自动留在这里）</div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 8 }}>共 {historyDays.length} 天历史计划</div>
                  <div className="pcv-entrylist">
                    {historyDays.map((d) => {
                      const ts = data[d].tasks
                      const dn = ts.filter((t) => t.done).length
                      const pct = ts.length > 0 ? Math.round((dn / ts.length) * 100) : 0
                      return (
                        <div
                          key={d}
                          className="pcv-entry"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setHistoryDate(d)}
                        >
                          <span style={{ width: 110, fontWeight: 600, color: '#333a45', fontSize: 13 }}>{dateLabel(d, today)}</span>
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(15,23,42,0.07)', overflow: 'hidden' }}>
                              <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: pct === 100 ? '#5f8a74' : '#ee8fb6' }} />
                            </span>
                            <span style={{ fontSize: 12, color: '#9aa0a9', width: 64, textAlign: 'right' }}>{dn}/{ts.length} · {pct}%</span>
                          </span>
                          <span style={{ color: '#c9cdd4', fontSize: 12 }}>›</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn" onClick={() => setHistoryOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
        title="删除任务"
        message={delTarget ? `确定删除「${delTarget.title}」吗？` : ''}
        confirmText="删除"
        danger
      />
    </>
  )
}
