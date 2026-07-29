import { useState } from 'react'
import { glassStyle } from '../components/Modal'

const STORAGE_KEY = 'daily_plan_v1'
const MAX_LEN = 100

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

export function DailyPlanPage() {
  const [data, setData] = useState(loadData)
  const today = getToday()
  const plan = data[today] || { tasks: [] }
  const [tasks, setTasks] = useState(plan.tasks)
  const [showModal, setShowModal] = useState(false)
  const [input, setInput] = useState('')

  const sync = (newTasks) => {
    const nd = { ...data, [today]: { tasks: newTasks } }
    setData(nd)
    saveData(nd)
  }

  const total = tasks.length
  const done = tasks.filter(t => t.done).length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const addTask = () => {
    if (!input.trim()) return
    const newTasks = [...tasks, { id: Date.now(), title: input.trim(), done: false }]
    setTasks(newTasks)
    sync(newTasks)
    setInput('')
    setShowModal(false)
  }

  const toggleTask = (id) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(newTasks)
    sync(newTasks)
  }

  const deleteTask = (id) => {
    const newTasks = tasks.filter(t => t.id !== id)
    setTasks(newTasks)
    sync(newTasks)
  }

  const getDateLabel = (dateStr) => {
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const d = new Date(dateStr)
    const wd = weekDays[d.getDay()]
    const isToday = dateStr === today
    return isToday ? '今天' : `${parseInt(dateStr.split('-')[1])}月${parseInt(dateStr.split('-')[2])}日 周${wd}`
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📋 每日计划</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>{getDateLabel(today)}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
          fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
        }}>+</button>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 进度卡片 */}
        <div style={{ ...glassStyle, padding: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>今日进度</span>
            <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{done}/{total} 项 · {progress}%</span>
          </div>
          <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(244,114,182,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '5px', width: `${progress}%`, background: 'linear-gradient(90deg,#34d399,#10b981)', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* 任务列表 */}
        {tasks.length === 0 ? (
          <div style={{ ...glassStyle, padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0 }}>还没有任务，点 + 添加</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ ...glassStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  onClick={() => toggleTask(task.id)}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    border: `2.5px solid ${task.done ? '#10b981' : '#d1d5db'}`,
                    background: task.done ? '#10b981' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {task.done ? '✓' : ''}
                </div>
                <div style={{
                  flex: 1, fontSize: '15px', fontWeight: 500,
                  color: task.done ? 'var(--text-sub)' : 'var(--text-main)',
                  textDecoration: task.done ? 'line-through' : 'none',
                }}>
                  {task.title}
                </div>
                <button onClick={() => deleteTask(task.id)} style={{
                  width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                  background: 'rgba(244,63,94,0.08)', color: '#e11d48', fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 遮罩层 */}
      {showModal && (
        <div
          onClick={() => { setShowModal(false); setInput('') }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(74, 44, 58, 0.25)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              width: '100%', maxWidth: '480px',
              borderRadius: '28px 28px 0 0',
              padding: '24px 22px calc(16px + var(--safe-bottom))',
              animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: '0 -8px 40px rgba(244,114,182,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-main)' }}>添加任务</h3>
              <button onClick={() => { setShowModal(false); setInput('') }} style={{
                width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                background: 'rgba(252,231,243,0.7)', fontSize: '16px', color: 'var(--text-sub)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
            <textarea
              placeholder="今天要做什么？"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={e => { if (e.key === 'Enter') addTask() }}
              autoFocus
              rows={3}
              style={{
                width: '100%', padding: '14px 16px', border: '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: '14px', fontSize: '16px', outline: 'none', resize: 'none',
                background: '#fff', color: 'var(--text-main)',
                boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{input.length}/{MAX_LEN}</span>
              <button onClick={addTask} disabled={!input.trim()} style={{
                padding: '10px 28px', borderRadius: '12px', border: 'none',
                background: input.trim() ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#e5e7eb',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                boxShadow: input.trim() ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
              }}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
