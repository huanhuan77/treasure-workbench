import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { deadlineDesc } from '../utils/helpers'

// 统计卡片配色（与各模块一致）
const STATUS_META = {
  unpublished: { label: '待发布', color: '#64748b', bg: 'rgba(100,116,139,0.14)' },
  hit:         { label: '爆单',   color: '#e11d48', bg: 'rgba(244,63,94,0.13)' },
  published:   { label: '已发布', color: '#059669', bg: 'rgba(16,185,129,0.14)' },
  abandoned:   { label: '放弃',   color: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },
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
    // 样品
    const ss = {}
    let sTotal = 0
    const urgent = []  // 即将截止（<=3天或过期）
    const recent = []  // 今天截止 / 过期 / 3天内
    ;(samples || []).forEach((s) => {
      ss[s.status] = (ss[s.status] || 0) + 1
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
    return {
      ss, sTotal, recent, urgent,
      ym, income, expense, net: income - expense,
    }
  }, [products, samples, transactions])

  // 今日到期标签文字
  const deadlineLabel = (s) => {
    const d = deadlineDesc(s.deadline)
    return { text: d, urgent: (s && daysUntil(s.deadline) !== null && daysUntil(s.deadline) <= 3) }
  }

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

      {/* 3 张统计主卡（文案库通过下方"全部功能"入口进入） */}
      <div style={{ padding: '4px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

        {/* 样品 */}
        <div onClick={() => go('/samples')} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px' }}>样品</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-main)' }}>{stat.sTotal}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>个</span>
          </div>
          <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {stat.urgent.length > 0 && <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>{stat.urgent.length} 逾期</span>}
            {stat.recent.length > 0 && <span style={{ fontSize: '12px', color: '#ea580c' }}>{stat.recent.length} 临期</span>}
            {stat.urgent.length === 0 && stat.recent.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>无临期</span>}
          </div>
        </div>

        {/* 收支 */}
        <div onClick={() => go('/finance')} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px' }}>{stat.ym} 收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: stat.net >= 0 ? '#059669' : '#e11d48' }}>¥{fmt(stat.net)}</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-sub)' }}>
            入 ¥{fmt(stat.income)} · 出 ¥{fmt(stat.expense)}
          </div>
        </div>

        {/* 今日待办 */}
        <div onClick={() => go('/daily')} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px' }}>今日待办</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: todo.undone > 0 ? '#7c3aed' : '#059669' }}>{todo.undone}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>未完成</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-sub)' }}>
            共 {todo.tasks.length} 项
          </div>
        </div>
      </div>

      {/* 样品速览 */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>样品状态速览</span>
          <button onClick={() => go('/samples')} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer' }}>查看全部 ›</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <button key={k} onClick={() => go('/samples')} style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: '12px',
              background: m.bg, color: m.color, border: 'none', cursor: 'pointer',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.2 }}>{stat.ss[k] || 0}</div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>{m.label}</div>
            </button>
          ))}
        </div>
        {/* 临期样品提醒 */}
        {stat.recent.length > 0 && (
          <div style={{ marginTop: '8px', borderRadius: '10px', background: 'rgba(251,191,36,0.10)', padding: '8px 12px', fontSize: '12px', color: '#92400e' }}>
            {stat.recent.slice(0, 3).map((s) => (
              <div key={s.id} style={{ display: 'flex', gap: '6px', padding: '2px 0' }}>
                <span style={{ flexShrink: 0, color: '#ef4444' }}>{deadlineLabel(s).text}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <span style={{ flexShrink: 0, color: 'var(--text-sub)' }}>{s.account || ''}</span>
              </div>
            ))}
          </div>
        )}
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
