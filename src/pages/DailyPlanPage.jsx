import { useState } from 'react'
import { glassStyle } from '../components/Modal'

const STORAGE_KEY = 'daily_plan_v1'

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
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const sync = (newTasks) => {
    const nd = { ...data, [today]: { tasks: newTasks } }
    setData(nd)
    saveData(nd)
  }

  const total = tasks.length
  const done = tasks.filter(t => t.done).length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const addTask = () => {
    if (!newTaskTitle.trim()) return
    const newTasks = [...tasks, { id: Date.now(), title: newTaskTitle.trim(), done: false }]
    setTasks(newTasks)
    sync(newTasks)
    setNewTaskTitle('')
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
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📋 每日计划</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>{getDateLabel(today)}</p>
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

        {/* 添加任务输入框 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 4px 4px 14px',
            background: 'rgba(255,255,255,0.6)',
            border: '1.5px solid rgba(244,114,182,0.15)',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(244,114,182,0.04)',
            transition: 'border-color 0.2s',
          }}>
            <input
              type="text"
              placeholder="今天想做什么..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addTask()
              }}
              style={{
                flex: 1, height: '40px',
                border: 'none', outline: 'none',
                fontSize: '15px', background: 'transparent',
                color: 'var(--text-main)',
                fontFamily: 'inherit', padding: 0,
              }}
            />
            <button onClick={addTask} disabled={!newTaskTitle.trim()} style={{
              height: '32px', padding: '0 14px', borderRadius: '10px', border: 'none', flexShrink: 0,
              background: newTaskTitle.trim() ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#f3f4f6',
              color: newTaskTitle.trim() ? '#fff' : '#9ca3af',
              fontSize: '13px', fontWeight: 600,
              cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}>添加</button>
          </div>
          <p style={{ margin: '6px 4px 0', fontSize: '11px', color: '#9ca3af' }}>
            按 Enter 添加 · {newTaskTitle.length}/100
          </p>
        </div>

        {/* 任务列表 */}
        {tasks.length === 0 ? (
          <div style={{ ...glassStyle, padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0 }}>还没有任务</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ ...glassStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* 勾选框 */}
                <div
                  onClick={() => toggleTask(task.id)}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    border: `2.5px solid ${task.done ? '#10b981' : '#d1d5db'}`,
                    background: task.done ? '#10b981' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {task.done ? '✓' : ''}
                </div>
                {/* 任务名 */}
                <div style={{
                  flex: 1, fontSize: '15px', fontWeight: 500,
                  color: task.done ? 'var(--text-sub)' : 'var(--text-main)',
                  textDecoration: task.done ? 'line-through' : 'none',
                }}>
                  {task.title}
                </div>
                {/* 删除 */}
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

      </div>
  )
}
