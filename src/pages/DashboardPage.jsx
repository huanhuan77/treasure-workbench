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
    <div className="app-container" style={{ background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
      <header style={{ padding: 'calc(18px + var(--safe-top)) 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', letterSpacing: '0.2px' }}>{greeting()} · {todayLabel}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.4px' }}>工作台总览</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleCheckUpdate}
              disabled={checking}
              style={{
                padding: '7px 12px', borderRadius: '8px',
                border: '1px solid rgba(167,139,250,0.4)',
                background: 'transparent', color: '#a78bfa',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{checking ? '检查中…' : '↻ 检查更新'}</button>
            <button onClick={() => go('/product/new')} style={{
              padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: '#7c3aed', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>＋ 新建产品</button>
          </div>
        </div>
      </header>

      {/* 出单台账主入口（深酒红底） */}
      <div style={{ padding: '6px 16px 4px' }}>
        <div onClick={() => go('/orders')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#4c0519', border: '1px solid #9f1239', borderRadius: '14px', padding: '16px 18px', cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fda4af', marginBottom: '6px', letterSpacing: '0.5px' }}>出单记录</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff1f2', lineHeight: 1 }}>{fmt(stat.orderTotal)}</span>
              <span style={{ fontSize: '12px', color: '#fecdd3' }}>笔出单 · 累计 {stat.orderQty} 单</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', color: '#fecdd3' }}>记出单</div>
          </div>
          <span style={{ marginLeft: '12px', fontSize: '18px', color: '#fda4af', flexShrink: 0 }}>›</span>
        </div>
      </div>

      {/* 次要统计卡：样品 / 收支 / 今日待办（深灰底） */}
      <div style={{ padding: '8px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>

        {/* 样品 */}
        <div onClick={() => go('/samples')} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>样品</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>{stat.sTotal}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>个</span>
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {stat.urgent.length > 0 && <span style={{ fontSize: '11px', fontWeight: 600, color: '#f87171' }}>{stat.urgent.length} 逾期</span>}
            {stat.recent.length > 0 && <span style={{ fontSize: '11px', color: '#fb923c' }}>{stat.recent.length} 临期</span>}
            {stat.urgent.length === 0 && stat.recent.length === 0 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>无临期</span>}
          </div>
        </div>

        {/* 收支 */}
        <div onClick={() => go('/finance')} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: stat.net >= 0 ? '#34d399' : '#f87171' }}>¥{fmt(stat.net)}</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
            入 ¥{fmt(stat.income)} · 出 ¥{fmt(stat.expense)}
          </div>
        </div>

        {/* 今日待办 */}
        <div onClick={() => go('/daily')} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>今日待办</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: todo.undone > 0 ? '#a78bfa' : '#34d399' }}>{todo.undone}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>未完成</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
            共 {todo.tasks.length} 项
          </div>
        </div>
      </div>

      {/* 全部功能入口 */}
      <div style={{ padding: '14px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '10px', letterSpacing: '0.3px' }}>全部功能</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px' }}>
          {[
            { to: '/products', label: '文案库', color: '#6ee7b7', bg: '#064e3b' },
            { to: '/orders', label: '出单', color: '#fda4af', bg: '#4c0519' },
            { to: '/samples', label: '样品', color: '#fb7185', bg: '#3f0d24' },
            { to: '/daily', label: '每日计划', color: '#c4b5fd', bg: '#2e1065' },
            { to: '/finance', label: '收支', color: '#7dd3fc', bg: '#0c4a6e' },
            { to: '/calendar', label: '日历', color: '#fdba74', bg: '#431407' },
            { to: '/reading', label: '读书成长', color: '#d8b4fe', bg: '#3b0764' },
            { to: '/brands', label: '品牌方', color: '#5eead4', bg: '#042f2e' },
            { to: '/savings', label: '攒钱计划', color: '#f9a8d4', bg: '#500724' },
            { to: '/investment', label: '投资', color: '#86efac', bg: '#052e16' },
            { to: '/sensitive-check', label: '违禁词检测', color: '#fca5a5', bg: '#450a0a' },
            { to: '/sensitive', label: '词库', color: '#cbd5e1', bg: '#1e293b' },
            { to: '/backup', label: '数据备份', color: '#93c5fd', bg: '#172554' },
          ].map((m) => (
            <button key={m.to} onClick={() => go(m.to)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '12px 4px', background: '#1e293b', border: '1px solid #334155',
              borderRadius: '12px', cursor: 'pointer', color: '#e2e8f0',
            }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '8px', background: m.bg, color: m.color, fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {m.label.slice(0, 1)}
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
