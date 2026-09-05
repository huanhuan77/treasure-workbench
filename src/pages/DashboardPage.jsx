import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { checkForUpdate } from '../main'
import { needPublishReminder, daysSincePublish } from '../utils/publish'
import { getAccounts } from '../utils/accounts'

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

export function DashboardPage() {
  const navigate = useNavigate()
  const { samples, transactions, orders, publishRecords } = useStore()
  const { show } = useToast()

  // 手动检查更新（主屏幕应用无刷新入口，检测到新版本时硬刷新加载）
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

  // ── 今日待办（读 daily_plan_v1，与 BottomNav 徽标一致）
  const [todo, setTodo] = useState({ tasks: [], undone: 0 })
  useEffect(() => {
    const calc = () => {
      try {
        const d = new Date()
        const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        const raw = localStorage.getItem('daily_plan_v1')
        if (!raw) { setTodo({ tasks: [], undone: 0 }); return }
        const tasks = (JSON.parse(raw)[today]?.tasks) || []
        setTodo({ tasks, undone: tasks.filter((t) => !t.done).length })
      } catch { setTodo({ tasks: [], undone: 0 }) }
    }
    calc()
    window.addEventListener('dailyPlanUpdated', calc)
    window.addEventListener('storage', calc)
    return () => {
      window.removeEventListener('dailyPlanUpdated', calc)
      window.removeEventListener('storage', calc)
    }
  }, [])

  // ── 统计计算
  const stat = useMemo(() => {
    // 样品：仅统计总数、逾期、临期
    let sTotal = 0
    const urgent = []  // 已过期 (dd <= 0)
    const recent = []  // 未逾期但3天内到期 (0 < dd <= 3)，与 urgent 不重叠
    ;(samples || []).forEach((s) => {
      sTotal++
      const dd = daysUntil(s.deadline)
      if (dd !== null && dd <= 0) urgent.push(s)
      else if (dd !== null && dd <= 3) recent.push(s)
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
    // 独立出单台账
    const orderTotal = (orders || []).length
    const orderQty = (orders || []).reduce((s, o) => s + (Number(o.qty) || 0), 0)
    return {
      sTotal, recent, urgent,
      income, expense, net: income - expense,
      orderTotal, orderQty,
    }
  }, [samples, transactions, orders])

  // 发布提醒：可发布状态但超阈值未发（含从未发布）
  const reminders = useMemo(
    () => (samples || []).filter((s) => needPublishReminder(s)).slice(0, 8),
    [samples],
  )
  // 最近发布记录（总览摘要）
  const recentPublishes = useMemo(
    () => [...(publishRecords || [])]
      .sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || '')))
      .slice(0, 5),
    [publishRecords],
  )
  const sampleNameMap = useMemo(
    () => Object.fromEntries((samples || []).map((s) => [s.id, s.name])),
    [samples],
  )

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
            <button
              onClick={handleCheckUpdate}
              disabled={checking}
              style={{
                padding: '7px 12px', borderRadius: '8px',
                border: '1px solid #fbcfe8', background: '#fff', color: '#db2777',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{checking ? '检查中…' : '↻ 检查更新'}</button>
            <button onClick={() => go('/product/new')} style={{
              padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: '#ec4899', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>＋ 新建产品</button>
          </div>
        </div>
      </header>

      {/* 出单台账主入口（白底 + 粉点强调） */}
      <div style={{ padding: '14px 16px 4px' }}>
        <div onClick={() => go('/orders')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '16px 18px', cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(236,72,153,0.06)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ec4899' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#db2777', letterSpacing: '0.3px' }}>出单记录</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#111', lineHeight: 1 }}>{fmt(stat.orderTotal)}</span>
              <span style={{ fontSize: '12px', color: '#c9a3ab' }}>笔出单 · 累计 {stat.orderQty} 单</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', color: '#c9a3ab' }}>记出单</div>
          </div>
          <span style={{ marginLeft: '12px', fontSize: '18px', color: '#f9a8d4', flexShrink: 0 }}>›</span>
        </div>
      </div>

      {/* 次要统计卡：样品 / 收支 / 今日待办（白底浅粉描边） */}
      <div style={{ padding: '8px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>

        {/* 样品（绿色边框） */}
        <div onClick={() => go('/samples')} style={{ background: '#fff', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(5,150,105,0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', marginBottom: '6px' }}>样品</div>
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

        {/* 收支（蓝色边框） */}
        <div onClick={() => go('/finance')} style={{ background: '#fff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginBottom: '6px' }}>收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: stat.net >= 0 ? '#2563eb' : '#dc2626' }}>¥{fmt(stat.net)}</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
            入 ¥{fmt(stat.income)} · 出 ¥{fmt(stat.expense)}
          </div>
        </div>

        {/* 今日待办（紫色边框） */}
        <div onClick={() => go('/daily')} style={{ background: '#fff', border: '1.5px solid #ddd6fe', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(124,58,237,0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed', marginBottom: '6px' }}>今日待办</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: todo.undone > 0 ? '#7c3aed' : '#059669' }}>{todo.undone}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>未完成</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
            共 {todo.tasks.length} 项
          </div>
        </div>
      </div>

      {/* 发布提醒（N 天未发的样品） */}
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ef4444' }} />
            发布提醒
            {reminders.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '1px 7px', borderRadius: '8px' }}>{reminders.length}</span>}
          </div>
          {reminders.length > 0 && (
            <button onClick={() => go('/samples')} style={{ fontSize: '12px', color: '#db2777', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>去样品库 ›</button>
          )}
        </div>
        {reminders.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#16a34a' }}>
            🎉 已发布的样品都按时发了视频
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reminders.map((s) => (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #fecdd3', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px', fontWeight: 600 }}>
                    ⚠ {daysSincePublish(s) === Infinity ? '从未发布视频' : `已 ${daysSincePublish(s)} 天未发`}
                  </div>
                </div>
                <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: '9px', border: 'none', background: '#ec4899', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}>补记发布</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 视频发布记录摘要 */}
      <div style={{ padding: '14px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ec4899' }} />
            视频发布记录
          </div>
          <button onClick={() => go('/publish-records')} style={{ fontSize: '12px', color: '#db2777', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>查看全部 ›</button>
        </div>
        {recentPublishes.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#9ca3af' }}>
            还没有视频发布记录
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentPublishes.map((r) => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sampleNameMap[r.sampleId] || '（样品已删除）'}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>📅 {r.publishDate}{r.accounts?.length ? ` · ${(r.accounts || []).join('、')}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
