import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, AUTO_ABANDON_PUBLISH_COUNT } from '../store'
import { useToast } from '../components/Toast'
import { checkForUpdate } from '../main'
import { daysSincePublish, daysSincePublishByAccount, pendingAccounts, isOverdue, OVERDUE_STATES } from '../utils/publish'
import { LOW_PUBLISH_LIMIT, EXPIRING_DAYS, REMINDER_TABS, selectPublishReminders, selectLowPublish, selectExpiringSoon } from '../utils/reminders'
import { getAccounts, ACCOUNTS, ACCOUNT_COLOR, mapAccount } from '../utils/accounts'
import { SAMPLE_STATUS, getAutoAbandonedAccounts } from '../utils/sampleStatus'
import { DueTag } from '../components/DueTag'

// 顶部问候（按时段）
function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早安'
  if (h < 18) return '下午好'
  return '晚上好'
}

// 把样本的截止日期换算成"距今天数"（负=过期）
function daysUntil(deadline) {
  if (!deadline) return null
  const t = new Date(deadline)
  if (Number.isNaN(t.getTime())) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((t - today) / 86400000)
}

// 大数字格式化：>1w 显示 x.xw
function fmt(n) {
  if (!n && n !== 0) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  return n.toLocaleString()
}

// 本周区间（周一 ~ 今天）：返回两个 YYYY-MM-DD 字符串，可直接做字典序比较
function thisWeekRange() {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  const offset = now.getDay() === 0 ? 6 : now.getDay() - 1 // 周一起点
  const pad = (n) => String(n).padStart(2, '0')
  const fmtD = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
  return [fmtD(new Date(y, m, d - offset)), fmtD(now)]
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { samples, transactions, orders, publishRecords, todos, updateSample } = useStore()
  const { show } = useToast()

  // 手动检查更新（主屏幕应用无刷新入口，检测到新版本时硬刷新加载）
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('dash-todo-scroll-style')) return
    const s = document.createElement('style')
    s.id = 'dash-todo-scroll-style'
    s.textContent = `.dashTodoScroll::-webkit-scrollbar{width:5px}.dashTodoScroll::-webkit-scrollbar-thumb{background:rgba(244,114,182,0.45);border-radius:3px}.dashTodoScroll::-webkit-scrollbar-thumb:hover{background:rgba(244,114,182,0.7)}`
    document.head.appendChild(s)
  }, [])
  const [checking, setChecking] = useState(false)
  // 提醒中心 Tab：reminders（发布提醒）| low（发布不足5条）| expiring（即将到期）
  // 用 lazy init 从 sessionStorage 恢复，刷新 / keep-alive 回场时保留上次选中
  const [remindTab, setRemindTab] = useState(() => {
    const v = sessionStorage.getItem('dash_remind_tab')
    return v === 'low' || v === 'expiring' ? v : 'reminders'
  })
  const pickTab = (id) => {
    setRemindTab(id)
    try { sessionStorage.setItem('dash_remind_tab', id) } catch { /* 忽略隐私模式写入失败 */ }
  }
  const handleCheckUpdate = async () => {
    setChecking(true)
    const result = await checkForUpdate(true)
    setChecking(false)
    if (result === 'latest') {
      show('已是最新版本', 'success')
      const standalone =
        window.navigator.standalone === true ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      if (standalone) setTimeout(() => location.reload(true), 800)
    } else if (result === 'error') show('检查更新失败，请重试', 'error')
  }

  // ── 待办清单：独立事项池（截止日期可有可无），管理页 /todos
  // 总览只显示「未完成」的；已完成的项不进列表
  // 排序：有截止日的按日期升序在前 → 无截止日的在后
  const todoList = useMemo(() => {
    return [...(todos || [])].filter((t) => !t.done).sort((a, b) => {
      if (a.due && b.due) return a.due < b.due ? -1 : a.due > b.due ? 1 : 0
      if (a.due) return -1
      if (b.due) return 1
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  }, [todos])
  const todoUndone = (todos || []).filter((t) => !t.done).length

  // ── 统计计算
  const stat = useMemo(() => {
    // 样品：仅统计总数、逾期、临期
    let sTotal = 0
    const urgent = []  // 已过期：只看仍需处理的待发状态（未到货/已到货未拍摄/已拍摄未发布）
    const recent = []  // 临期（3 天内到期），同上排除已发布/放弃
    ;(samples || []).forEach((s) => {
      sTotal++
      const dd = daysUntil(s.deadline)
      const active = OVERDUE_STATES.includes(s.status)
      if (active && dd !== null && dd <= 0) urgent.push(s)
      else if (active && dd !== null && dd <= 3) recent.push(s)
    })
    // 收支：本月
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    let income = 0, expense = 0
    ;(transactions || []).forEach((t) => {
      if ((t.date || '').slice(0, 7) !== ym) return
      const n = Number(t.amount) || 0
      if (t.type === 'income') income += n
      else expense += n
    })
    // 独立出单台账：总览只展示本周口径（周一 ~ 今天），按 date 字符串区间过滤
    const [wkMon, wkToday] = thisWeekRange()
    let orderWeekTotal = 0, orderWeekQty = 0
    const orderWeekPerAccount = {}
    ;(orders || []).forEach((o) => {
      const dt = o.date || ''
      if (!(dt >= wkMon && dt <= wkToday)) return
      orderWeekTotal++
      orderWeekQty += Number(o.qty) || 0
      const a = mapAccount((o.account || '').trim())
      if (!a) return
      orderWeekPerAccount[a] = (orderWeekPerAccount[a] || 0) + 1
    })
    return {
      sTotal, recent, urgent,
      income, expense, net: income - expense,
      orderWeekTotal, orderWeekQty, orderWeekPerAccount,
    }
  }, [samples, transactions, orders])

  // 自动放弃提醒：发布满 10 条仍 0 出单、已被系统按账号自动置为「放弃」的样品（按账号粒度）
  const autoAbandoned = useMemo(
    () => (samples || []).filter((s) => getAutoAbandonedAccounts(s).length > 0),
    [samples],
  )

  // 首次进入总览时，若有「自动放弃」的样品，弹一次提醒（同一次会话只弹一次）
  // 注意：必须放在 autoAbandoned 定义之后，否则依赖数组求值会命中 TDZ 导致整页崩溃
  const abandonToastShown = useRef(false)
  useEffect(() => {
    if (abandonToastShown.current) return
    if (!autoAbandoned.length) return
    abandonToastShown.current = true
    show(`${autoAbandoned.length} 个产品发布满 10 条仍未出单，已自动置为放弃`, 'error')
  }, [autoAbandoned.length, show])

  // 发布提醒：可发布状态但超阈值未发（含从未发布）；abandoned 已被 needPublishReminder 排除
  // 口径统一从 utils/reminders 取，保证与列表页「卡片数字 = 点进去的条数」
  const allReminders = useMemo(() => selectPublishReminders(samples), [samples])
  // 总览页内直接展示全部，不再跳列表页（保留别名以免大范围改动下方渲染代码）
  const reminders = allReminders

  // 已发布但发布不足5条的样品
  const lowPublish = useMemo(() => selectLowPublish(samples), [samples])

  // 即将到期：有截止日期、且未发布/未放弃、7 天内到期（含已逾期），按截止日期升序
  const expiringSoon = useMemo(() => selectExpiringSoon(samples), [samples])
  // 近 7 天发布条数（按 qty 累加）
  const last7Count = useMemo(() => {
    const from = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)
    return (publishRecords || []).reduce((s, r) => (
      String(r.publishDate || '') >= from ? s + (Number(r.qty) > 0 ? Number(r.qty) : 1) : s
    ), 0)
  }, [publishRecords])

  // ── 提醒中心 Tab 配置（三个区块合并为一个 Tab 组）
  // 标签与跳转目标来自 utils/reminders 的 REMINDER_TABS，这里只补上各自的计数，
  // 避免「标签/路径」在总览和列表页各写一份导致对不上
  const REMIND_TABS = useMemo(() => {
    const counts = {
      reminders: allReminders.length,
      low: lowPublish.length,
      expiring: expiringSoon.length,
    }
    return REMINDER_TABS.map((t) => ({ ...t, count: counts[t.id] }))
  }, [allReminders.length, lowPublish.length, expiringSoon.length])
  // 合并后的总数：不同区块可能命中同一产品，这里按 id 去重后再计
  const remindTotal = useMemo(() => {
    const map = new Map()
    ;[...allReminders, ...lowPublish, ...expiringSoon].forEach((s) => map.set(s.id, s))
    return map.size
  }, [allReminders, lowPublish, expiringSoon])

  // 当前 Tab 若因数据变化而「暂时为空」，自动切到第一个非空 Tab（仅切一次，避免切走用户选择）
  // 注意：仍然允许用户手动切到空 Tab 去看空状态文案，所以只在数据驱动下兜底
  const tabAutoFixed = useRef(false)
  useEffect(() => {
    if (tabAutoFixed.current) return
    tabAutoFixed.current = true
    if (remindTotal === 0) return
    const cur = REMIND_TABS.find((t) => t.id === remindTab)
    if (cur && cur.count > 0) return
    const first = REMIND_TABS.find((t) => t.count > 0)
    if (first && first.id !== remindTab) {
      setRemindTab(first.id)
      try { sessionStorage.setItem('dash_remind_tab', first.id) } catch { /* 忽略 */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remindTotal])

  const now = new Date()
  const todayLabel = `${now.getMonth()+1}月${now.getDate()}日`

  // 统计卡点击跳转
  const go = (p) => navigate(p)

  return (
    <div className="app-container dash-sticky-page" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh', color: '#1a1a1a' }}>
      <header style={{ padding: 'calc(18px + var(--safe-top)) 20px 14px', background: 'transparent', borderBottom: '1px solid rgba(236,72,153,0.12)' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#b3888f' }}>{greeting()} · {todayLabel}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111', letterSpacing: '-0.4px' }}>工作台总览</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => go('/backup')}
              style={{
                padding: '7px 12px', borderRadius: '8px',
                border: '1px solid #fbcfe8', background: '#fff', color: '#db2777',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >💾 数据备份</button>
            <button
              onClick={handleCheckUpdate}
              disabled={checking}
              style={{
                padding: '7px 12px', borderRadius: '8px',
                border: '1px solid #fbcfe8', background: '#fff', color: '#db2777',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{checking ? '检查中…' : '↻ 检查更新'}</button>
          </div>
        </div>
      </header>

      {/* 出单台账主入口（白底紧凑布局） */}
      <div style={{ padding: '12px 16px 2px' }}>
        <div onClick={() => go('/orders')} style={{
          background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '11px 14px', cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(120,90,100,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ec4899', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#111', letterSpacing: '0.3px' }}>出单</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#db2777', background: '#fdf2f7', padding: '1px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>本周</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#111', lineHeight: 1 }}>{fmt(stat.orderWeekTotal)}</span>
                <span style={{ fontSize: '11px', color: '#c9a3ab' }}>笔 · 本周出单 {stat.orderWeekQty} 单</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button onClick={(e) => { e.stopPropagation(); navigate('/orders/new') }} style={{
                border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
                fontSize: '12px', color: '#db2777', fontWeight: 700,
              }}>＋ 记出单</button>
              <span style={{ fontSize: '16px', color: '#f9a8d4' }}>›</span>
            </div>
          </div>
          {/* 按账号分列（固定三个账号，各显示本周单数） */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {ACCOUNTS.map((a) => (
              <span key={a} style={{
                fontSize: '11px', color: '#666', background: ACCOUNT_COLOR[a]?.bg || '#fdf2f7',
                padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
              }}>
                {a} <b style={{ color: ACCOUNT_COLOR[a]?.c || '#db2777' }}>{fmt(stat.orderWeekPerAccount[a] || 0)}</b>
              </span>
            ))}
            <span style={{
              fontSize: '11px', color: '#db2777', background: '#fdf2f7',
              padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', fontWeight: 700,
            }}>
              本周共 {fmt(stat.orderWeekTotal)} 笔
            </span>
          </div>
        </div>
      </div>

      {/* 收支卡片已移到「更多」侧边栏（/finance），总览不再占位 */}

      {/* 待办清单（独立事项池：截止日期可有可无；管理入口 /todos） */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          {/* 标题行 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>待办清单</span>
              {(todos || []).length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: todoUndone > 0 ? '#d97706' : '#059669', padding: '1px 7px', borderRadius: '8px', background: todoUndone > 0 ? '#fef3c7' : '#d1fae5' }}>{todoUndone} 未完成</span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>共 {todoUndone} 条</span>
          </div>

          {/* 事项列表：全部显示，溢出可滚动；点空白区也能跳 /todos */}
          {todoList.length === 0 ? (
            <div
              onClick={() => go('/todos')}
              style={{ padding: '16px 2px 2px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}
            >
              还没有待办，点此去添加一条
            </div>
          ) : (
            <div
              className="dashTodoScroll"
              onClick={() => go('/todos')}
              style={{
                display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px',
                maxHeight: '110px', overflowY: 'auto', paddingRight: '6px', cursor: 'pointer',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(244,114,182,0.4) transparent',
              }}
            >
              {todoList.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '3px 2px', minHeight: '22px' }}>
                  <span style={{
                    width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${t.done ? '#10b981' : '#c4b5fd'}`,
                    background: t.done ? '#10b981' : 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '9px', fontWeight: 700, lineHeight: 1,
                  }}>{t.done ? '✓' : ''}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '12.5px', color: t.done ? '#94a3b8' : '#111', textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  {/* 已完成的待办不再显示截止/过期时间 */}
                  {!t.done && <DueTag due={t.due} />}
                </div>
              ))}
            </div>
          )}

          {/* 去待办清单管理 */}
          <div style={{ marginTop: '10px', borderTop: '1px dashed #eee', paddingTop: '9px', textAlign: 'center' }}>
            <button onClick={() => go('/todos')} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: '#db2777', fontWeight: 600,
            }}>＋ 管理待办（新增 / 勾选 / 删除）›</button>
          </div>
        </div>
      </div>

      {/* 自动放弃提醒：发布满 10 条仍 0 出单，已自动置为「放弃」 */}
      {autoAbandoned.length > 0 && (
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ef4444' }} />
            未出单已自动放弃
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '1px 7px', borderRadius: '8px' }}>{autoAbandoned.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {autoAbandoned.map((s) => {
              const abandonedAccs = getAutoAbandonedAccounts(s)
              const accChips = abandonedAccs.map((a) => {
                const c = ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.12)' }
                return (
                  <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: c.bg, color: c.c, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{a}</span>
                )
              })
              return (
                <div key={s.id} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {accChips}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px', fontWeight: 600 }}>
                      发布满 {AUTO_ABANDON_PUBLISH_COUNT} 条视频 · 0 出单 → 已自动放弃
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const execByAccount = { ...(s.execByAccount || {}) }
                      abandonedAccs.forEach((a) => { execByAccount[a] = 'published' })
                      updateSample(s.id, { execByAccount })
                      show('已恢复为「已发布」，不再自动放弃', 'success')
                    }}
                    style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '8px', border: '1px solid #fecdd3', background: '#fff', color: '#e11d48', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >恢复</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 提醒中心：发布提醒 / 发布不足5条 / 即将到期 三合一（下划线标签式 Tab） ── */}
      {/* 外层只留上下留白，左右 16px 交给 Tab 栏自己，这样吸顶时 Tab 能撑满宽度 */}
      <div style={{ paddingTop: '12px' }}>
        {/* Tab：纯文字标签 + 数量气泡，选中项下方一条粗色条。
            position:sticky 让它滚到视口顶部后吸附住，下方列表继续滚动（列表滚动、Tab 不动）。
            背景用半透明 + 毛玻璃：既有通透感，又靠 blur 让下方滚过的文字糊掉、不至于透字干扰阅读。
            zIndex 取 2（对齐 DateFilterBar 的既有习惯），远低于 BottomNav 的 100。
            注意：sticky 的 top 由 index.css 的 .dash-sticky-bar 给（手机 0 / 桌面 20px），
            这里绝对不能写内联 top —— 内联优先级最高会压过媒体查询，
            导致桌面端 Tab 吸附到浏览器顶边、跑到手机容器外面去。 */}
        <div className="dash-sticky-bar" style={{
          display: 'flex',
          position: 'sticky', zIndex: 2,
          background: 'rgba(255, 245, 249, 0.62)',
          backdropFilter: 'blur(12px) saturate(150%)',
          WebkitBackdropFilter: 'blur(12px) saturate(150%)',
          padding: '4px 16px 5px',
          boxShadow: '0 1px 8px rgba(120,90,100,0.05)',
        }}>
          {/* 内层胶囊：保留原有圆角与描边视觉 */}
          <div style={{
            display: 'flex', flex: 1, minWidth: 0,
            background: 'rgba(255,255,255,0.6)', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.9)', padding: '0 6px',
          }}>
          {REMIND_TABS.map((t) => {
            const active = remindTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => pickTab(t.id)}
                style={{
                  flex: '1 1 0', minWidth: 0, position: 'relative',
                  padding: '5px 4px 6px', border: 'none', background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  fontSize: '12.5px', fontWeight: 700,
                  color: active ? t.accent : 'var(--text-sub)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {/* 三档标签按屏宽切换（见 index.css 的 .dashTabFull/Mid/Short）。
                      实测「发布不足5条」+ 数量气泡在 360~430px 这段最吃宽度：
                      手机最窄 320px 时按钮可用宽约 85px 反而更紧，中标签才放得下。
                      注意：显示/隐藏必须走 CSS 类，不能用内联 display（内联优先级最高会压过媒体查询） */}
                  <span className="dashTabFull">{t.label}</span>
                  <span className="dashTabMid">{t.mid}</span>
                  <span className="dashTabShort">{t.short}</span>
                  {/* 数量气泡：零值用灰底，避免一串「0」看起来像异常 */}
                  <span style={{
                    fontSize: '10.5px', fontWeight: 800, lineHeight: 1,
                    color: '#fff', background: t.count > 0 ? t.accent : '#d8c8ce',
                    borderRadius: '999px', padding: '2px 6px', marginLeft: '4px',
                    display: 'inline-block', verticalAlign: '1px',
                  }}>{t.count}</span>
                </div>
                {/* 选中下划线：用绝对定位贴底，不参与布局，切换时不引起抖动 */}
                <div style={{
                  position: 'absolute', left: '16%', right: '16%', bottom: '1px',
                  height: '2.5px', borderRadius: '3px',
                  background: active ? t.accent : 'transparent',
                  transition: 'background .15s',
                }} />
              </button>
            )
          })}
          </div>
        </div>

        {/* Tab 内容区：左右 16px 内边距放这里，与上方 Tab 的左右对齐；只渲染当前选中项 */}
        <div style={{ padding: '0 16px' }}>
          {remindTab === 'reminders' && (
            <>
              {/* 汇总行：全量展示，不再有「查看全部」入口（条目数已由 Tab 气泡表达，
                  这里只补充排序说明） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', minHeight: '18px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {allReminders.length > 0 ? '按紧急度排序' : '暂无待补发产品'}
                </span>
              </div>
              {reminders.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  暂无需要发布提醒的样品
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {reminders.map((s) => {
                    // 只显示还需要发视频的账号（从未发过 / 超 7 天没发）；都发过则显示全部
                    const pending = pendingAccounts(s)
                    const showAccounts = pending.length ? pending : getAccounts(s)
                    const daysText = pending.length
                      ? Math.max(...pending.map((a) => daysSincePublishByAccount(s, a)))
                      : daysSincePublish(s)
                    return (
                      <div key={s.id} style={{ background: '#fdfafb', border: '1px solid #f5eef2', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', color: SAMPLE_STATUS[s.status]?.color, background: SAMPLE_STATUS[s.status]?.bg, fontWeight: 600, flexShrink: 0 }}>{SAMPLE_STATUS[s.status]?.icon} {SAMPLE_STATUS[s.status]?.label}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {showAccounts.map((a) => (
                              <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{a}</span>
                            ))}
                          </div>
                          {/* 显示天数提示：未发布且逾期显示红色；还有账号没发显示橙色 */}
                          {s.status !== 'published' && isOverdue(s) ? (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>⚠ 已逾期（截止 {s.deadline}）</span>
                            </div>
                          ) : pending.length > 0 ? (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{
                                fontSize: '10px', fontWeight: 700, color: '#fff',
                                background: '#f59e0b',
                                padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap',
                              }}>{daysText === Infinity ? '⚠ 从未发布过视频' : `已 ${daysText} 天没发视频`}</span>
                            </div>
                          ) : null}
                        </div>
                        <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                          flexShrink: 0, padding: '6px 12px', borderRadius: '9px', border: 'none', background: '#ec4899', color: '#fff',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        }}>补记发布</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {remindTab === 'low' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', minHeight: '18px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {lowPublish.length > 0 ? '按发布条数排序' : `暂无发布不足 ${LOW_PUBLISH_LIMIT} 条的样品`}
                </span>
              </div>
              {lowPublish.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  暂无发布不足 {LOW_PUBLISH_LIMIT} 条的样品
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {lowPublish.map((s) => (
                    <div key={s.id} style={{ background: '#faf8ff', border: '1px solid #f0edfe', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>已发 {s.publishCount || 0} 条</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {getAccounts(s).map((a) => {
                            const acctCount = (s.countsByAccount && s.countsByAccount[a]?.publishCount) || 0
                            return (
                              <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: acctCount < 5 ? '#fef3c7' : (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: acctCount < 5 ? '#d97706' : (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{a}({acctCount}条)</span>
                            )
                          })}
                        </div>
                      </div>
                      <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                        flexShrink: 0, padding: '6px 12px', borderRadius: '9px', border: 'none', background: '#ec4899', color: '#fff',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      }}>补发布</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {remindTab === 'expiring' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', minHeight: '18px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {expiringSoon.length > 0 ? '按截止日期排序' : `近 ${EXPIRING_DAYS} 天没有即将到期的样品`}
                </span>
              </div>
              {expiringSoon.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  近 {EXPIRING_DAYS} 天没有即将到期的样品
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {expiringSoon.map((s) => {
                    const du = daysUntil(s.deadline)
                    const overdue = du !== null && du < 0
                    const text = overdue
                      ? `已逾期 ${Math.abs(du)} 天（截止 ${s.deadline}）`
                      : du === 0 ? `今天截止（${s.deadline}）` : `剩 ${du} 天（截止 ${s.deadline}）`
                    const color = overdue ? '#ef4444' : du <= 3 ? '#ea580c' : '#ca8a04'
                    return (
                      <div key={s.id} style={{ background: '#fdfafb', border: '1px solid #f5eef2', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', color: SAMPLE_STATUS[s.status]?.color, background: SAMPLE_STATUS[s.status]?.bg, fontWeight: 600, flexShrink: 0 }}>{SAMPLE_STATUS[s.status]?.icon} {SAMPLE_STATUS[s.status]?.label}</span>
                            {getAccounts(s).map((a) => (
                              <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{a}</span>
                            ))}
                          </div>
                          <div style={{ fontSize: '11px', color, marginTop: '2px', fontWeight: 600 }}>
                            {text}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 追剧入口已移到「更多」侧边栏（/dramas），总览不再占位 */}
    </div>
  )
}
