import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, AUTO_ABANDON_PUBLISH_COUNT } from '../store'
import { useToast } from '../components/Toast'
import { checkForUpdate } from '../main'
import { needPublishReminder, daysSincePublish, daysSincePublishByAccount, pendingAccounts, isOverdue, OVERDUE_STATES } from '../utils/publish'
import { getAccounts, ACCOUNTS, ACCOUNT_COLOR, mapAccount } from '../utils/accounts'
import { SAMPLE_STATUS, getAutoAbandonedAccounts } from '../utils/sampleStatus'
import { DRAMA_STATUS } from '../utils/dramaLib'
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
  const { samples, transactions, orders, publishRecords, dramas, todos, updateSample } = useStore()
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
  const [showAllLow, setShowAllLow] = useState(false)
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
  const allReminders = useMemo(
    () => (samples || []).filter((s) => needPublishReminder(s)),
    [samples],
  )
  // 总览只展示前 5 条，其余进「查看全部」列表页
  const reminders = allReminders

  // 已发布但发布不足5条的样品
  const lowPublish = useMemo(
    () => (samples || []).filter((s) => s.status === 'published' && (Number(s.publishCount) || 0) < 5 && (Number(s.orderCount) || 0) === 0),
    [samples],
  )

  // 即将到期：有截止日期、且未发布/未放弃、7 天内到期（含已逾期），按截止日期升序
  const expiringSoon = useMemo(() => {
    const list = (samples || []).filter((s) => {
      if (!s.deadline || s.status === 'published' || s.status === 'abandoned') return false
      const d = daysUntil(s.deadline)
      return d !== null && d <= 7
    })
    return list.sort((a, b) => (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999))
  }, [samples])
  // 近 7 天发布条数（按 qty 累加）
  const last7Count = useMemo(() => {
    const from = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)
    return (publishRecords || []).reduce((s, r) => (
      String(r.publishDate || '') >= from ? s + (Number(r.qty) > 0 ? Number(r.qty) : 1) : s
    ), 0)
  }, [publishRecords])

  // ── 提醒中心 Tab 配置（三个区块合并为一个 Tab 组）
  // short：窄屏（<=350px）用的短标签，避免长标签被省略号截断
  // color/bg：数量徽章未选中态的前景色与底色
  const REMIND_TABS = [
    { id: 'reminders', label: '发布提醒', short: '待发布', count: allReminders.length, color: '#ec4899', bg: '#fce7f3' },
    { id: 'low', label: '发布不足5条', short: '不足5条', count: lowPublish.length, color: '#8b5cf6', bg: '#ede9fe' },
    { id: 'expiring', label: '即将到期', short: '将到期', count: expiringSoon.length, color: '#f97316', bg: '#ffedd5' },
  ]
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
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh', color: '#1a1a1a' }}>
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

      {/* 次要统计卡：收支（统一白底素描边） */}
      <div style={{ padding: '8px 16px 6px', display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>

        {/* 收支（收入红 / 支出绿 反色配色） */}
        <div onClick={() => go('/finance')} style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#8a8588', marginBottom: '6px' }}>收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>¥{fmt(stat.net)}</span>
            <span style={{ fontSize: '11px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>入 ¥{fmt(stat.income)}</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>出 ¥{fmt(stat.expense)}</span>
            </span>
          </div>
        </div>
      </div>

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

      {/* ── 提醒中心：发布提醒 / 发布不足5条 / 即将到期 三合一 Tab ── */}
      {/* Tab 与内容同处一张白卡：Tab 行有淡粉底 + 选中项底部色条，天然形成「同一组」的容器感 */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{
          background: '#fff', border: '1px solid #ece3e6', borderRadius: '14px',
          overflow: 'hidden', boxShadow: '0 1px 3px rgba(120,90,100,0.06)',
        }}>
          {/* Tab 切换条：淡粉底 + 均分；选中项白底 + 粉色下划线 */}
          <div style={{ display: 'flex', background: '#fdf8fa', borderBottom: '1px solid #f2ebee' }}>
            {REMIND_TABS.map((t) => {
              const active = remindTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => pickTab(t.id)}
                  style={{
                    flex: '1 1 0', minWidth: 0, padding: '11px 4px 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontSize: '12.5px', fontWeight: active ? 700 : 600,
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#ec4899' : 'var(--text-sub)',
                    borderBottom: active ? '2.5px solid #ec4899' : '2.5px solid transparent',
                    marginBottom: '-1px',
                    transition: 'color .15s, background .15s',
                  }}
                >
                  {/* 窄屏（<=350px）用短标签，避免「发布不足5条」被省略号截断。
                      注意：显示/隐藏必须走 CSS 类，不能用内联 display（内联优先级最高会压过媒体查询） */}
                  <span className="dashTabFull">{t.label}</span>
                  <span className="dashTabShort">{t.short}</span>
                  {/* 数量徽章：选中态实心粉底白字；未选中浅底 + 同色字，避免实心灰块显脏 */}
                  {t.count > 0 && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700, lineHeight: 1,
                      padding: '1px 5px', borderRadius: '8px',
                      background: active ? '#ec4899' : t.bg,
                      color: active ? '#fff' : t.color,
                      flexShrink: 0,
                    }}>{t.count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab 内容：只渲染当前选中项；每项自带「汇总行（共 N 个 · 操作入口）+ 列表」 */}
          <div style={{ padding: '12px 12px 10px' }}>
          {remindTab === 'reminders' && (
            <>
              {/* 汇总行：Tab 已表达标题，这里只留「共 N 个」+ 操作入口，避免与 Tab 重复 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', minHeight: '18px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {allReminders.length > 0 ? `共 ${allReminders.length} 个产品待补发` : '暂无待补发产品'}
                </span>
                {allReminders.length > 0 && (
                  <button onClick={() => go('/publish-reminders')} style={{ fontSize: '12px', color: '#ec4899', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>查看全部 ›</button>
                )}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', minHeight: '18px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {lowPublish.length > 0 ? `共 ${lowPublish.length} 个产品发布不足 5 条` : '暂无发布不足 5 条的样品'}
                </span>
                {lowPublish.length > 5 && (
                  <button onClick={() => setShowAllLow(!showAllLow)} style={{ fontSize: '12px', color: '#8b5cf6', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{showAllLow ? '收起' : `展开全部 ${lowPublish.length} 条`} ›</button>
                )}
              </div>
              {lowPublish.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  暂无发布不足 5 条的样品
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(showAllLow ? lowPublish : lowPublish.slice(0, 5)).map((s) => (
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', minHeight: '18px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {expiringSoon.length > 0 ? `共 ${expiringSoon.length} 个样品近 7 天到期` : '近 7 天没有即将到期的样品'}
                </span>
                {expiringSoon.length > 0 && (
                  <button onClick={() => go('/samples/expiring')} style={{ fontSize: '12px', color: '#ec4899', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>查看全部 ›</button>
                )}
              </div>
              {expiringSoon.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  近 7 天没有即将到期的样品
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
                            ⏰ {text}
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
      </div>

      {/* 追剧（放最下面）：显示剧名列表 */}
      <div style={{ padding: '8px 16px 2px' }}>
        <div style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          <div onClick={() => go('/dramas')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>📺</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>追剧</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>共 {(dramas || []).length} 部 · 点此查看全部 / 管理</div>
              </div>
            </div>
            <span style={{ fontSize: '16px', color: '#c9c4c6', flexShrink: 0 }}>›</span>
          </div>
          {(dramas || []).length > 0 && (
            /* 列表高度约 5 条(5×35px)，超出部分可滚动；点击标题栏进 /dramas 查看全部 */
            <div className="hide-scrollbar" style={{ marginTop: '6px', maxHeight: '175px', overflowY: 'auto', paddingRight: '2px' }}>
              {(dramas || []).map((d, i) => (
                <div key={d.id} style={{ borderTop: '1px solid #f2ebee', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ flexShrink: 0, fontSize: '11px', color: '#c9c4c6', fontWeight: 600, width: '16px' }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 600, color: (DRAMA_STATUS.find((s) => s.key === (d.status || 'want')) || DRAMA_STATUS[0]).c }}>
                    {(DRAMA_STATUS.find((s) => s.key === (d.status || 'want')) || DRAMA_STATUS[0]).label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
