import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, glassStyle, inputStyle, btnPrimary, btnGhost } from '../components/Modal'
import { useStore } from '../store'
import { useToast } from '../components/Toast'

const STORAGE_KEY = 'daily_plan_v1'
const PUBLISH_KEY = 'daily_publish_plan_v1'
const MAX_LEN = 100
const FAB_KEY = 'dailyPlanFabPos'

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
}

function loadPublish() {
  try {
    const raw = localStorage.getItem(PUBLISH_KEY)
    const d = raw ? JSON.parse(raw) : {}
    // 全局账号映射：旧代号 → 真实账号名
    const ACCOUNT_MAP = { '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }
    for (const date of Object.keys(d)) {
      d[date] = (d[date] || []).map((p) => ({ ...p, account: (ACCOUNT_MAP[p.account] || p.account) }))
    }
    return d
  } catch { return {} }
}

function savePublish(d) {
  localStorage.setItem(PUBLISH_KEY, JSON.stringify(d))
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// 用本地时区（不是 UTC）获取今天日期字符串 YYYY-MM-DD
function getToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

function SortableTaskRow({ task, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? '0 12px 30px rgba(244,114,182,0.28)' : undefined,
  }
  return (
    <div ref={setNodeRef} style={{ ...style, ...glassStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* 拖动手柄 */}
      <button
        {...attributes}
        {...listeners}
        onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e) }}
        aria-label="拖动排序"
        style={{
          background: 'transparent', border: 'none', cursor: 'grab',
          color: '#9ca3af', fontSize: '20px', padding: '0 4px',
          touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, lineHeight: 1,
        }}
      >⇕</button>
      {/* 勾选框 */}
      <div
        onClick={() => onToggle(task.id)}
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
      <button onClick={() => onDelete(task.id)} style={{
        width: '28px', height: '28px', borderRadius: '50%', border: 'none',
        background: 'rgba(244,63,94,0.08)', color: '#e11d48', fontSize: '14px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>✕</button>
    </div>
  )
}

export function DailyPlanPage() {
  const navigate = useNavigate()
  const { products, samples } = useStore()
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const today = getToday()
  const tomorrow = addDays(today, 1)
  const [tab, setTab] = useState(0)  // 0=每日计划，1=发布计划
  const [dayTab, setDayTab] = useState(0)  // 每日计划 tab 内的子视图：0=今日，1=明日
  const viewDate = dayTab === 0 ? today : tomorrow
  const plan = data[viewDate] || { tasks: [] }
  const [tasks, setTasks] = useState(plan.tasks)

  // 发布计划（按所选日期读取，支持今天/明天/后天）
const ACCOUNT_CARD_COLOR = {
  '广东刘亦菲': '#fb923c',  // 橙
  '晚梨不吃梨': '#3b82f6',  // 蓝
  '努力成为富婆': '#a855f7',  // 紫
}
  const [publishData, setPublishData] = useState(loadPublish)
  // 发布计划视图的日期偏移持久化（sessionStorage），切页面/跳回后保持所选日期
  const [publishOffset, setPublishOffset] = useState(() => {
    try {
      const v = sessionStorage.getItem('pubPlanOffset')
      return v !== null ? Number(v) : 1
    } catch { return 1 }
  })
  useEffect(() => {
    try { sessionStorage.setItem('pubPlanOffset', String(publishOffset)) } catch (e) {}
  }, [publishOffset])
  const publishDate = addDays(today, publishOffset)
  const pubPlans = publishData[publishDate] || []

  // 监听新页面添加后的事件，刷新列表
  useEffect(() => {
    const reload = () => setPublishData(loadPublish())
    window.addEventListener('publishPlanUpdated', reload)
    return () => window.removeEventListener('publishPlanUpdated', reload)
  }, [])

  // 账号预览：固定三个账号（广东刘亦菲 / 晚梨不吃梨 / 努力成为富婆）
  const accountOptions = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
  const groupedPlans = {}
  pubPlans.forEach((p) => { (groupedPlans[p.account] = groupedPlans[p.account] || []).push(p) })

  // 按 (账号, 样品) 聚合：同账号同样品重复添加自动合并显示数量（兼容旧数据 productId 字段）
  const itemKey = (p) => p.sampleId || p.productId
  const aggregated = (() => {
    const map = new Map()
    for (const p of pubPlans) {
      const key = `${p.account}__${itemKey(p)}`
      if (map.has(key)) {
        const cur = map.get(key)
        cur.count += 1
        cur.ids.push(p.id)
      } else {
        map.set(key, { account: p.account, sampleId: itemKey(p), productName: p.productName, category: p.category, count: 1, ids: [p.id] })
      }
    }
    return [...map.values()]
  })()
  const groupedAgg = {}
  aggregated.forEach((p) => { (groupedAgg[p.account] = groupedAgg[p.account] || []).push(p) })

  // 删除某账号下的某个样品（聚合组）
  const deletePublishAgg = (account, sampleId) => {
    const nd = { ...publishData, [publishDate]: pubPlans.filter((x) => !(x.account === account && (x.sampleId || x.productId) === sampleId)) }
    setPublishData(nd); savePublish(nd)
    show('已删除', 'success')
  }

  // 渲染期间检测日期变化，自动同步任务列表（解决跨天 tasks 未更新问题）
  const prevViewDateRef = useRef(viewDate)
  if (prevViewDateRef.current !== viewDate) {
    prevViewDateRef.current = viewDate
    setTasks(plan.tasks)
  }
  const [showModal, setShowModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyDate, setHistoryDate] = useState(null)
  const [input, setInput] = useState('')

  // FAB 拖动状态
  const [fabPos, setFabPos] = useState(() => {
    try { const d = localStorage.getItem(FAB_KEY); if (d) return JSON.parse(d) } catch(e) {}
    return null
  })
  const fabPosRef = useRef(fabPos)
  fabPosRef.current = fabPos
  const fabRef = useRef(null)
  const fabDragInfo = useRef(null)
  const [fabDragging, setFabDragging] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  const sync = (newTasks) => {
    const nd = { ...data, [viewDate]: { tasks: newTasks } }
    setData(nd)
    saveData(nd)
    window.dispatchEvent(new Event('dailyPlanUpdated'))
  }

  // 确保 tasks 来自当前 viewDate（防止跨天后用户操作时用了旧日期数据）
  const freshTasks = () => {
    if (prevViewDateRef.current !== viewDate) {
      prevViewDateRef.current = viewDate
      setTasks(plan.tasks)
      return plan.tasks
    }
    return tasks
  }

  const total = tasks.length
  const done = tasks.filter(t => t.done).length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const addTask = () => {
    if (!input.trim()) return
    const cur = freshTasks()
    const newTasks = [...cur, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: input.trim(), done: false }]
    setTasks(newTasks)
    sync(newTasks)
    setInput('')
    setShowModal(false)
  }

  const toggleTask = (id) => {
    const cur = freshTasks()
    const newTasks = cur.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(newTasks)
    sync(newTasks)
  }

  const deleteTask = (id) => {
    const cur = freshTasks()
    const newTasks = cur.filter(t => t.id !== id)
    setTasks(newTasks)
    sync(newTasks)
  }

  // 历史日期相关：仅查看，可切换完成状态（修改同步回历史）
  const historyPlan = historyDate ? (data[historyDate] || { tasks: [] }) : null
  const toggleHistoryTask = (id) => {
    if (!historyDate) return
    const newTasks = (historyPlan.tasks || []).map(t => t.id === id ? { ...t, done: !t.done } : t)
    const nd = { ...data, [historyDate]: { ...historyPlan, tasks: newTasks } }
    setData(nd)
    saveData(nd)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const cur = freshTasks()
    const oldIndex = cur.findIndex(t => t.id === active.id)
    const newIndex = cur.findIndex(t => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const newTasks = arrayMove(cur, oldIndex, newIndex)
    setTasks(newTasks)
    sync(newTasks)
  }

  // FAB 拖动事件
  const onFabPDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const r = fabRef.current.getBoundingClientRect()
    fabDragInfo.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false }
    setFabDragging(true)
    if (e.target.setPointerCapture && e.pointerId !== undefined) {
      try { e.target.setPointerCapture(e.pointerId) } catch(_) {}
    }
  }
  const onFabPMove = (e) => {
    if (!fabDragInfo.current) return
    const dx = e.clientX - fabDragInfo.current.sx
    const dy = e.clientY - fabDragInfo.current.sy
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) fabDragInfo.current.moved = true
    const sz = 56
    let x = Math.max(8, Math.min(window.innerWidth - sz - 8, fabDragInfo.current.ox + dx))
    let y = Math.max(8, Math.min(window.innerHeight - sz - 8, fabDragInfo.current.oy + dy))
    fabPosRef.current = { x, y }
    setFabPos({ x, y })
  }
  const endFabDrag = () => {
    if (!fabDragInfo.current) return
    const m = fabDragInfo.current.moved
    fabDragInfo.current = null
    setFabDragging(false)
    if (m) {
      try { localStorage.setItem(FAB_KEY, JSON.stringify(fabPosRef.current)) } catch(e) {}
    } else {
      if (tab === 0) navigate('/publish-plan/new', { state: { publishDate } })
      else setShowModal(true)
    }
  }

  const getDateLabel = (dateStr) => {
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const d = new Date(dateStr)
    const wd = weekDays[d.getDay()]
    const isToday = dateStr === today
    return isToday ? '今天' : `${parseInt(dateStr.split('-')[1])}月${parseInt(dateStr.split('-')[2])}日 周${wd}`
  }

  const fabStyle = fabPos
    ? { left: fabPos.x + 'px', top: fabPos.y + 'px' }
    : { left: 'calc(100vw - 72px)', top: 'calc(100vh - 148px)' }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
              {tab === 0 ? '发布计划' : '📋 每日计划'}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {tab === 0 ? (
                <span>{getDateLabel(publishDate)}（{publishDate}）各账号发布产品</span>
              ) : (
                <>
                  <span>{getDateLabel(viewDate)}</span>
                  <span style={{ color: '#d1d5db' }}>·</span>
                  <span style={{ color: '#9ca3af' }}>{viewDate}</span>
                </>
              )}
            </p>
          </div>
          {tab === 1 && (
            <button onClick={() => setShowHistory(true)} style={{
              padding: '6px 12px', borderRadius: '10px',
              border: '1.5px solid rgba(244,114,182,0.2)',
              background: 'rgba(244,114,182,0.06)',
              color: 'var(--primary)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>📅 历史</button>
          )}
        </div>

        {/* 每日计划 / 发布计划 切换 */}
        <div style={{
          display: 'flex', gap: '6px',
          padding: '3px', borderRadius: '12px',
          background: 'rgba(244,114,182,0.06)',
        }}>
          {[
            { key: 0, label: '📣 发布计划' },
            { key: 1, label: '📋 每日计划' },
          ].map(item => {
            const selected = tab === item.key
            return (
              <button key={item.key} onClick={() => setTab(item.key)} style={{
                flex: 1, padding: '9px 0', border: 'none', borderRadius: '9px',
                fontSize: '14px', fontWeight: selected ? 600 : 500,
                color: selected ? '#fff' : 'var(--text-sub)',
                background: selected
                  ? 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: selected ? '0 2px 8px rgba(236,72,153,0.25)' : 'none',
                whiteSpace: 'nowrap',
              }}>{item.label}</button>
            )
          })}
        </div>
      </header>

      {/* 每日计划 tab 内的今日/明日子切换 */}
      {tab === 1 && (
        <div style={{ display: 'flex', gap: '6px', padding: '0 16px 12px' }}>
          {[
            { key: 0, label: '今日', date: today },
            { key: 1, label: '明日', date: tomorrow },
          ].map(item => {
            const selected = dayTab === item.key
            return (
              <button key={item.key} onClick={() => setDayTab(item.key)} style={{
                flex: 1, padding: '8px 0', border: '1.5px solid', borderRadius: '10px',
                fontSize: '13px', fontWeight: selected ? 600 : 500,
                color: selected ? '#fff' : 'var(--text-sub)',
                background: selected ? 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' : 'rgba(255,255,255,0.5)',
                borderColor: selected ? 'transparent' : 'rgba(244,114,182,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>{item.label}</button>
            )
          })}
        </div>
      )}

      {tab === 0 ? (
        /* ============ 发布计划视图（纯文本风格：按账号分组，同账号同产品合并数量） ============ */
        <div style={{ padding: '16px 20px' }}>
          {/* 日期切换：今天/明天/后天 */}
          <div style={{ display: 'flex', gap: '6px', paddingBottom: '12px' }}>
            {[{off:0,label:'今天'},{off:1,label:'明天'},{off:2,label:'后天'}].map(({off,label}) => (
              <button key={off} onClick={() => setPublishOffset(off)} style={{
                padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
                border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderColor: publishOffset === off ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                background: publishOffset === off ? 'rgba(244,114,182,0.1)' : '#fff',
                color: publishOffset === off ? 'var(--primary)' : 'var(--text-sub)',
              }}>{label}</button>
            ))}
          </div>
          {aggregated.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-sub)' }}>
              <p style={{ fontSize: '14px', margin: 0 }}>{publishOffset === 0 ? '今天' : publishOffset === 1 ? '明天' : '后天'}还没有发布计划</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>点右下角 + 记录「账号 × 产品」</p>
            </div>
          ) : (
            <div style={{ paddingBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 600, marginBottom: '8px' }}>
                发布时间 · {publishDate}（{publishOffset === 0 ? '今天' : publishOffset === 1 ? '明天' : '后天'}）
              </div>
              {Object.keys(groupedAgg).map((acc) => (
                <div key={acc} style={{
                  marginBottom: '10px',
                  background: '#fff', borderRadius: '12px', padding: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}>
                  {/* 卡片头部：账号名 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '18px', borderRadius: '3px', background: (ACCOUNT_CARD_COLOR[acc] || '#8b6f7a') }} />
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{acc}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{groupedAgg[acc].length} 项</span>
                  </div>
                  {/* 样品行：每行一个子项（带左侧色条 + 圆角） */}
                  {groupedAgg[acc].map((p) => (
                    <div key={p.sampleId} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.02)',
                      marginBottom: '3px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <span style={{ width: '3px', alignSelf: 'stretch', borderRadius: '2px', background: (ACCOUNT_CARD_COLOR[acc] || '#8b6f7a'), opacity: 0.5 }} />
                        <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.productName}
                        </span>
                        {p.count > 1 && (
                          <span style={{
                            fontSize: '11px', fontWeight: 700, color: '#fff',
                            background: 'linear-gradient(135deg, #f472b6, #ec4899)',
                            padding: '2px 8px', borderRadius: '10px', minWidth: '22px', textAlign: 'center', flexShrink: 0,
                          }}>×{p.count}</span>
                        )}
                      </div>
                      <button onClick={() => deletePublishAgg(p.account, p.sampleId)} title="删除" style={{
                        border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                        fontSize: '14px', cursor: 'pointer', padding: '4px 10px',
                        borderRadius: '8px', lineHeight: 1, fontWeight: 600, flexShrink: 0,
                      }}>×</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0 }}>
              {viewDate === today ? '今天还没有任务' : '明天还没有计划'}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>点右下角 + 添加</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
                {tasks.map(task => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        </div>
      )}

      {/* 可拖动 + 浮动按钮 */}
      <button
        ref={fabRef}
        onPointerDown={onFabPDown}
        onPointerMove={onFabPMove}
        onPointerUp={endFabDrag}
        onPointerCancel={endFabDrag}
        onClick={(e) => { e.stopPropagation() }}
        style={{
          position: 'fixed',
          ...fabStyle,
          width: '56px', height: '56px', borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
          fontSize: '30px', fontWeight: 300, lineHeight: 1, cursor: fabDragging ? 'grabbing' : 'grab',
          boxShadow: fabDragging ? '0 12px 32px rgba(244,114,182,0.5)' : '0 8px 24px rgba(244,114,182,0.4)',
          zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
          transition: fabDragging ? 'none' : 'box-shadow 0.2s',
        }}
      >+</button>

      {/* 添加任务弹窗 */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setInput('') }}
        title={viewDate === today ? '添加今日任务' : '添加明日计划'}
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{input.length}/{MAX_LEN}</span>
            <button onClick={addTask} disabled={!input.trim()} style={{
              padding: '10px 28px', borderRadius: '12px', border: 'none',
              background: input.trim() ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#e5e7eb',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              boxShadow: input.trim() ? '0 4px 14px rgba(244,114,182,0.3)' : 'none',
            }}>添加</button>
          </div>
        }
      >
        <textarea
          placeholder="今天要做什么？"
          value={input}
          onChange={e => setInput(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addTask()
          }}
          rows={3}
          autoFocus
          style={{
            width: '100%', padding: '14px 16px', border: '1.5px solid rgba(0,0,0,0.08)',
            borderRadius: '14px', fontSize: '16px', outline: 'none', resize: 'none',
            background: '#fff', color: 'var(--text-main)',
            boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit',
          }}
        />
      </Modal>

      {/* 历史计划弹窗 */}
      <Modal open={showHistory} onClose={() => { setShowHistory(false); setHistoryDate(null) }}
        title={historyDate ? getDateLabel(historyDate) : '历史计划'}
        center
      >
        {historyDate ? (
          // 历史详情视图
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <button onClick={() => setHistoryDate(null)} style={{
                padding: '6px 12px', borderRadius: '8px', border: '1.5px solid rgba(0,0,0,0.06)',
                background: '#fff', fontSize: '13px', cursor: 'pointer', color: 'var(--text-sub)',
              }}>‹ 返回</button>
              <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                {(historyPlan.tasks || []).filter(t => t.done).length}/{(historyPlan.tasks || []).length} 完成
              </span>
            </div>
            {(!historyPlan.tasks || historyPlan.tasks.length === 0) ? (
              <p style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '20px 0', fontSize: '14px' }}>这一天没有任务</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
                {(historyPlan.tasks || []).map(task => (
                  <div key={task.id} style={{
                    padding: '12px 14px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.7)',
                    border: '1.5px solid rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <div onClick={() => toggleHistoryTask(task.id)} style={{
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                      border: `2.5px solid ${task.done ? '#10b981' : '#d1d5db'}`,
                      background: task.done ? '#10b981' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    }}>
                      {task.done ? '✓' : ''}
                    </div>
                    <div style={{
                      flex: 1, fontSize: '14px', fontWeight: 500,
                      color: task.done ? 'var(--text-sub)' : 'var(--text-main)',
                      textDecoration: task.done ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // 历史列表视图
          <HistoryList
            data={data}
            today={today}
            getDateLabel={getDateLabel}
            onOpen={setHistoryDate}
          />
        )}
      </Modal>
    </div>
  )
}

// 历史计划列表子组件
function HistoryList({ data, today, getDateLabel, onOpen }) {
  // 所有历史日期（排除今天），按日期降序
  const allDates = Object.keys(data)
    .filter(d => d !== today && data[d] && data[d].tasks && data[d].tasks.length > 0)
    .sort((a, b) => b.localeCompare(a))

  if (allDates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-sub)', fontSize: '14px' }}>
        <p style={{ margin: 0 }}>📅 还没有历史计划</p>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>每天添加任务后会自动保存到历史</p>
      </div>
    )
  }

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '10px', textAlign: 'center' }}>
        共 {allDates.length} 天历史计划
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {allDates.map(date => {
          const tasks = data[date].tasks
          const d = tasks.filter(t => t.done).length
          const pct = tasks.length > 0 ? Math.round((d / tasks.length) * 100) : 0
          return (
            <button key={date} onClick={() => onOpen(date)} style={{
              padding: '14px 16px', borderRadius: '12px',
              border: '1.5px solid rgba(0,0,0,0.06)',
              background: 'rgba(255,255,255,0.6)',
              textAlign: 'left', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,114,182,0.08)'; e.currentTarget.style.borderColor = 'rgba(244,114,182,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{getDateLabel(date)}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{d}/{tasks.length} · {pct}%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(244,114,182,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#34d399,#10b981)' : 'linear-gradient(90deg,#f472b6,#ec4899)' }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}