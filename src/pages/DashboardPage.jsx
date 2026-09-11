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
  // 排序：未完成在前 → 有截止日的按日期升序在前 → 无截止日的在后
  const todoList = useMemo(() => {
    return [...(todos || [])].sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1
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
  const reminders = allReminders.slice(0, 5)

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

      {/* 次要统计卡：样品 / 收支（统一白底素描边） */}
      <div style={{ padding: '8px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

        {/* 样品 */}
        <div onClick={() => go('/samples')} style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#8a8588', marginBottom: '6px' }}>样品</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#111' }}>{stat.sTotal}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>个</span>
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {stat.urgent.length > 0 && <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626' }}>{stat.urgent.length} 逾期</span>}
            {stat.recent.length > 0 && <span style={{ fontSize: '11px', color: '#ea580c' }}>{stat.recent.length} 临期</span>}
            {stat.urgent.length === 0 && stat.recent.length === 0 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>无临期</span>}
          </div>
        </div>

        {/* 收支（收入红 / 支出绿 反色配色） */}
        <div onClick={() => go('/finance')} style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#8a8588', marginBottom: '6px' }}>收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>¥{fmt(stat.net)}</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>入 ¥{fmt(stat.income)}</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>出 ¥{fmt(stat.expense)}</span>
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
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>共 {(todos || []).length} 条</span>
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
                  <DueTag due={t.due} />
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

      {/* 视频发布记录快捷入口（合并为单卡：点卡看全部，按钮直接记发布） */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div onClick={() => go('/publish-records')} style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '4px' }}>🎬 视频发布记录</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>{(publishRecords || []).length}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>条记录 · 近 7 天 {last7Count} 条</span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>可多选账号 · 一次记多条 · 查看全部 ›</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); go('/publish-record/new') }} style={{
              flexShrink: 0, padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>＋ 记发布</button>
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

      {/* 发布提醒（N 天未发的样品） */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#d0c4c8' }} />
            发布提醒
            {allReminders.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#9ca3af', padding: '1px 7px', borderRadius: '8px' }}>{allReminders.length}</span>}
          </div>
          {allReminders.length > 0 && (
            <button onClick={() => go('/publish-reminders')} style={{ fontSize: '12px', color: '#8a8588', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>查看全部 {allReminders.length} 条 ›</button>
          )}
        </div>
        {reminders.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>
            暂无需要发布提醒的样品
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {reminders.map((s) => {
              // 只显示还需要发视频的账号（从未发过 / 超 7 天没发）；都发过则显示全部
              const pending = pendingAccounts(s)
              const showAccounts = pending.length ? pending : getAccounts(s)
              const daysText = pending.length
                ? Math.max(...pending.map((a) => daysSincePublishByAccount(s, a)))
                : daysSincePublish(s)
              return (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  {/* 已发布的样品不显示时间提示（逾期/已 N 天没发） */}
                  {s.status !== 'published' && (
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontWeight: 600 }}>
                      {isOverdue(s)
                        ? `⚠ 已逾期（截止 ${s.deadline}）`
                        : `⚠ ${(daysText === Infinity ? '从未发布过视频' : `已 ${daysText} 天没发视频`)}（出单品需持续发）`}
                    </div>
                  )}
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
      </div>

      {/* 即将到期样品（按截止日期：7 天内 / 已逾期） */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#d0c4c8' }} />
            即将到期
            {expiringSoon.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#9ca3af', padding: '1px 7px', borderRadius: '8px' }}>{expiringSoon.length}</span>}
          </div>
          {expiringSoon.length > 0 && (
            <button onClick={() => go('/samples')} style={{ fontSize: '12px', color: '#8a8588', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>查看全部 ›</button>
          )}
        </div>
        {expiringSoon.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>
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
                <div key={s.id} style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
