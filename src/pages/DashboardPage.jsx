import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { OrderFormModal } from '../components/OrderFormModal'
import { checkForUpdate } from '../main'
import { needPublishReminder, daysSincePublish, isOverdue, OVERDUE_STATES } from '../utils/publish'
import { getAccounts, ACCOUNT_COLOR } from '../utils/accounts'
import { SAMPLE_STATUS } from '../utils/sampleStatus'

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
  const { samples, transactions, orders, publishRecords, addOrder } = useStore()
  const { show } = useToast()
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const handleSaveOrder = (payload) => {
    if (!payload.name) { show('请填写品名', 'error'); return }
    addOrder(payload)
    setOrderModalOpen(false)
    show('已记一笔出单', 'success')
  }

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
    // 独立出单台账
    const orderTotal = (orders || []).length
    const orderQty = (orders || []).reduce((s, o) => s + (Number(o.qty) || 0), 0)
    return {
      sTotal, recent, urgent,
      income, expense, net: income - expense,
      orderTotal, orderQty,
    }
  }, [samples, transactions, orders])

  // 发布提醒：可发布状态但超阈值未发（含从未发布）；abandoned 已被 needPublishReminder 排除
  const allReminders = useMemo(
    () => (samples || []).filter((s) => needPublishReminder(s)),
    [samples],
  )
  // 总览只展示前 5 条，其余进「查看全部」列表页
  const reminders = allReminders.slice(0, 5)
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

      {/* 出单台账主入口（白底 + 粉点强调，紧凑布局） */}
      <div style={{ padding: '12px 16px 2px' }}>
        <div onClick={() => go('/orders')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '11px 14px', cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(236,72,153,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ec4899', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#db2777', letterSpacing: '0.3px' }}>出单</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#111', lineHeight: 1 }}>{fmt(stat.orderTotal)}</span>
              <span style={{ fontSize: '11px', color: '#c9a3ab' }}>笔 · 累计 {stat.orderQty} 单</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button onClick={(e) => { e.stopPropagation(); setOrderModalOpen(true) }} style={{
              border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
              fontSize: '12px', color: '#db2777', fontWeight: 700,
            }}>＋ 记出单</button>
            <span style={{ fontSize: '16px', color: '#f9a8d4' }}>›</span>
          </div>
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

        {/* 收支（收入红 #dc2626 / 支出绿 #16a34a 反色配色） */}
        <div onClick={() => go('/finance')} style={{ background: '#fff', border: '1.5px solid #fbcfe8', borderRadius: '12px', padding: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(236,72,153,0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#db2777', marginBottom: '6px' }}>收支</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>¥{fmt(stat.net)}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>净额</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>入 ¥{fmt(stat.income)}</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>出 ¥{fmt(stat.expense)}</span>
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

      {/* 视频发布记录快捷入口（合并为单卡：点卡看全部，按钮直接记发布） */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div onClick={() => go('/publish-records')} style={{ background: '#fff', border: '1.5px solid #fbcfe8', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(236,72,153,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#db2777', marginBottom: '4px' }}>🎬 视频发布记录</div>
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

      {/* 追剧入口 */}
      <div style={{ padding: '8px 16px 2px' }}>
        <div onClick={() => go('/dramas')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', border: '1.5px solid #fbcfe8', borderRadius: '12px',
          padding: '11px 14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(236,72,153,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>📺</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>追剧</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>记新剧 · 想追就加个剧名</div>
            </div>
          </div>
          <span style={{ fontSize: '16px', color: '#f9a8d4', flexShrink: 0 }}>›</span>
        </div>
      </div>

      {/* 发布提醒（N 天未发的样品） */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ef4444' }} />
            发布提醒
            {allReminders.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '1px 7px', borderRadius: '8px' }}>{allReminders.length}</span>}
          </div>
          {allReminders.length > 0 && (
            <button onClick={() => go('/publish-reminders')} style={{ fontSize: '12px', color: '#db2777', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>查看全部 {allReminders.length} 条 ›</button>
          )}
        </div>
        {reminders.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: '#16a34a' }}>
            🎉 已发布的样品都按时发了视频
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto', paddingRight: '2px' }}>
            {reminders.map((s) => (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #fecdd3', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', color: SAMPLE_STATUS[s.status]?.color, background: SAMPLE_STATUS[s.status]?.bg, fontWeight: 600, flexShrink: 0 }}>{SAMPLE_STATUS[s.status]?.icon} {SAMPLE_STATUS[s.status]?.label}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', fontWeight: 600 }}>
                    {isOverdue(s)
                      ? `⚠ 已逾期（截止 ${s.deadline}）`
                      : `⚠ ${(daysSincePublish(s) === Infinity ? '从未发布过视频' : `已 ${daysSincePublish(s)} 天没发视频`)}（出单品需持续发）`}
                  </div>
                  {getAccounts(s).length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                      {getAccounts(s).map((a) => (
                        <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: '9px', border: 'none', background: '#ec4899', color: '#fff',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}>补记发布</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 视频发布记录摘要已移至「视频发布记录」独立页，总览不再列具体记录 */}
      <div style={{ padding: '14px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        <div style={{ background: 'linear-gradient(135deg,#fce7ec,#fff0f3)', border: '1px dashed #fbcfe8', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#db2777', textAlign: 'center', cursor: 'pointer' }} onClick={() => go('/publish-records')}>
          🎬 视频发布需手动记，点击去「视频发布记录」补记 / 查看
        </div>
      </div>

      {/* 记出单弹窗：总览直接弹出，无需跳转出单页 */}
      <OrderFormModal open={orderModalOpen} onClose={() => setOrderModalOpen(false)} editing={null} onSave={handleSaveOrder} />
    </div>
  )
}
