import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { checkForUpdate } from '../main'

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
  const { samples, transactions, orders } = useStore()
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
    const urgent = []  // 已过期
    const recent = []  // 过期 + 3天内到期
    ;(samples || []).forEach((s) => {
      sTotal++
      const dd = daysUntil(s.deadline)
      if (dd !== null && dd <= 3) {
        recent.push(s)
        if (dd <= 0) urgent.push(s)
      }
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

  const now = new Date()
  const todayLabel = `${now.getMonth()+1}月${now.getDate()}日`

  // 统计卡点击跳转
  const go = (p) => navigate(p)

  return (
    <div className="app-container" style={{ background: '#fff5f6', minHeight: '100vh', color: '#1a1a1a' }}>
      <header style={{ padding: 'calc(18px + var(--safe-top)) 20px 14px', background: '#fff', borderBottom: '1px solid #fce7ec' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#b3888f' }}>{greeting()} · {todayLabel}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#db2777', letterSpacing: '-0.4px' }}>工作台总览</h1>
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

        {/* 样品 */}
        <div onClick={() => go('/samples')} style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(236,72,153,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#c9a3ab', marginBottom: '6px' }}>样品</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#111' }}>{stat.sTotal}</span>
            <span style={{ fontSize: '11px', color: '#c9a3ab' }}>个</span>
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {stat.urgent.length > 0 && <span style={{ fontSize: '11px', fontWeight: 600, color: '#ec4899' }}>{stat.urgent.length} 逾期</span>}
            {stat.recent.length > 0 && <span style={{ fontSize: '11px', color: '#db2777' }}>{stat.recent.length} 临期</span>}
            {stat.urgent.length === 0 && stat.recent.length === 0 && <span style={{ fontSize: '11px', color: '#c9a3ab' }}>无临期</span>}
          </div>
        </div>

        {/* 收支 */}
        <div onClick={() => go('/finance')} style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(236,72,153,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#c9a3ab', marginBottom: '6px' }}>收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: stat.net >= 0 ? '#ec4899' : '#dc2626' }}>¥{fmt(stat.net)}</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#c9a3ab' }}>
            入 ¥{fmt(stat.income)} · 出 ¥{fmt(stat.expense)}
          </div>
        </div>

        {/* 今日待办 */}
        <div onClick={() => go('/daily')} style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(236,72,153,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#c9a3ab', marginBottom: '6px' }}>今日待办</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: todo.undone > 0 ? '#111' : '#ec4899' }}>{todo.undone}</span>
            <span style={{ fontSize: '11px', color: '#c9a3ab' }}>未完成</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#c9a3ab' }}>
            共 {todo.tasks.length} 项
          </div>
        </div>
      </div>

      {/* 全部功能入口 */}
      <div style={{ padding: '14px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '10px' }}>
          <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ec4899' }} />
          全部功能
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px' }}>
          {[
            { to: '/products', label: '文案库', icon: '📝' },
            { to: '/orders', label: '出单', icon: '💰' },
            { to: '/samples', label: '样品', icon: '🏷️' },
            { to: '/daily', label: '每日计划', icon: '📋' },
            { to: '/finance', label: '收支', icon: '💳' },
            { to: '/calendar', label: '日历', icon: '📅' },
            { to: '/reading', label: '读书成长', icon: '📚' },
            { to: '/brands', label: '品牌方', icon: '🤝' },
            { to: '/savings', label: '攒钱计划', icon: '🐷' },
            { to: '/investment', label: '投资', icon: '📈' },
            { to: '/sensitive-check', label: '违禁词检测', icon: '🚫' },
            { to: '/sensitive', label: '词库', icon: '⚙️' },
            { to: '/backup', label: '数据备份', icon: '💾' },
          ].map((m) => (
            <button key={m.to} onClick={() => go(m.to)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '14px 4px', background: '#fff', border: '1px solid #fce7ec',
              borderRadius: '10px', cursor: 'pointer', color: '#111',
            }}>
              <span style={{ fontSize: '22px', lineHeight: 1 }}>{m.icon}</span>
              <span style={{ fontSize: '11px', color: '#6b6670', whiteSpace: 'nowrap' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
