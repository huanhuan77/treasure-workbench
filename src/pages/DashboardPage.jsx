import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#c2410c', bg: 'rgba(251,146,60,0.16)' },
  '晚梨不吃梨': { c: '#1d4ed8', bg: 'rgba(59,130,246,0.16)' },
  '努力成为富婆': { c: '#7e22ce', bg: 'rgba(168,85,247,0.16)' },
}
function getSampleAccounts(s) {
  if (Array.isArray(s?.accounts) && s.accounts.length) return s.accounts
  return s?.account ? [s.account] : []
}

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
  const { products, samples, transactions } = useStore()

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
    // 文案库：产品数 / 文案总数 / 出单数
    const prodCount = (products || []).length
    const allCopies = (products || []).reduce((s, p) => s + (p.copies?.length || 0), 0)
    const orderCopies = (products || []).reduce((s, p) => s + (p.copies || []).filter((c) => c.hasOrder).length, 0)
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
    // 每账号出单样品数（爆单 / 已发布·出单）
    const orderByAcc = {}
    for (const a of ACCOUNTS) orderByAcc[a] = 0
    let totalOrder = 0
    ;(samples || []).forEach((s) => {
      if (!(s.status === 'hit' || s.status === 'published_paid')) return
      getSampleAccounts(s).filter((a) => ACCOUNTS.includes(a)).forEach((a) => { orderByAcc[a]++; totalOrder++ })
    })
    return {
      prodCount, allCopies, orderCopies,
      sTotal, recent, urgent,
      income, expense, net: income - expense,
      orderByAcc, totalOrder,
    }
  }, [products, samples, transactions])

  const now = new Date()
  const todayLabel = `${now.getMonth()+1}月${now.getDate()}日`

  // 统计卡点击跳转
  const go = (p) => navigate(p)

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(18px + var(--safe-top)) 20px 12px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-sub)' }}>{greeting()} · {todayLabel}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.4px' }}>工作台总览</h1>
          <button onClick={() => go('/product/new')} style={{
            padding: '7px 14px', borderRadius: '999px', border: 'none',
            background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(244,114,182,0.3)',
          }}>＋ 新建产品</button>
        </div>
      </header>

      {/* 文案库主入口（最常用，整行突出显示） */}
      <div style={{ padding: '4px 16px 2px' }}>
        <div onClick={() => go('/products')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.28)', borderRadius: '16px', padding: '16px 18px', cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginBottom: '4px' }}>文案库</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{fmt(stat.allCopies)}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>条文案 · {stat.prodCount} 个产品</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#e11d48', lineHeight: 1.1 }}>{fmt(stat.orderCopies)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>出单</div>
          </div>
          <span style={{ marginLeft: '12px', fontSize: '18px', color: '#059669', flexShrink: 0 }}>›</span>
        </div>
      </div>

      {/* 每账号近出单（按账号分组，点击看全部） */}
      <div style={{ padding: '6px 16px 2px' }}>
        <div onClick={() => go('/recent-orders')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: '16px', padding: '12px 16px', cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px' }}>每账号近出单</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ACCOUNTS.map((a) => {
                const col = ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
                return (
                  <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: col.bg, color: col.c }}>
                    {a}
                    <b style={{ fontSize: '13px' }}>{stat.orderByAcc[a] || 0}</b>
                  </span>
                )
              })}
            </div>
          </div>
          <span style={{ marginLeft: '10px', fontSize: '18px', color: 'var(--text-sub)', flexShrink: 0 }}>›</span>
        </div>
      </div>

      {/* 次要统计卡：样品 / 收支 / 今日待办 */}
      <div style={{ padding: '6px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>

        {/* 样品 */}
        <div onClick={() => go('/samples')} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px' }}>样品</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>{stat.sTotal}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>个</span>
          </div>
          <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {stat.urgent.length > 0 && <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>{stat.urgent.length}逾期</span>}
            {stat.recent.length > 0 && <span style={{ fontSize: '11px', color: '#ea580c' }}>{stat.recent.length}临期</span>}
            {stat.urgent.length === 0 && stat.recent.length === 0 && <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>无临期</span>}
          </div>
        </div>

        {/* 收支 */}
        <div onClick={() => go('/finance')} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px' }}>收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: stat.net >= 0 ? '#059669' : '#e11d48' }}>¥{fmt(stat.net)}</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-sub)' }}>
            入 ¥{fmt(stat.income)} · 出 ¥{fmt(stat.expense)}
          </div>
        </div>

        {/* 今日待办 */}
        <div onClick={() => go('/daily')} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px' }}>今日待办</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: todo.undone > 0 ? '#7c3aed' : '#059669' }}>{todo.undone}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>未完成</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-sub)' }}>
            共 {todo.tasks.length} 项
          </div>
        </div>
      </div>

      {/* 全部功能入口 */}
      <div style={{ padding: '12px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>全部功能</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px' }}>
          {[
            { to: '/products', label: '文案库', color: '#059669', bg: 'rgba(16,185,129,0.14)' },
            { to: '/samples', label: '样品', color: '#e11d48', bg: 'rgba(244,63,94,0.13)' },
            { to: '/daily', label: '每日计划', color: '#7c3aed', bg: 'rgba(139,92,246,0.14)' },
            { to: '/finance', label: '收支', color: '#0284c7', bg: 'rgba(14,165,233,0.14)' },
            { to: '/calendar', label: '日历', color: '#c2410c', bg: 'rgba(251,146,60,0.15)' },
            { to: '/reading', label: '读书成长', color: '#7c3aed', bg: 'rgba(168,85,247,0.14)' },
            { to: '/brands', label: '品牌方', color: '#0d9488', bg: 'rgba(13,148,136,0.14)' },
            { to: '/savings', label: '攒钱计划', color: '#d4537e', bg: 'rgba(212,83,126,0.14)' },
            { to: '/investment', label: '投资', color: '#059669', bg: 'rgba(16,185,129,0.12)' },
            { to: '/sensitive-check', label: '违禁词检测', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
            { to: '/sensitive', label: '词库', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
            { to: '/backup', label: '数据备份', color: '#185fa5', bg: 'rgba(37,99,235,0.12)' },
          ].map((m) => (
            <button key={m.to} onClick={() => go(m.to)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
              padding: '12px 4px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)',
              borderRadius: '14px', cursor: 'pointer', color: 'var(--text-main)',
            }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: m.bg, color: m.color, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {m.label.slice(0, 1)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
