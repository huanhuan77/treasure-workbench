import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'

const STORAGE_KEY = 'daily_plan_v1'

const REWARDS = [
  { id: 'icecream', label: '🍦 吃冰淇淋', cost: 3 },
  { id: 'takeout', label: '🥡 点外卖', cost: 5 },
  { id: 'shopping', label: '🛍️ 买个小东西', cost: 7 },
  { id: 'movie', label: '🎬 看个剧', cost: 4 },
  { id: 'nap', label: '💤 睡个午觉', cost: 2 },
  { id: 'snack', label: '🍿 买零食', cost: 3 },
  { id: 'game', label: '🎮 玩游戏30分钟', cost: 5 },
  { id: 'walk', label: '🌳 出去走走', cost: 2 },
]

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
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const today = getToday()
  const plan = data[today] || { tasks: [], stars: 0 }
  const [tasks, setTasks] = useState(plan.tasks)
  const [stars, setStars] = useState(plan.stars || 0)
  const [showAdd, setShowAdd] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showRewards, setShowRewards] = useState(false)

  // 同步到 localStorage
  const sync = (newTasks, newStars) => {
    const nd = { ...data, [today]: { tasks: newTasks, stars: newStars } }
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
    sync(newTasks, stars)
    setNewTaskTitle('')
    setShowAdd(false)
  }

  const toggleTask = (id) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(newTasks)
    sync(newTasks, stars)
    // 如果所有任务都完成了，弹奖励
    if (newTasks.filter(t => t.done).length === newTasks.length && newTasks.length > 0) {
      setShowRewards(true)
      show('🎉 全部完成！领取奖励吧！', 'success')
    }
  }

  const deleteTask = (id) => {
    const newTasks = tasks.filter(t => t.id !== id)
    setTasks(newTasks)
    sync(newTasks, stars)
  }

  const claimReward = (reward) => {
    setStars(s => s + reward.cost)
    setShowRewards(false)
    show(`🎉 获得 ${reward.cost} ��星星！`, 'success')
  }

  const resetStars = () => {
    const newStars = 0
    setStars(newStars)
    const nd = { ...data, [today]: { tasks, stars: newStars } }
    setData(nd)
    saveData(nd)
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowRewards(true)} style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: 'rgba(251,191,36,0.12)', color: '#d97706', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⭐ {stars}
          </button>
          <button onClick={() => setShowAdd(true)} style={{
            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
            fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
          }}>+</button>
        </div>
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
          {progress === 100 && total > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#059669', textAlign: 'center', fontWeight: 600 }}>
              🎉 全部完成！去领取星星奖励吧！
            </p>
          )}
        </div>

        {/* 任务列表 */}
        {tasks.length === 0 ? (
          <div style={{ ...glassStyle, padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0 }}>还没有任务，点 + 添加今天的计划</p>
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

      {/* 添加任务弹窗 */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="添加任务"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnGhost} onClick={() => setShowAdd(false)}>取消</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={addTask}>添加</button>
          </div>
        }
      >
        <Field label="任务内容">
          <input style={inputStyle} placeholder="写点什么..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && addTask()} />
        </Field>
      </Modal>

      {/* 奖励弹窗 */}
      <Modal open={showRewards} onClose={() => setShowRewards(false)} title="🎁 领取奖励"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button style={btnGhost} onClick={() => setShowRewards(false)}>先不领</button>
          </div>
        }
      >
        <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-sub)', textAlign: 'center' }}>
          完成任务获得星星 ⭐，选择奖励来犒劳自己吧！
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {REWARDS.map(r => (
            <button key={r.id} onClick={() => claimReward(r)} style={{
              padding: '12px 8px', borderRadius: '12px', border: '1.5px solid rgba(0,0,0,0.06)',
              background: '#fff', cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{r.label.split(' ')[0]}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{r.label}</div>
              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '2px' }}>⭐ {r.cost} 颗星</div>
            </button>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--gray-400)', textAlign: 'center' }}>
          当前拥有 ⭐ {stars} 颗星
        </p>
      </Modal>
    </div>
  )
}
