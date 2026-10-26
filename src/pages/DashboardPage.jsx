import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, AUTO_ABANDON_PUBLISH_COUNT } from '../store'
import { useToast } from '../components/Toast'
import { checkForUpdate } from '../main'
import { daysSincePublish, daysSincePublishByAccount, pendingAccounts, reminderAccounts, isOverdue, OVERDUE_STATES, setPublishDays, hotReminderDays, sampleDays, isHotAccount } from '../utils/publish'
import { LOW_PUBLISH_LIMIT, EXPIRING_DAYS, REMINDER_TABS, selectPublishReminders, selectHotCadence, selectLowPublish, selectExpiringSoon } from '../utils/reminders'
import { getAccounts, ACCOUNTS, ACCOUNT_COLOR, mapAccount, maskAccount } from '../utils/accounts'
import { SAMPLE_STATUS, getAutoAbandonedAccounts, hasPublished, getCounts, isArchivedSample, getAggregateCounts } from '../utils/sampleStatus'
import { DueTag } from '../components/DueTag'
import PlanBadge from '../components/PlanBadge'
import { SampleForm } from '../components/SampleForm'
import { useIsDesktop } from '../utils/useIsDesktop'
import { syncAll } from '../utils/sync'
import { getStoredToken } from '../utils/cloudBackup'

// 「账号 + 该账号多少天没发」的双段小胶囊 —— 与 PC 总览的 AccountDays 同一套观感：
// 左半段用账号主题色底放账号名，右半段放天数；超过该账号阈值的天数标红。
// 用户反馈：手机上原来是「账号胶囊」一行 + 另一行堆「已N天没发视频」标签，
// 又重复又占地方，**要照 PC 那样合成一块**。
function AccountDaysChip({ sample, account }) {
  const days = daysSincePublishByAccount(sample, account)
  const th = sampleDays(sample, account)
  const due = days === Infinity || days > th     // 与 accountDue 同口径（严格超过）
  const col = ACCOUNT_COLOR[account] || { c: '#8a8f98', bg: 'rgba(148,163,184,0.16)' }
  return (
    <span
      title={`${account}：${days === Infinity ? '从未发布' : `${days} 天没发`}（阈值 ${th} 天）`}
      style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 6, overflow: 'hidden', lineHeight: '16px', whiteSpace: 'nowrap', fontSize: 11 }}
    >
      <span style={{ background: col.bg, color: col.c, fontWeight: 600, padding: '0 5px' }}>{account}</span>
      <span style={{
        padding: '0 5px', fontWeight: 700,
        background: due ? 'rgba(225,29,72,0.10)' : 'rgba(148,163,184,0.16)',
        color: due ? '#e11d48' : '#64748b',
      }}>
        {days === Infinity ? '从未发布' : `已${days}天`}
      </span>
    </span>
  )
}

// 顶部问候（按时段）
function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早安'
  if (h < 18) return '下午好'
  return '晚上好'
}

// 左滑露出「编辑 / 删除」的行容器（移动端手势，桌面端也可点右侧按钮）
function SwipeRow({ onEdit, onDelete, children }) {
  const [open, setOpen] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const BTN_W = onEdit ? 128 : 64
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
      {/* 右侧操作区（常驻于背后，左滑露出） */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: BTN_W, display: 'flex' }}>
        {onEdit && (
          <button
            onClick={() => { setOpen(false); onEdit && onEdit() }}
            style={{ flex: 1, border: 'none', background: '#f59e0b', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >编辑</button>
        )}
        <button
          onClick={() => { setOpen(false); onDelete && onDelete() }}
          style={{ flex: 1, border: 'none', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
        >删除</button>
      </div>
      {/* 前景内容 */}
      <div
        onClick={() => { if (open) setOpen(false) }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - startX.current
          const dy = e.changedTouches[0].clientY - startY.current
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) setOpen(dx < 0)
        }}
        style={{
          position: 'relative', background: '#fafafa', padding: '8px 10px',
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'transform 0.2s ease', transform: open ? `translateX(-${BTN_W}px)` : 'translateX(0)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
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

// ── 桌面端「提醒中心」：按账号分组的紧凑表格 ──────────────────────────
// 手机端不走这里（继续用原来的卡片列表），由 useIsDesktop 在渲染时切换。
// 分组口径：一个样品若有多个待处理账号，会在每个账号下各占一行 ——
// 「补记发布」本来就是按账号逐个补的，这样分组才对应实际操作单位。

const pcChip = {
  fontSize: '11px', fontWeight: 700, color: '#fff',
  padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap',
}
const pcPrimaryBtn = {
  padding: '5px 12px', borderRadius: '8px', border: 'none',
  background: '#ec4899', color: '#fff', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
}
const pcTextBtn = {
  padding: '4px 2px', border: 'none', background: 'transparent',
  color: '#64748b', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
}

function ReminderTable({ items, accountsOf, midHeader, renderMid, renderActions, onlyAccount }) {
  const groups = []
  const byAccount = new Map()
  for (const it of items) {
    for (const a of accountsOf(it)) {
      // 上层已按账号筛过 items，这里还要再挡一道：选中某账号时只留该分组，
      // 否则样品会按自己的全部账号重新散回各组，筛选看起来「没生效」。
      if (onlyAccount && a !== onlyAccount) continue
      if (!byAccount.has(a)) {
        const list = []
        byAccount.set(a, list)
        groups.push([a, list])
      }
      byAccount.get(a).push(it)
    }
  }
  // 分组顺序跟随全局账号表的顺序，未登记的账号排最后
  groups.sort((a, b) => {
    const ia = ACCOUNTS.indexOf(a[0])
    const ib = ACCOUNTS.indexOf(b[0])
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  return (
    <div className="pc-table">
      {groups.map(([account, list]) => (
        <div key={account} className="pc-tgroup">
          <div className="pc-tgroup-head">
            <span className="pc-tgroup-name" style={{ color: (ACCOUNT_COLOR[account] || {}).c || '#334155' }}>{account}</span>
            <span className="pc-tgroup-count">{list.length} 个待处理</span>
          </div>
          <div className="pc-tcard">
            <div className="pc-thead">
              <span>产品</span>
              <span>状态</span>
              <span>{midHeader}</span>
              <span className="pc-tright">操作</span>
            </div>
            {list.map((it, i) => {
              const s = it.sample || it
              const st = SAMPLE_STATUS[s.status]
              return (
                <div key={`${account}-${s.id}-${i}`} className="pc-trow">
                  <span className="pc-tname" title={s.name}>{s.name}</span>
                  <span>
                    {st && (
                      <span style={{
                        fontSize: '11px', padding: '1px 6px', borderRadius: '6px',
                        color: st.color, background: st.bg, fontWeight: 600, whiteSpace: 'nowrap',
                      }}>{st.icon} {st.label}</span>
                    )}
                  </span>
                  <span className="pc-tmid">{renderMid(it, account)}</span>
                  <span className="pc-tacts">{renderActions(it)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const {
    samples, transactions, orders, publishRecords, todos, applySyncResult, updateSample,
    adQueue, addAdQueue, updateAdQueue, deleteAdQueue,
    publishPlans, addPublishPlan, updatePublishPlan, deletePublishPlan, addPublishRecord,
    hiddenAccounts,
    settings,
  } = useStore()
  const { show } = useToast()
  // 把用户设置的「多少天没发才提醒」同步到提醒计算口径
  useEffect(() => { setPublishDays(settings?.publishReminderDays || 7) }, [settings?.publishReminderDays])
  // 提醒中心在桌面端换成「按账号分组的紧凑表格」，手机端保持卡片列表
  const isDesktop = useIsDesktop()

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
  const [syncing, setSyncing] = useState(false)
  const [editingSample, setEditingSample] = useState(null)
  // 待投流：选择已发布样品→账号 的弹窗开关
  const [adPickerOpen, setAdPickerOpen] = useState(false)
  const [adSearch, setAdSearch] = useState('')
  // 列表默认只显示前 3 条，点「展开全部」才显示其余
  const [planExpanded, setPlanExpanded] = useState(true)
  const [planAcct, setPlanAcct] = useState(ACCOUNTS[0] || 'all')
  const [adExpanded, setAdExpanded] = useState(false)
  const PREVIEW_COUNT = 3
  // 「已投流」的从列表隐藏（与 PC 一致）：数据保留，不提供查看入口
  // 提醒中心 Tab：reminders（发布提醒）| low（发布不足5条）| expiring（即将到期）
  // 用 lazy init 从 sessionStorage 恢复，刷新 / keep-alive 回场时保留上次选中
  const [remindTab, setRemindTab] = useState(() => {
    const v = sessionStorage.getItem('dash_remind_tab')
    return v === 'low' || v === 'expiring' || v === 'reminders' ? v : 'hot'
  })
  // 提醒卡片左滑露出的操作（新建计划 / 调整状态）——用户要求「操作放到左滑操作」
  const [swipedHotId, setSwipedHotId] = useState(null)
  // 刚滑完的 400ms 内忽略操作按钮的点击：手指离开时正好落在被拉出来的按钮上，
  // 浏览器会补发一次 click，会误触「调整状态」直接弹编辑弹窗（用户反馈「我只是左滑，怎么弹出来了」）
  const swipeGuardRef = useRef(0)
  // 更彻底的兜底：记录本次触摸是否发生过明显位移（>10px）。
  // 卡片上的操作按钮统一用 tapOK() 判定 —— 只要是「滑动」，松手时就不会触发按钮，
  // 避免在某些列表（没有左滑的「发布不足5条 / 即将到期」）上滑动时误点到右侧按钮。
  const movedRef = useRef(false)
  useEffect(() => {
    let sx = 0
    let sy = 0
    const onStart = (e) => {
      const t = e.touches && e.touches[0]
      if (!t) return
      sx = t.clientX
      sy = t.clientY
      movedRef.current = false
    }
    const onMove = (e) => {
      const t = e.touches && e.touches[0]
      if (!t) return
      if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) movedRef.current = true
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
    }
  }, [])
  // 是「点」才放行；滑动松手不算点击
  const tapOK = () => !movedRef.current && Date.now() - swipeGuardRef.current > 400
  const pickTab = (id) => {
    setRemindTab(id)
    // 高频出单/发布不足5条 首次进入默认选中第一个账号，不看"全部账号"
    if ((id === 'hot' || id === 'low') && remindAccount === 'all' && ACCOUNTS[0]) {
      setRemindAccount(ACCOUNTS[0])
    }
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
        (window.matchMedia && window.matchMedia('display-mode: standalone)').matches)
      if (standalone) setTimeout(() => location.reload(true), 800)
    } else if (result === 'error') show('检查更新失败，请重试', 'error')
  }

  const handleSync = async () => {
    const tk = getStoredToken()
    if (!tk) {
      show('请先在「更多 → 数据备份」填写 GitHub Token', 'error')
      go('/backup')
      return
    }
    setSyncing(true)
    try {
      const gistId = localStorage.getItem('backup_gist_id')
      const result = await syncAll(tk, gistId)
      if (result.gistId) localStorage.setItem('backup_gist_id', result.gistId)
      applySyncResult(result.merged['blogger_workbench_data_v1'])
      show(result.hasChanges ? '✅ 同步完成' : '✅ 已是最新', 'success')
    } catch (e) {
      show('同步失败：' + e.message, 'error')
    } finally {
      setSyncing(false)
    }
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

  // 待投流列表：改成「已投流」就从列表消失（用户要求「像删除了一样，不需要了」），
  // 不再提供查看入口；底层数据保留，只是不展示
  const adList = adQueue || []
  const adDoneCount = adList.filter((a) => a.status === '已投流').length
  const adVisible = adList.filter((a) => a.status !== '已投流')

  // ── 发布计划（与 PC 总览同一份 store.publishPlans）────────────────
  const planFmt = (d) => {
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }
  const todayPlan = planFmt(new Date())
  // 新增时默认「明天」（与 PC 一致，用户要求）
  const tomorrowPlan = planFmt(new Date(Date.now() + 864e5))
  const planSorted = useMemo(() => {
    // 按时间排：同一天的排在一起（日期升序）；同一天内再按账号顺序归组，无日期排最后
    const accIdx = (a) => {
      const i = ACCOUNTS.indexOf(a)
      return i < 0 ? 99 : i
    }
    return [...(publishPlans || [])].filter((p) => !p.done).sort((a, b) => {
      const ad = a.planDate || ''
      const bd = b.planDate || ''
      if (ad && bd && ad !== bd) return ad < bd ? -1 : 1
      if (!ad && bd) return 1
      if (ad && !bd) return -1
      const ca = accIdx(a.account)
      const cb = accIdx(b.account)
      if (ca !== cb) return ca - cb
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
  }, [publishPlans])
  const planUpcoming = planSorted.filter((p) => !p.planDate || p.planDate >= todayPlan).length

  // 新增/编辑弹层：null=关闭 / 'new' / 条目
  // 形态与 PC 一致（照「记录发布」弹窗）：切账号分别填、每行「产品 + 数量」可加减，
  // 一次保存写成多条计划；编辑已有计划时只保留一行。
  const [planEdit, setPlanEdit] = useState(null)
  // 防重复提交锁：连点「保存」只写入一次（用户反馈出现两条一模一样的计划）
  const planSavingRef = useRef(false)
  // 从提醒中心「新建计划」进来：产品已预填、锁定，不显示「发布产品 & 数量 / ＋添加 / 提示」
  const [planLockProduct, setPlanLockProduct] = useState(false)
  const [planAccount, setPlanAccount] = useState(ACCOUNTS[0] || '')
  const [planDate, setPlanDate] = useState(tomorrowPlan)
  const [planByAcc, setPlanByAcc] = useState(() => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = []
    return o
  })
  const [planEditEntry, setPlanEditEntry] = useState({ name: '', qty: '1' })
  const [planPickIdx, setPlanPickIdx] = useState(-1)   // 正在为第几行选产品；-1 = 面板收起
  const [planQuery, setPlanQuery] = useState('')

  const planIsEditing = !!planEdit && planEdit !== 'new'
  const planEntries = planIsEditing ? [planEditEntry] : (planByAcc[planAccount] || [])

  // 候选：该账号做过的样品名（「已放弃」的样品不进候选，口径同 PC）
  const planCandidates = useMemo(() => {
    const set = new Set()
    for (const s of samples || []) {
      if (isArchivedSample(s)) continue
      const accs = Array.isArray(s.accounts) && s.accounts.length
        ? s.accounts
        : (s.account ? [s.account] : [])
      if (!accs.includes(planAccount)) continue
      const n = String((s && s.name) || '').trim()
      if (n) set.add(n)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
  }, [samples, planAccount])

  const planFiltered = useMemo(() => {
    const q = planQuery.trim().toLowerCase()
    // 同一账号下别的行已经选过的产品不重复列出（正在编辑的这行除外）
    const used = new Set(planEntries.map((e, i) => (i === planPickIdx ? null : e.name)).filter(Boolean))
    return planCandidates
      .filter((n) => !used.has(n))
      .filter((n) => !q || n.toLowerCase().includes(q))
  }, [planCandidates, planQuery, planEntries, planPickIdx])

  const planSetEntries = (fn) => {
    if (planIsEditing) setPlanEditEntry((prev) => fn([prev])[0] || prev)
    else setPlanByAcc((prev) => ({ ...prev, [planAccount]: fn(prev[planAccount] || []) }))
  }
  const planAddEntry = () => {
    planSetEntries((p) => [...p, { name: '', qty: '1' }])
    setPlanQuery('')
    setPlanPickIdx(planEntries.length)
  }
  const planRemoveEntry = (i) => {
    planSetEntries((p) => p.filter((_, k) => k !== i))
    setPlanPickIdx((cur) => (cur === i ? -1 : cur > i ? cur - 1 : cur))
  }
  // 点一条产品即选中：填进当前行并收起面板
  const planPickName = (name) => {
    planSetEntries((p) => p.map((e, k) => (k === planPickIdx ? { ...e, name } : e)))
    setPlanPickIdx(-1)
    setPlanQuery('')
  }
  const planSetQty = (idx, v) => planSetEntries((p) => p.map((e, k) => (k === idx ? { ...e, qty: v } : e)))
  const planBumpQty = (idx, delta) => planSetEntries((p) => p.map((e, k) => (
    k === idx ? { ...e, qty: String(Math.max(1, (Number(e.qty) || 1) + delta)) } : e
  )))
  const planTotal = planIsEditing
    ? (planEditEntry.name && Number(planEditEntry.qty) >= 1 ? 1 : 0)
    : ACCOUNTS.reduce((n, a) => n + (planByAcc[a] || []).filter((e) => e.name && Number(e.qty) >= 1).length, 0)

  const openPlanNew = () => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = []
    setPlanByAcc(o)
    setPlanAccount(ACCOUNTS[0] || '')
    setPlanDate(tomorrowPlan)
    setPlanEditEntry({ name: '', qty: '1' })
    setPlanPickIdx(-1)
    setPlanQuery('')
    setPlanLockProduct(false)   // 手动新增：产品那块照常显示（可多选 / 可添加）
    setPlanEdit('new')
  }
  const openPlanEdit = (p) => {
    setPlanAccount(p.account || ACCOUNTS[0] || '')
    setPlanDate(p.planDate || tomorrowPlan)
    setPlanEditEntry({ name: p.name || '', qty: String(p.qty || 1), sampleId: p.sampleId || '' })
    setPlanPickIdx(-1)
    setPlanQuery('')
    setPlanLockProduct(false)
    setPlanEdit(p)
  }
  // 「新建计划」：与 PC 一致，**打开「新增发布计划」弹窗**并带上该行的产品名 + 账号
  // （用户要求「新建计划要弹计划弹窗」）；数量/日期都在弹窗里确认后再保存。
  const quickPlan = (s) => {
    const name = String((s && s.name) || '').trim()
    // 优先用当前筛选账号；没筛账号时取待发账号，再不行取第一个挂的账号
    let acc = remindAccount && remindAccount !== 'all' ? remindAccount : ''
    if (!acc || !getAccounts(s).includes(acc)) {
      acc = pendingAccounts(s)[0] || getAccounts(s)[0] || ''
    }
    if (!name || !acc) {
      show('这个产品还没有关联账号', 'error')
      return
    }
    const o = {}
    for (const a of ACCOUNTS) o[a] = []
    o[acc] = [{ name, qty: '1', sampleId: (s && s.id) || '' }]
    setPlanByAcc(o)
    setPlanAccount(acc)
    setPlanDate(tomorrowPlan)
    setPlanEditEntry({ name: '', qty: '1' })
    setPlanPickIdx(-1)
    setPlanQuery('')
    setPlanLockProduct(true)   // 提醒中心进来：产品已带好，隐藏「发布产品 & 数量」那块
    setPlanEdit('new')
  }

  // 「标记已发」：与 PC 一致，顺手把这次发布**写进发布记录**（用户要求）
  const markPlanDone = (p) => {
    // 未来日期的计划不能提前标记完成（与 PC 一致，按钮虽已置灰，这里再兜一层）
    if (p.planDate && p.planDate > todayPlan) {
      show(`还没到发布时间（${p.planDate}），到那天才能标记完成`, 'error')
      return
    }
    const name = String(p.name || '').trim()
    const sm = (samples || []).find(
      (s) => String(s.name || '').trim() === name && getAccounts(s).includes(p.account),
    )
    const qty = Math.max(1, Number(p.qty) || 1)
    if (sm) {
      addPublishRecord({
        sampleId: sm.id,
        productId: sm.productId || '',
        accounts: [p.account],
        publishDate: p.planDate || new Date().toISOString().slice(0, 10),
        qty,
      })
    }
    updatePublishPlan(p.id, { done: true, doneAt: Date.now() })
    show(
      sm ? `已标记发布，并写入发布记录（${p.account} · ${qty} 条）` : '已标记完成（未找到对应样品，未写发布记录）',
      'success',
    )
  }

  const savePlan = () => {
    // 防重复提交：连点两下「保存」会写入两条一模一样的计划（用户反馈「重复了」）
    if (planSavingRef.current) return
    planSavingRef.current = true
    if (planIsEditing) {
      const name = planEditEntry.name.trim()
      if (!name) { show('请选择发布产品', 'error'); planSavingRef.current = false; return }
      updatePublishPlan(planEdit.id, {
        name,
        account: planAccount,
        qty: Math.max(1, Number(planEditEntry.qty) || 1),
        planDate: planDate || '',
        sampleId: planEditEntry.sampleId || planEdit.sampleId || '',
      })
      show('已保存', 'success')
      setPlanEdit(null)
      planSavingRef.current = false
      return
    }
    let n = 0
    for (const a of ACCOUNTS) {
      for (const e of (planByAcc[a] || []).filter((x) => x.name && Number(x.qty) >= 1)) {
        addPublishPlan({
          name: e.name.trim(),
          account: a,
          qty: Math.max(1, Number(e.qty) || 1),
          planDate: planDate || '',
          sampleId: e.sampleId || '',
        })
        n++
      }
    }
    if (n === 0) { show('请先添加产品并填写数量', 'error'); planSavingRef.current = false; return }
    show(`已加入 ${n} 条发布计划`, 'success')
    setPlanEdit(null)
    planSavingRef.current = false
  }

  // ── 待投流：从「已发布」样品里挑（样品 × 账号），带出该账号最新发布时间
  const AD_STATUSES = ['未投流', '已投流', '暂停']
  const AD_STATUS_COLOR = {
    '未投流': { c: '#b45309', bg: '#fef3c7' },
    '已投流': { c: '#059669', bg: '#d1fae5' },
    '暂停': { c: '#6b7280', bg: '#f3f4f6' },
  }
  const publishedOptions = useMemo(() => {
    const out = []
    for (const s of (samples || [])) {
      if (!s || isArchivedSample(s) || !hasPublished(s)) continue
      for (const a of getAccounts(s)) {
        const c = getCounts(s, a)
        if (!(c.publishCount > 0)) continue
        out.push({
          sampleId: s.id,
          name: s.name,
          account: a,
          publishDate: c.lastPublishAt || '',
          publishCount: c.publishCount,
        })
      }
    }
    out.sort((x, y) => (y.publishDate || '').localeCompare(x.publishDate || ''))
    return out
  }, [samples])

  const filteredAdOptions = useMemo(() => {
    const kw = adSearch.trim()
    if (!kw) return publishedOptions
    return publishedOptions.filter((o) =>
      o.name.includes(kw) || o.account.includes(kw))
  }, [publishedOptions, adSearch])

  const handleAddAd = (opt) => {
    addAdQueue({
      sampleId: opt.sampleId,
      name: opt.name,
      account: opt.account,
      publishDate: opt.publishDate,
      status: '未投流',
    })
    setAdPickerOpen(false)
    setAdSearch('')
    show('已加入待投流', 'success')
  }

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
    show(`${autoAbandoned.length} 个产品最后出单后又发了5条未出单，已自动置为放弃`, 'error')
  }, [autoAbandoned.length, show])

  // 发布提醒：从未发布过，或（出过单 + 超过阈值没发布）。与 PC 同口径。
  const allReminders = useMemo(() => selectPublishReminders(samples, orders), [samples, orders])
  // 总览页内直接展示全部，不再跳列表页（保留别名以免大范围改动下方渲染代码）
  const reminders = allReminders

  // 发布不足10：发布了没有出单，且发布数量 > 0 且 < 10。与 PC 同口径。
  const lowPublish = useMemo(() => selectLowPublish(samples, LOW_PUBLISH_LIMIT, orders), [samples, orders])

  // 即将到期：有截止日期、且未发布/未放弃、7 天内到期（含已逾期），按截止日期升序
  const expiringSoon = useMemo(() => selectExpiringSoon(samples), [samples])

  // 高频出单：手动设了提醒天数且 ≤5 天、当前已到该发的产品
  const hotCadence = useMemo(() => selectHotCadence(samples), [samples])

  // ── 提醒中心的账号筛选（三个 Tab 共用一排胶囊）
  // 'all' = 全部账号。筛选只作用于下方列表与 Tab 气泡计数，
  // 不影响上方「出单 / 待办」两张卡。
  const [remindAccount, setRemindAccount] = useState(() => {
    // 高频出单/发布不足5条 首次进入默认选中第一个账号
    const v = sessionStorage.getItem('dash_remind_tab')
    const t = v === 'low' || v === 'expiring' || v === 'reminders' ? v : 'hot'
    return (t === 'hot' || t === 'low') && ACCOUNTS[0] ? ACCOUNTS[0] : 'all'
  })
  const ACC_META = (a) => ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }

  // 「已建计划」标记索引（与 PC 总览一致，用户要求手机端也加）：按产品名关联、排除已完成的计划，
  // 且**跟着账号筛选走**（用户要求：筛了账号就只认该账号的计划，别的账号排的不算）。
  // 匹配做两层归一，避免「有计划却不标」：
  //   ① 账号：别名（大号/小号…）映射成正式名再比；计划没填账号时视为匹配任意筛选；
  //   ② 产品名：去掉所有空白再比（防止首尾/全角空格对不上）。
  const normPlanName = (v) => String(v || '').replace(/\s+/g, '')
  const normPlanAcc = (a) => mapAccount(String(a || '').trim())
  const planNameSet = useMemo(() => {
    const m = new Map()
    for (const p of publishPlans || []) {
      if (p.done) continue
      // 用户要求：日期已过去的计划不算「已建计划」（今天 10-23，10-21 那条不该再标）
      if (p.planDate && p.planDate < todayPlan) continue
      const pa = normPlanAcc(p.account)
      if (remindAccount !== 'all' && pa && pa !== remindAccount) continue
      const rec = { id: p.id, account: p.account || '', planDate: p.planDate || '', qty: p.qty || 1 }
      const n = normPlanName(p.name)
      if (n) {
        if (!m.has(n)) m.set(n, [])
        m.get(n).push(rec)
      }
      // 同时按 sampleId 建索引：样品改名后旧名称对不上，靠 ID 仍能标上
      if (p.sampleId) {
        const k = `id:${p.sampleId}`
        if (!m.has(k)) m.set(k, [])
        m.get(k).push(rec)
      }
    }
    return m
  }, [publishPlans, remindAccount])
  // 行内复用：未建计划返回 null；否则灰色小标（只写「已建计划」，账号靠筛选自己判断；
  // 悬停是**竖向排列**的明细卡，组件内部按日期升序 + 账号顺序排）
  const planBadge = (name, sampleId) => (
    <PlanBadge
      plans={(() => {
        // 同一条计划可能既命中 sampleId 又命中名称（老数据回填过 ID），按计划 id 去重，
        // 否则悬停里会出现两条一模一样的（用户反馈「为何会有重复的」）
        const seen = new Set()
        const out = []
        for (const p of [
          ...(planNameSet.get(`id:${sampleId}`) || []),
          ...(planNameSet.get(normPlanName(name)) || []),
        ]) {
          const k = p.id || `${p.account}|${p.planDate}|${p.qty}`
          if (seen.has(k)) continue
          seen.add(k)
          out.push(p)
        }
        return out
      })()}
    />
  )

  // 样品是否命中当前账号筛选：
  // - 未筛时全部通过
  // - 筛了账号：只有该账号确实"需要发"（从未发过或超过7天没发）才显示
  //   避免多账号样品中，是别的账号需要发、但本账号刚发过的情况被错误列出
  const matchAcct = (s, a) => {
    if (a === 'all') return true
    // 该账号自己确实"该发了"（从未发过 / 超期没发）才列出
    return pendingAccounts(s).includes(a)
  }

  // 筛选后的三组数据 —— 列表渲染与 Tab 气泡计数都读它们，保证「气泡数 = 点进去的条数」。
  // 三个列表现在都是**样品粒度**，账号筛选统一走 matchAcct（样品归属账号命中即显示）。
  // 「发布不足5条」曾短暂改成「样品×账号」条目、按条目 account 精确匹配，
  // 但那会让多账号样品被拆成多条（详见 utils/reminders 里 selectLowPublish 的注释）。
  // 排序：逾期优先，其余按**行里显示的那个天数**（reminderAccounts 里最久没发的）降序。
  // 不能用 compareUrgent（它跨全部账号取最久），否则会出现「50 / 24 / 50」这种看着没排序的情况。
  const sortByShownDays = (a, b) => {
    const oa = (a.status !== 'published' && isOverdue(a)) ? 0 : 1
    const ob = (b.status !== 'published' && isOverdue(b)) ? 0 : 1
    if (oa !== ob) return oa - ob
    const days = (s) => {
      // 筛了账号时只按该账号的天数排，否则跨账号 max 会看着乱序
      if (remindAccount !== 'all') {
        const d = daysSincePublishByAccount(s, remindAccount)
        return d === Infinity ? Number.MAX_SAFE_INTEGER : d
      }
      const accs = reminderAccounts(s)
      const d = accs.length ? Math.max(...accs.map((x) => daysSincePublishByAccount(s, x))) : daysSincePublish(s)
      return d === Infinity ? Number.MAX_SAFE_INTEGER : d
    }
    return days(b) - days(a)
  }
  const fReminders = useMemo(
    () => reminders.filter((s) => matchAcct(s, remindAccount)).sort(sortByShownDays),
    [reminders, remindAccount],
  )
  const fLowPublish = useMemo(
    () => lowPublish.filter((item) => {
      if (remindAccount === 'all') return true
      // 不足5条：筛了账号后，只显示该账号发布数不足5的
      return item.accounts.some(({ account: a, publishCount: n }) =>
        a === remindAccount && n < LOW_PUBLISH_LIMIT)
    }),
    [lowPublish, remindAccount],
  )
  const fExpiring = useMemo(
    () => expiringSoon.filter((s) => matchAcct(s, remindAccount)),
    [expiringSoon, remindAccount],
  )
  const fHot = useMemo(
    () => hotCadence.filter((s) => {
      if (remindAccount === 'all') return true
      // 筛了账号：该号必须自己是高频(≤5天)且到点，不能因为别的号高频就把这个号带进来
      return pendingAccounts(s).includes(remindAccount) && isHotAccount(s, remindAccount)
    }).sort(sortByShownDays),
    [hotCadence, remindAccount],
  )
  // 每个账号在当前 tab 下的数量（用于账号角标）
  const acctCounts = useMemo(() => {
    const c = {}
    for (const a of ACCOUNTS) {
      if (remindTab === 'hot') {
        c[a] = hotCadence.filter((s) => pendingAccounts(s).includes(a) && isHotAccount(s, a)).length
      } else if (remindTab === 'reminders') {
        c[a] = reminders.filter((s) => matchAcct(s, a)).length
      } else if (remindTab === 'low') {
        c[a] = lowPublish.filter((it) => it.accounts.some((x) => x.account === a && x.publishCount < LOW_PUBLISH_LIMIT)).length
      } else {
        c[a] = expiringSoon.filter((s) => getAccounts(s).includes(a)).length
      }
    }
    return c
  }, [remindTab, hotCadence, reminders, lowPublish, expiringSoon])

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
    // 气泡数字显示全部账号的总数（不随筛选变），账号角标在下面单独看
    const counts = {
      reminders: reminders.length,
      hot: hotCadence.length,
      low: lowPublish.length,
      expiring: expiringSoon.length,
    }
    return REMINDER_TABS.map((t) => ({ ...t, count: counts[t.id] }))
  }, [reminders.length, hotCadence.length, lowPublish.length, expiringSoon.length])
  // 合并后的总数：不同区块可能命中同一产品，这里按 id 去重后再计
  const remindTotal = useMemo(() => {
    // 用筛选后的数据：筛选后三个 Tab 可能都空了，此时自动切换 Tab 的兜底逻辑
    // 应当基于「当前筛选下还剩什么」，否则筛到没数据的账号会停在空 Tab。
    // 三个列表现在都是样品粒度，直接按样品 id 去重。
    const map = new Map()
    ;[...fReminders, ...fHot, ...fExpiring, ...fLowPublish].forEach((s) => map.set(s.id, s))
    return map.size
  }, [fReminders, fHot, fLowPublish, fExpiring])

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
      <header className="pc-header" style={{ padding: 'calc(18px + var(--safe-top)) 20px 14px', background: 'transparent', borderBottom: '1px solid rgba(236,72,153,0.12)' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#b3888f' }}>{greeting()} · {todayLabel}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111', letterSpacing: '-0.4px' }}>工作台总览</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button onClick={handleSync} disabled={syncing}
              style={{
                padding: '7px 12px', borderRadius: '8px',
                border: '1px solid #fbcfe8', background: '#fff', color: '#db2777',
                fontSize: '12px', fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}
            >{syncing ? '同步中…' : '🔄 同步'}</button>
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

      {/* PC 工作台：顶部指标条。手机端整体隐藏（.pc-stats 默认 display:none），
          只在 ≥768px 由 index.css 打开成四列网格，所以手机端布局完全不受影响。 */}
      <div className="pc-stats">
        {[
          { label: '样品总数', value: samples.length, to: '/samples' },
          { label: '待办未完成', value: todoUndone, to: '/todos' },
          { label: '发布提醒', value: remindTotal, to: '/publish-reminders' },
          { label: '出单记录', value: orders.length, to: '/orders' },
        ].map((m) => (
          <button key={m.label} className="pc-stat" onClick={() => go(m.to)}>
            <span className="pc-stat-label">{m.label}</span>
            <span className="pc-stat-value">{m.value}</span>
          </button>
        ))}
      </div>

      {/* 收支卡片已移到「更多」侧边栏（/finance），总览不再占位 */}

      {/* 待办清单（独立事项池：截止日期可有可无；管理入口 /todos） */}
      <div style={{ padding: '6px 8px 0' }}>
        <div className="pc-card" style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
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

      {/* 发布计划：产品 / 账号 / 数量 / 时间（与 PC 同一份数据） */}
      <div style={{ padding: '6px 8px 0' }}>
        <div className="pc-card" style={{ background: '#fff', border: '1px solid #e6e6ef', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>发布计划</span>
              {planSorted.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f5fbb', padding: '1px 7px', borderRadius: '8px', background: '#eef2ff' }}>
                  {planUpcoming} 待发
                </span>
              )}
            </div>
            <button onClick={openPlanNew} style={{
              background: '#ec4899', border: 'none', color: '#fff', fontSize: '12px',
              fontWeight: 600, padding: '6px 12px', borderRadius: '9px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>＋ 新增</button>
          </div>

          {planSorted.length === 0 ? (
            <div style={{ padding: '14px 2px 2px', fontSize: '12px', color: '#94a3b8' }}>
              还没有发布计划，点「新增」记一条：产品、账号、数量、发布时间
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {(
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                  {ACCOUNTS.map((a) => {
                    const on = planAcct === a
                    const c = a === 'all' ? null : (ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.12)' })
                    return (
                      <button key={a} onClick={() => setPlanAcct(a)} style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '999px', cursor: 'pointer',
                        border: on ? `1.5px solid ${a==='all' ? '#ec4899' : c.c}` : '1.5px solid transparent',
                        background: on ? (a==='all' ? '#fdf2f8' : c.bg) : '#f4f4f8',
                        color: on ? (a==='all' ? '#ec4899' : c.c) : '#94a3b8',
                        fontWeight: on ? 600 : 400,
                      }}>{a === 'all' ? '全部账号' : a}</button>
                    )
                  })}
                </div>
              )}
              {(() => {
                const planFiltered = planSorted.filter((p) => planAcct === 'all' || p.account === planAcct)
                const visible = planExpanded ? planFiltered : planFiltered.slice(0, PREVIEW_COUNT)
                // 同一个日期用同一个颜色：按日期首次出现顺序取色板
                const datePalette = ['#db2777', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#e11d48']
                const seen = new Map()
                for (const p of visible) {
                  if (!p.planDate) continue
                  if (!seen.has(p.planDate)) seen.set(p.planDate, datePalette[seen.size % datePalette.length])
                }
                return (
                  <>
                    {visible.map((p) => {
                      const col = ACCOUNT_COLOR[p.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
                      const overdue = p.planDate && p.planDate < todayPlan
                      const isToday = p.planDate === todayPlan
                      const dateColor = seen.get(p.planDate) || '#94a3b8'
                      // 只有「当天及以前」的计划才能标记完成（与 PC 一致，未来日期置灰）
                      const canDone = !p.planDate || p.planDate <= todayPlan
                      return (
                        <SwipeRow key={p.id} onEdit={() => openPlanEdit(p)} onDelete={() => { deletePublishPlan(p.id); show('已删除', 'success') }}>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (canDone) markPlanDone(p) }}
                              disabled={!canDone}
                              title={canDone
                                ? '点一下标记为已发（同时写入发布记录），自动隐藏'
                                : `还没到发布时间（${p.planDate}），到那天才能标记完成`}
                              style={{
                                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, padding: 0,
                                border: canDone ? '1.5px solid #d4a3c0' : '1.5px solid #d8dde4',
                                background: canDone ? '#fff' : '#f3f4f6',
                                cursor: canDone ? 'pointer' : 'not-allowed',
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{p.name}</span>
                              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '6px', background: col.bg, color: col.c, flexShrink: 0 }}>{p.account || '未选账号'}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#b8517f', background: '#fdf1f6', padding: '1px 6px', borderRadius: '6px', flexShrink: 0, fontWeight: 700 }}>
                              ×{p.qty || 1}
                            </span>
                            <span style={{ fontSize: '10px', color: overdue ? '#b91c1c' : dateColor, flexShrink: 0, fontWeight: 700 }}>
                              {p.planDate || '未填时间'}{isToday ? '（今天）' : overdue ? '（已过期）' : ''}
                            </span>
                          </div>
                        </SwipeRow>
                      )
                    })}
                    {planFiltered.length > PREVIEW_COUNT && (
                      <button onClick={() => setPlanExpanded((v) => !v)} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '12px', color: '#db2777', fontWeight: 600, padding: '4px 0 0',
                      }}>{planExpanded ? '收起 ▴' : `展开全部（${planFiltered.length}）▾`}</button>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 发布计划 新增/编辑 弹层 */}
      {planEdit && (
        <div onClick={() => setPlanEdit(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '14px',
            padding: '16px', maxHeight: '86dvh', overflowY: 'auto',
            // dvh 会随键盘弹出一起收缩（vh 不会），否则键盘一弹按钮就被顶出屏幕（用户反馈「超出了」）
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{planEdit === 'new' ? '新增发布计划' : '编辑发布计划'}</span>
              <button onClick={() => setPlanEdit(null)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', fontSize: '18px', color: '#9aa0a9', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>发布时间</div>
            <input
              type="date"
              style={{ appearance: 'none', WebkitAppearance: 'none', width: 'auto', minWidth: 0, padding: '8px 14px', borderRadius: '999px', border: 'none', background: '#ec4899', color: '#fff', fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
            />

            <div style={{ fontSize: '12px', color: '#8a8f98', margin: '12px 0 4px' }}>发布账号</div>
            {/* 先选账号再选产品（用户要求）：切换账号看到的是该账号自己的行，产品按账号筛选 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ACCOUNTS.map((a) => {
                const on = planAccount === a
                const col = (ACCOUNT_COLOR[a] || {}).c || '#b8517f'
                const cnt = planIsEditing
                  ? (a === planAccount && planEditEntry.name ? 1 : 0)
                  : (planByAcc[a] || []).filter((e) => e.name && Number(e.qty) >= 1).length
                return (
                  <button
                    key={a}
                    onClick={() => {
                      setPlanAccount(a)
                      // 编辑态只有一行：换账号就清掉已选产品，避免串账号；
                      // 新增态：从提醒中心带进来的产品跟着搬到新账号，换账号不用重新选产品
                      if (planIsEditing) {
                        setPlanEditEntry((prev) => ({ ...prev, name: '' }))
                      } else {
                        setPlanByAcc((prev) => {
                          const cur = prev[planAccount] || []
                          const target = prev[a] || []
                          if (target.length === 0 && cur.length === 1 && cur[0] && cur[0].name) {
                            return { ...prev, [a]: [{ ...cur[0] }], [planAccount]: [] }
                          }
                          return prev
                        })
                      }
                      setPlanPickIdx(-1)
                      setPlanQuery('')
                    }}
                    style={{
                      padding: '5px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: on ? 'none' : `1px solid ${col}`,
                      background: on ? col : '#fff',
                      color: on ? '#fff' : col,
                    }}
                  >{a}{cnt > 0 ? ` ${cnt}` : ''}</button>
                )
              })}
            </div>

            {/* 从提醒中心「新建计划」进来时，产品已带好，不显示「发布产品 &amp; 数量 / ＋添加 / 提示」这一块 */}
            {!planLockProduct && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 4px' }}>
                  <span style={{ fontSize: '12px', color: '#8a8f98' }}>发布产品 &amp; 数量（可多选）</span>
                  <div style={{ flex: 1 }} />
                  {!planIsEditing && (
                    <button onClick={planAddEntry} style={{
                      border: '1px solid #e5e7eb', background: '#fff', color: '#64748b', fontSize: '12px',
                      fontWeight: 600, padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                    }}>＋ 添加</button>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#9aa0a9', marginBottom: '6px' }}>
                  只能选「{planAccount}」的样品（已放弃的不会出现）
                </div>
              </>
            )}

            {/* 从提醒中心进来时上面的标签被隐藏了，留一点上下间距，别贴着账号胶囊 */}
            {planLockProduct && <div style={{ height: 14 }} />}

            {planEntries.length === 0 && !planIsEditing && (
              <button onClick={planAddEntry} style={{
                width: '100%', padding: '14px', border: '1px dashed #e5b7c8', borderRadius: '10px',
                background: '#fffafc', color: '#b8517f', fontSize: '13px', cursor: 'pointer',
              }}>＋ 点这里新增一条「产品 + 数量」</button>
            )}

            {planEntries.map((e, idx) => (
              <div key={idx} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => { setPlanPickIdx(planPickIdx === idx ? -1 : idx); setPlanQuery('') }}
                    style={{
                      flex: 1, minWidth: 0, textAlign: 'left', padding: '9px 12px', borderRadius: '10px',
                      border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer',
                      color: e.name ? '#111' : '#9aa0a9',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >{e.name || '点击选择产品'}</button>
                  {/* 数量加减：与 PC「记录发布」同款步进器 */}
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                    <button onClick={() => planBumpQty(idx, -1)} style={{
                      width: '32px', height: '34px', border: 'none', background: '#faf7f8',
                      fontSize: '16px', color: '#8a8f98', cursor: 'pointer',
                    }}>−</button>
                    <input
                      type="number" min="1"
                      value={e.qty}
                      onChange={(ev) => {
                        const n = parseInt(ev.target.value, 10)
                        planSetQty(idx, Number.isNaN(n) || n < 1 ? '' : String(n))
                      }}
                      onBlur={() => { if (!(Number(e.qty) >= 1)) planSetQty(idx, '1') }}
                      style={{
                        width: '42px', border: 'none', textAlign: 'center', fontSize: '13px',
                        padding: '8px 0', outline: 'none', background: '#fff',
                      }}
                    />
                    <button onClick={() => planBumpQty(idx, 1)} style={{
                      width: '32px', height: '34px', border: 'none', background: '#faf7f8',
                      fontSize: '16px', color: '#8a8f98', cursor: 'pointer',
                    }}>＋</button>
                  </div>
                </div>

                {/* 产品选择面板：就地展开，点一行即选中 */}
                {planPickIdx === idx && (
                  <div style={{ marginTop: '8px', border: '1px solid #f0dfe6', borderRadius: '10px', padding: '8px', background: '#fffdfe' }}>
                    <input
                      autoFocus
                      placeholder="搜索产品名…"
                      value={planQuery}
                      onChange={(ev) => setPlanQuery(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key !== 'Enter') return
                        if (planFiltered.length > 0) planPickName(planFiltered[0])
                      }}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '10px',
                        border: '1px solid #e5e7eb', fontSize: '13px', marginBottom: '6px',
                      }}
                    />
                    <div style={{ maxHeight: '200px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      {planCandidates.length === 0 ? (
                        <div style={{ padding: '14px 4px', fontSize: '12px', color: '#9aa0a9', textAlign: 'center' }}>
                          该账号下还没有样品（已放弃的不列出）
                        </div>
                      ) : planFiltered.length === 0 ? (
                        <div style={{ padding: '14px 4px', fontSize: '12px', color: '#9aa0a9', textAlign: 'center' }}>
                          没有匹配的产品，换个词试试
                        </div>
                      ) : planFiltered.map((n) => (
                        <button
                          key={n}
                          onClick={() => planPickName(n)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '11px 10px', border: 'none',
                            borderBottom: '0.5px solid #f4f1f2', background: 'transparent',
                            fontSize: '13px', color: '#111', cursor: 'pointer',
                          }}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div style={{ marginTop: '12px', fontSize: '11px', color: '#9aa0a9' }}>
              {planTotal > 0 ? `共 ${planTotal} 条` : '还没有条目'}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setPlanEdit(null)} style={{
                flex: 1, padding: '11px', borderRadius: '11px', border: '1px solid #e5e7eb',
                background: '#fff', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}>取消</button>
              <button onClick={savePlan} disabled={planTotal === 0} style={{
                flex: 1, padding: '11px', borderRadius: '11px', border: 'none',
                background: planTotal === 0 ? '#f3c6d8' : '#ec4899', color: '#fff',
                fontSize: '14px', fontWeight: 700, cursor: planTotal === 0 ? 'default' : 'pointer',
              }}>保存{planTotal > 1 ? ` ${planTotal} 条` : ''}</button>
            </div>
          </div>
        </div>
      )}

      {/* 待投流：从已发布样品挑选，带出账号与发布时间，状态可改 */}
      <div style={{ padding: '6px 8px 0' }}>
        <div className="pc-card" style={{ background: '#fff', border: '1px solid #ece3e6', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>待投流</span>
              {adList.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', padding: '1px 7px', borderRadius: '8px', background: '#fef3c7' }}>
                  {adList.filter((a) => a.status === '未投流').length} 待投
                </span>
              )}
            </div>
            <button onClick={() => { setAdSearch(''); setAdPickerOpen(true) }} style={{
              background: '#ec4899', border: 'none', color: '#fff', fontSize: '12px',
              fontWeight: 600, padding: '6px 12px', borderRadius: '9px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>＋ 添加</button>
          </div>

          {adVisible.length === 0 ? (
            <div style={{ padding: '14px 2px 2px', fontSize: '12px', color: '#94a3b8' }}>
              {adList.length === 0
                ? '还没有待投流，点「添加」从已发布视频里挑'
                : `待投流都已投完（已投流 ${adDoneCount} 条）`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {(adExpanded ? adVisible : adVisible.slice(0, PREVIEW_COUNT)).map((a) => {
                const st = AD_STATUS_COLOR[a.status] || AD_STATUS_COLOR['未投流']
                const col = ACCOUNT_COLOR[a.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
                const cycleStatus = () => {
                  const i = AD_STATUSES.indexOf(a.status)
                  updateAdQueue(a.id, { status: AD_STATUSES[(i + 1) % AD_STATUSES.length] })
                }
                return (
                  <SwipeRow key={a.id} onDelete={() => { deleteAdQueue(a.id); show('已删除', 'success') }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{a.name}</span>
                        <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '6px', background: col.bg, color: col.c, flexShrink: 0 }}>{a.account}</span>
                      </div>
                      {a.publishDate && <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>{a.publishDate}</span>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleStatus() }}
                      title="点一下切换状态"
                      style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '8px',
                        border: `1px solid ${st.c}`, background: st.bg, color: st.c, cursor: 'pointer', flexShrink: 0,
                      }}
                    >{a.status}</button>
                  </SwipeRow>
                )
              })}
              {adVisible.length > PREVIEW_COUNT && (
                <button onClick={() => setAdExpanded((v) => !v)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: '#db2777', fontWeight: 600, padding: '4px 0 0',
                }}>{adExpanded ? '收起 ▴' : `展开全部（${adVisible.length}）▾`}</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 待投流选择弹窗：列出已发布样品 × 账号 */}
      {adPickerOpen && (
        <div onClick={() => setAdPickerOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '640px', height: '86vh', background: '#fff', borderRadius: '18px',
            padding: '18px 18px 20px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>选择已发布视频</span>
              <button onClick={() => setAdPickerOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>×</button>
            </div>
            <input
              value={adSearch}
              onChange={(e) => setAdSearch(e.target.value)}
              placeholder="搜索产品名或账号…"
              style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', marginBottom: '10px' }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredAdOptions.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>没有匹配的已发布视频</div>
              )}
              {filteredAdOptions.map((o, i) => {
                const col = ACCOUNT_COLOR[o.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
                return (
                  <div key={`${o.sampleId}_${o.account}_${i}`} onClick={() => handleAddAd(o)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 8px',
                    borderBottom: '1px solid #f1f1f1', cursor: 'pointer',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '6px', background: col.bg, color: col.c, fontWeight: 600 }}>{o.account}</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{o.publishDate || '未填日期'} · 共{o.publishCount}条</span>
                      </div>
                    </div>
                    <span style={{ color: '#ec4899', fontSize: '18px', flexShrink: 0 }}>＋</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 自动放弃提醒：发布满 10 条仍 0 出单，已自动置为「放弃」 */}
      {autoAbandoned.length > 0 && (
        <div style={{ padding: '6px 8px 0' }}>
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
                      最后出单后又发了5条未出单 → 已自动放弃
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

      {/* 建议放弃：从没出单发满5条，问用户要不要放弃 */}
      {(() => {
        const suggested = (samples || []).filter((s) => s.suggestAbandonedByAccount && Object.keys(s.suggestAbandonedByAccount).length > 0)
        if (!suggested.length) return null
        return (
          <div style={{ padding: '6px 8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
              <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#f59e0b' }} />
              建议放弃
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#f59e0b', padding: '1px 7px', borderRadius: '8px' }}>{suggested.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suggested.map((s) => {
                const accs = Object.keys(s.suggestAbandonedByAccount).filter((a) => s.suggestAbandonedByAccount[a])
                return (
                  <div key={s.id} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {accs.map((a) => {
                          const c = ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.12)' }
                          return <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: c.bg, color: c.c, fontWeight: 600 }}>{a}</span>
                        })}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '3px', fontWeight: 600 }}>
                        发了5条还没出单，要放弃吗？
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const execByAccount = { ...(s.execByAccount || {}) }
                        accs.forEach((a) => { execByAccount[a] = 'abandoned' })
                        updateSample(s.id, { execByAccount, suggestAbandonedByAccount: {} })
                        show('已标记为放弃', 'success')
                      }}
                      style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >放弃</button>
                    <button
                      onClick={() => {
                        const sdc = { ...(s.suggestDismissCount || {}) }
                        accs.forEach((a) => {
                          sdc[a] = Number(s.countsByAccount?.[a]?.publishCount) || 0
                        })
                        updateSample(s.id, { suggestDismissCount: sdc, suggestAbandonedByAccount: {} })
                        show('已保留，再发5条未出单会再次提醒', 'success')
                      }}
                      style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >保留</button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

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
          padding: '7px 2px 8px',
          boxShadow: '0 1px 8px rgba(120,90,100,0.05)',
        }}>
          {/* 内层不再画白色胶囊底（原来是 rgba(255,255,255,0.6) + 白色描边），
              避免在吸顶条的半透明毛玻璃上再叠一层白，出现「白底套白边」的浑浊感。
              但**保留这一层 div** —— 它是 flex 布局的载体：高度 34px 由它钉死
              （按钮高度若由标签行高决定，三档标签行盒高不同会导致窄屏比宽屏矮 3px），
              同时 padding 0 8px 让最外侧标签与卡片左右对齐。 */}
          <div style={{
            display: 'flex', flex: 1, minWidth: 0, height: '34px',
            padding: '0 0px',
          }}>
          {REMIND_TABS.map((t) => {
            const active = remindTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => pickTab(t.id)}
                style={{
                  flex: '1 1 0', minWidth: 0, position: 'relative',
                  padding: '0 0px', border: 'none', background: 'transparent',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {/* 内层改成 flex 行容器：原本标签与气泡都是 inline 级元素、按 baseline 对齐，
                    而气泡高度 14px、内部行高 20px（为让数字墨迹在气泡里居中而设），
                    它的 baseline 被自己的行盒推到了接近底边 → 气泡整体比标签文字低约 4px。
                    baseline 对齐在这种「两块尺寸差很多」的组合下必然错位，
                    改成 flex + alignItems:center 让两者按几何中线对齐，才真正「数字相对文字居中」。 */}
                <div style={{
                  fontSize: '12px', fontWeight: 700,
                  color: active ? t.accent : 'var(--text-sub)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'flex', alignItems: 'center',
                }}>
                  {/* 三档标签按屏宽切换（见 index.css 的 .dashTabFull/Mid/Short）。
                      实测「发布不足5条」+ 数量气泡在 360~430px 这段最吃宽度：
                      手机最窄 320px 时按钮可用宽约 85px 反而更紧，中标签才放得下。
                      注意：显示/隐藏必须走 CSS 类，不能用内联 display（内联优先级最高会压过媒体查询） */}
                  <span className="dashTabFull">{t.label}</span>
                  <span className="dashTabMid">{t.mid}</span>
                  <span className="dashTabShort">{t.short}</span>
                  {/* 数量气泡：零值用灰底，避免一串「0」看起来像异常。
                     数字用 tabular-nums（等宽数字）：默认比例数字下「66」比「5」宽，
                      气泡一横移下划线的安全间距就跟着变，等宽数字让宽度与位置稳定可预期。

                     垂直对齐踩过几次坑，记录在此以免回退：
                     ① inline baseline 对齐 —— 气泡 14px、标签文字 12.5px，两块尺寸差太多，
                        baseline 必然错位，实测气泡比标签文字低 4px。
                        解法：父层（上面的 div）改 flex + alignItems:center。
                     ② 父层成 flex 后，气泡是 flex item，**它自己的 lineHeight 完全失效**
                        （实测 1/14/16/20/normal 输出同一值），别再试图用它调。
                     ③ 曾用 padding-top 修数字墨迹偏上 —— 但 padding 会先被 align-items:center
                        扣除，属于「半效」位移，且它同时改变气泡盒的居中结果，
                        导致「气泡内居中」和「相对标签居中」互相拉扯。
                        实测 padding-top 对两个指标的响应系数分别是 1.067 与 0.533，
                        在 height:14px 下无解（一个归零时另一个必然偏 0.8px 左右）。
                     ④ 加内层 span 承载偏移 —— 内层 inline-block 的行盒会参与外层高度计算，
                        把气泡挤矮（实测 14px → 13px / 12px，反而更糟），已放弃。

                     最终解法：气泡 height 由 14px 放到 15px，腾出 1px 余量，
                     再用 padding '1px 6px 0'（非对称）做微调。
                     15px 下两个指标同时成立：
                       · 气泡内居中：上留白 3.75 / 下留白 3.88，差 -0.12px
                       · 相对标签：数字墨迹中心 - 标签文字墨迹中心 = -0.81px
                     1px 的高度差肉眼不可辨，且气泡与下划线的垂直间距仍有 5px，不会重叠。 */}
                  <span style={{
                    fontSize: '10.5px', fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#fff', background: t.count > 0 ? t.accent : '#d8c8ce',
                    borderRadius: '999px', padding: '1px 4px 0', marginLeft: '2px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    height: '15px', boxSizing: 'border-box',
                  }}>{t.count}</span>
                </div>
                {/* 选中下划线：用绝对定位贴底，不参与布局，切换时不引起抖动。
                    宽度必须留在标签文字以内 —— 这是「两个颜色重叠」的根因：
                    数量气泡（背景色 = t.accent，与下划线同色）紧跟在标签文字右侧，
                    原来内缩 32%（占按钮宽 36%）时右端会顶到甚至压住气泡（实测间距 -1.6px），
                    同色图形挨在一起就糊成一团。故收窄到 24%（内缩 38%）留出安全间距。
                    左端同样收窄，保证视觉居中于文字。 */}
                <div style={{
                  position: 'absolute', left: '38%', right: '38%', bottom: '2px',
                  height: '2.5px', borderRadius: '3px',
                  background: active ? t.accent : 'transparent',
                  transition: 'background .15s',
                }} />
              </button>
            )
          })}
          </div>
        </div>

        {/* 账号筛选：三个 Tab 共用一排胶囊，作用于下方列表与 Tab 气泡计数。
            样式与「出单记录」页的账号筛选保持一致（同色描边 / 选中填充同色），
            让同一套筛选在两处看起来是同一个东西。
            横向可滚，账号变多也不会挤成两行。
            即将到期 tab 不需要账号筛选。 */}
        {remindTab !== 'expiring' && (
        <div
          className="hide-scrollbar"
          style={{
            padding: '6px 8px 4px', display: 'flex', gap: '6px',
            flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0,
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          }}
        >
          {remindTab === 'expiring' && (
          <button
            onClick={() => setRemindAccount('all')}
            style={{
              flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              border: remindAccount === 'all' ? 'none' : '1px solid rgba(244,114,182,0.35)',
              background: remindAccount === 'all' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
              color: remindAccount === 'all' ? '#fff' : 'var(--text-main)',
            }}
          >全部账号</button>
          )}
          {ACCOUNTS.map((a) => {
            const col = ACC_META(a)
            const sel = remindAccount === a
            return (
              <button
                key={a}
                onClick={() => setRemindAccount(sel ? 'all' : a)}
                style={{
                  flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  border: sel ? 'none' : `1px solid ${col.c}`,
                  background: sel ? col.c : '#fff',
                  color: sel ? '#fff' : col.c,
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}
              >{a}{acctCounts[a] > 0 && <span style={{
                fontSize: '9px', fontWeight: 700, padding: '0 5px', borderRadius: '8px',
                background: sel ? 'rgba(255,255,255,0.25)' : `${col.c}1f`,
                color: sel ? '#fff' : col.c,
              }}>{acctCounts[a]}</span>}</button>
            )
          })}
        </div>
        )}

        {/* Tab 内容区：左右 16px 内边距放这里，与上方 Tab 的左右对齐；只渲染当前选中项。
            paddingTop 5px 是给吸顶条与首张卡片留的呼吸位 —— 原来为 0，卡片直接贴着
            吸顶条下沿，毛玻璃边缘和卡片圆角挨在一起显得很挤。
            这个间距属于内容区、不是吸顶条的一部分，所以往下滚时它会随内容一起收走，
            卡片仍能贴到吸顶条下沿（符合吸顶的常规预期）。 */}
        <div style={{ padding: '5px 8px 0' }}>
          {remindTab === 'reminders' && (
            <>
              {/* 原「按紧急度排序」说明行已去掉：条目数由 Tab 气泡表达，排序规则对用户无意义。
                  空数据时由下方列表的空状态卡片提示，这里不再重复。 */}
              {fReminders.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  {remindAccount === 'all' ? '暂无需要发布提醒的样品' : `${remindAccount} 没有需要发布提醒的样品`}
                </div>
              ) : isDesktop ? (
                <ReminderTable
                  items={fReminders}
                  onlyAccount={remindAccount === 'all' ? '' : remindAccount}
                  accountsOf={(s) => {
                    const list = reminderAccounts(s)
                    if (remindAccount !== 'all' && pendingAccounts(s).includes(remindAccount) && !list.includes(remindAccount)) {
                      return [remindAccount, ...list]
                    }
                    return list
                  }}
                  midHeader="未发布天数"
                  renderMid={(s, account) => {
                    const days = daysSincePublishByAccount(s, account)
                    const overdue = s.status !== 'published' && isOverdue(s)
                    return (
                      <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {overdue && <span style={{ ...pcChip, background: '#ef4444' }}>⚠ 已逾期（截止 {s.deadline}）</span>}
                        <span style={{ ...pcChip, background: '#f59e0b' }}>
                          {days === Infinity ? '从未发布过视频' : `已 ${days} 天没发`}
                        </span>
                      </span>
                    )
                  }}
                  renderActions={(s) => (
                    <>
                      <button style={pcPrimaryBtn} onClick={() => quickPlan(s)}>新建计划</button>
                      <button style={pcTextBtn} onClick={() => setEditingSample(s)}>调整状态</button>
                    </>
                  )}
                />
              ) : (
                <div className="pc-grid" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fReminders.map((s) => {
                    // 只显示**真正还需要发**的账号（与 PC 总览、提醒页同一口径）
                    let showAccounts = reminderAccounts(s)
                    // 筛了账号时**只显示这个账号**（用户：「筛选哪个账号就显示哪个账号的状态」）。
                    // 原来只是"保证包含它"，其它待发账号还挂在卡片上，看着像筛选没生效。
                    // 卡片本身能出现在这里，说明 matchAcct 已确认该账号确实该发，所以直接取单元素即可。
                    if (remindAccount !== 'all') showAccounts = [remindAccount]
                    // 这里不再需要区分「是不是靠催更进来的」——列表已经和 PC 同口径
                    // （selectPublishReminders 不传 orders），只剩「超过阈值 / 从未发过」两种。
                    const swiped = swipedHotId === s.id
                    return (
                      // 与「高频出单」一致：操作收到左滑里（用户要求「发布提醒也一样」）
                      <div key={s.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
                          <button
                            onClick={() => { setSwipedHotId(null); setEditingSample(s) }}
                            style={{ width: 66, height: '80%', border: 'none', background: '#e2e8f0', color: '#475569', fontSize: 12, fontWeight: 600, borderRadius: 9, cursor: 'pointer' }}
                          >调整状态</button>
                        </div>
                        <div
                          onTouchStart={(e) => { const t = e.touches[0]; e.currentTarget.dataset.sx = String(t.clientX); e.currentTarget.dataset.sy = String(t.clientY); e.currentTarget.dataset.swiping = 'false' }}
                          onTouchMove={(e) => {
                            const t = e.touches[0]
                            const sx = Number(e.currentTarget.dataset.sx)
                            const sy = Number(e.currentTarget.dataset.sy)
                            if (!sx) return
                            const dx = t.clientX - sx
                            const dy = t.clientY - sy
                            if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                              e.currentTarget.dataset.swiping = 'true'
                              e.currentTarget.dataset.dir = dx < 0 ? 'left' : 'right'
                            }
                          }}
                          onTouchEnd={(e) => {
                            if (e.currentTarget.dataset.swiping !== 'true') return
                            const dir = e.currentTarget.dataset.dir
                            swipeGuardRef.current = Date.now()   // 记录滑动结束时刻，用于拦截误触点击
                            setSwipedHotId((prev) => (dir === 'left' ? (prev === s.id ? null : s.id) : null))
                          }}
                          onClick={() => { if (swiped) setSwipedHotId(null) }}
                          style={{
                            position: 'relative', zIndex: 1,
                            background: '#fdfafb', border: '1px solid #f5eef2', borderRadius: '10px', padding: '9px 10px 9px 12px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'transform 0.2s ease', transform: swiped ? 'translateX(-74px)' : 'translateX(0)',
                          }}
                        >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            {planBadge(s.name, s.id)}
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', color: SAMPLE_STATUS[s.status]?.color, background: SAMPLE_STATUS[s.status]?.bg, fontWeight: 600, flexShrink: 0 }}>{SAMPLE_STATUS[s.status]?.icon} {SAMPLE_STATUS[s.status]?.label}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {/* 账号 + 该账号自己多少天没发，合成一个双段胶囊（与 PC 总览同一观感） */}
                            {showAccounts.map((a) => <AccountDaysChip key={a} sample={s} account={a} />)}
                          </div>
                          {/* 逾期单独标红；天数已经在上面的胶囊里，不再重复堆一行 */}
                          {s.status !== 'published' && isOverdue(s) && (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>⚠ 已逾期（截止 {s.deadline}）</span>
                            </div>
                          )}
                        </div>
                        {/* 「新建计划」常驻显示（用户要求「计划按钮放出来，不要左滑才显示」） */}
                        <button
                          onClick={() => { if (!tapOK()) return; quickPlan(s) }}
                          style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 9, border: 'none', background: '#ec4899', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >新建计划</button>
                        </div>{/* /左滑卡片内容 */}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {remindTab === 'hot' && (
            <>
              {fHot.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  {remindAccount === 'all' ? '暂无高频出单待发的样品' : `${remindAccount} 暂无高频出单待发的样品`}
                </div>
              ) : isDesktop ? (
                <ReminderTable
                  items={fHot}
                  onlyAccount={remindAccount === 'all' ? '' : remindAccount}
                  accountsOf={(s) => pendingAccounts(s)}
                  midHeader="未发布天数"
                  renderMid={(s, account) => {
                    const days = daysSincePublishByAccount(s, account)
                    // 与 PC 总览一致：每N天提醒用中性灰，天数超阈值标红
                    const th = sampleDays(s, account)
                    const due = days === Infinity || days >= th
                    return (
                      <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ ...pcChip, background: '#f1f2f4', color: '#6b7280' }}>每{hotReminderDays(s)}天提醒</span>
                        <span style={{ ...pcChip, background: due ? 'rgba(225,29,72,0.10)' : 'rgba(148,163,184,0.16)', color: due ? '#e11d48' : '#64748b' }}>
                          {days === Infinity ? '从未发布' : `已 ${days} 天`}
                        </span>
                      </span>
                    )
                  }}
                  renderActions={(s) => (
                    <>
                      <button style={pcPrimaryBtn} onClick={() => quickPlan(s)}>新建计划</button>
                      <button style={pcTextBtn} onClick={() => setEditingSample(s)}>调整状态</button>
                    </>
                  )}
                />
              ) : (
                <div className="pc-grid" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fHot.map((s) => {
                    // 与 PC 一致：列出**所有到该发**的账号（不再只挑从未发布的那个）
                    // 筛了账号时只保留当前账号
                    const showAccounts = remindAccount === 'all'
                      ? pendingAccounts(s)
                      : pendingAccounts(s).filter((a) => a === remindAccount)
                    const swiped = swipedHotId === s.id
                    return (
                      // 左滑露出操作（用户要求「操作放到左滑操作」）：操作条固定在底层，卡片整体左移
                      <div key={s.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
                          <button
                            onClick={() => { setSwipedHotId(null); setEditingSample(s) }}
                            style={{ width: 66, height: '80%', border: 'none', background: '#e2e8f0', color: '#475569', fontSize: 12, fontWeight: 600, borderRadius: 9, cursor: 'pointer' }}
                          >调整状态</button>
                        </div>
                        <div
                          onTouchStart={(e) => { const t = e.touches[0]; e.currentTarget.dataset.sx = String(t.clientX); e.currentTarget.dataset.sy = String(t.clientY); e.currentTarget.dataset.swiping = 'false' }}
                          onTouchMove={(e) => {
                            const t = e.touches[0]
                            const sx = Number(e.currentTarget.dataset.sx)
                            const sy = Number(e.currentTarget.dataset.sy)
                            if (!sx) return
                            const dx = t.clientX - sx
                            const dy = t.clientY - sy
                            // 横向位移足够大且明显大于纵向 → 判定为滑动（避免和上下滚动打架）
                            if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                              e.currentTarget.dataset.swiping = 'true'
                              e.currentTarget.dataset.dir = dx < 0 ? 'left' : 'right'
                            }
                          }}
                          onTouchEnd={(e) => {
                            if (e.currentTarget.dataset.swiping !== 'true') return
                            const dir = e.currentTarget.dataset.dir
                            swipeGuardRef.current = Date.now()   // 记录滑动结束时刻，用于拦截误触点击
                            setSwipedHotId((prev) => (dir === 'left' ? (prev === s.id ? null : s.id) : null))
                          }}
                          onClick={() => { if (swiped) setSwipedHotId(null) }}
                          style={{
                            position: 'relative', zIndex: 1,
                            background: '#fff', border: '1px solid #f0edf2', borderRadius: '10px', padding: '9px 6px 9px 14px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'transform 0.2s ease', transform: swiped ? 'translateX(-74px)' : 'translateX(0)',
                          }}
                        >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            {planBadge(s.name, s.id)}
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', color: SAMPLE_STATUS[s.status]?.color, background: SAMPLE_STATUS[s.status]?.bg, fontWeight: 600, flexShrink: 0 }}>{SAMPLE_STATUS[s.status]?.icon} {SAMPLE_STATUS[s.status]?.label}</span>
                            {/* 「每N天提醒」紧跟状态标签（用户要求「几天提醒放在状态后面」） */}
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#6b7280', background: '#f1f2f4', padding: '1px 6px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>每{hotReminderDays(s)}天提醒</span>
                          </div>
                          {/* 账号 + 天数**全部直接展开**（用户要求「可以都展开了」），不再折叠 */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', alignItems: 'center' }}>
                            {[...showAccounts]
                              .sort((x, y) => daysSincePublishByAccount(s, y) - daysSincePublishByAccount(s, x))
                              .map((a) => {
                                const d = daysSincePublishByAccount(s, a)
                                const th = sampleDays(s, a)
                                const due = d === Infinity || d >= th
                                const col = ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)', c: '#64748b' }
                                return (
                                  <span key={a} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '6px', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <span style={{ fontSize: '10px', padding: '2px 6px', background: col.bg, color: col.c, fontWeight: 600 }}>{a}</span>
                                    <span style={{
                                      fontSize: '10px', padding: '2px 6px', fontWeight: 700,
                                      background: due ? 'rgba(225,29,72,0.10)' : 'rgba(148,163,184,0.16)',
                                      color: due ? '#e11d48' : '#64748b',
                                    }}>{d === Infinity ? '从未发布' : `已${d}天`}</span>
                                  </span>
                                )
                              })}
                          </div>
                        </div>
                        {/* 「新建计划」常驻显示（用户要求「计划按钮放出来，不要左滑才显示」） */}
                        <button
                          onClick={() => { if (!tapOK()) return; quickPlan(s) }}
                          style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 9, border: 'none', background: '#ec4899', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >新建计划</button>
                        </div>{/* /左滑卡片内容 */}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {remindTab === 'low' && (
            <>
              {/* 原「按发布条数排序」说明行已去掉，空数据由下方空状态卡片提示 */}
              {fLowPublish.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  {remindAccount === 'all'
                    ? `暂无发布不足 ${LOW_PUBLISH_LIMIT} 条的样品`
                    : `${remindAccount} 没有发布不足 ${LOW_PUBLISH_LIMIT} 条的样品`}
                </div>
              ) : isDesktop ? (
                <ReminderTable
                  items={fLowPublish}
                  onlyAccount={remindAccount === 'all' ? '' : remindAccount}
                  accountsOf={(it) => it.accounts.map((x) => x.account)}
                  midHeader="还差条数"
                  renderMid={(it, account) => {
                    const row = it.accounts.find((x) => x.account === account)
                    return (
                      <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ ...pcChip, background: '#8b5cf6' }}>还差 {it.minLack} 条</span>
                        <span style={{ fontSize: '11px', color: '#8a8f98', whiteSpace: 'nowrap' }}>
                          该账号已发 {row ? row.publishCount : 0} 条
                        </span>
                      </span>
                    )
                  }}
                  renderActions={(it) => (
                    <>
                      <button style={pcPrimaryBtn} onClick={() => navigate('/publish-record/new', { state: { sampleId: it.sample.id, accounts: it.accounts.map((x) => x.account) } })}>补发布</button>
                      <button style={pcTextBtn} onClick={() => setEditingSample(it.sample)}>调整状态</button>
                    </>
                  )}
                />
              ) : (
                <div className="pc-grid" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* 条目粒度是**样品**，判定也是**按样品合计**：
                      卡片里列出各账号的条数分布供参考，标题的「还差 N」按合计算。 */}
                  {fLowPublish.map((it) => {
                    const s = it.sample
                    const swiped = swipedHotId === s.id
                    return (
                      <div key={s.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
                          <button
                            onClick={() => { setSwipedHotId(null); setEditingSample(s) }}
                            style={{ width: 66, height: '80%', border: 'none', background: '#e2e8f0', color: '#475569', fontSize: 12, fontWeight: 600, borderRadius: 9, cursor: 'pointer' }}
                          >调整状态</button>
                        </div>
                        <div
                          onTouchStart={(e) => { const t = e.touches[0]; e.currentTarget.dataset.sx = String(t.clientX); e.currentTarget.dataset.sy = String(t.clientY); e.currentTarget.dataset.swiping = 'false' }}
                          onTouchMove={(e) => {
                            const t = e.touches[0]
                            const sx = Number(e.currentTarget.dataset.sx)
                            const sy = Number(e.currentTarget.dataset.sy)
                            if (!sx) return
                            const dx = t.clientX - sx
                            const dy = t.clientY - sy
                            if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                              e.currentTarget.dataset.swiping = 'true'
                              e.currentTarget.dataset.dir = dx < 0 ? 'left' : 'right'
                            }
                          }}
                          onTouchEnd={(e) => {
                            if (e.currentTarget.dataset.swiping !== 'true') return
                            const dir = e.currentTarget.dataset.dir
                            swipeGuardRef.current = Date.now()
                            setSwipedHotId((prev) => (dir === 'left' ? (prev === s.id ? null : s.id) : null))
                          }}
                          onClick={() => { if (swiped) setSwipedHotId(null) }}
                          style={{
                            position: 'relative', zIndex: 1,
                            background: '#fdfafb', border: '1px solid #f5eef2', borderRadius: '10px', padding: '9px 10px 9px 12px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'transform 0.2s ease', transform: swiped ? 'translateX(-74px)' : 'translateX(0)',
                          }}
                        >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            {planBadge(s.name, s.id)}
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', color: SAMPLE_STATUS[s.status]?.color, background: SAMPLE_STATUS[s.status]?.bg, fontWeight: 600, flexShrink: 0 }}>{SAMPLE_STATUS[s.status]?.icon} {SAMPLE_STATUS[s.status]?.label}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              还差 {it.minLack} 条{it.accounts.length > 1 ? ` · ${it.accounts.length} 个账号` : ''}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {it.accounts
                              .filter(({ account: a }) => remindAccount === 'all' || a === remindAccount)
                              .map(({ account: a, publishCount: n }) => {
                                const col = ACCOUNT_COLOR[a] || { c: '#8a8f98', bg: 'rgba(148,163,184,0.16)' }
                                const d = daysSincePublishByAccount(s, a)
                                const th = sampleDays(s, a)
                                const due = d === Infinity || d >= th
                                return (
                                  <span key={a} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 6, overflow: 'hidden', lineHeight: '16px', whiteSpace: 'nowrap', fontSize: 11 }}>
                                    <span style={{ background: col.bg, color: col.c, fontWeight: 600, padding: '0 5px' }}>{a}({n}条)</span>
                                    <span style={{
                                      padding: '0 5px', fontWeight: 700,
                                      background: due ? 'rgba(225,29,72,0.10)' : 'rgba(148,163,184,0.16)',
                                      color: due ? '#e11d48' : '#64748b',
                                    }}>{d === Infinity ? '从未发布' : `已${d}天`}</span>
                                  </span>
                                )
                              })}
                          </div>
                        </div>
                        <button
                          onClick={() => { if (!tapOK()) return; quickPlan(s) }}
                          style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 9, border: 'none', background: '#ec4899', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >新建计划</button>
                        </div>{/* /左滑卡片内容 */}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {remindTab === 'expiring' && (
            <>
              {/* 原「按截止日期排序」说明行已去掉，空数据由下方空状态卡片提示 */}
              {fExpiring.length === 0 ? (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>
                  {remindAccount === 'all' ? `近 ${EXPIRING_DAYS} 天没有即将到期的样品` : `${remindAccount} 没有即将到期的样品`}
                </div>
              ) : isDesktop ? (
                <ReminderTable
                  items={fExpiring}
                  onlyAccount={remindAccount === 'all' ? '' : remindAccount}
                  accountsOf={(s) => getAccounts(s)}
                  midHeader="截止时间"
                  renderMid={(s) => {
                    const du = daysUntil(s.deadline)
                    const overdue = du !== null && du < 0
                    const text = overdue
                      ? `已逾期 ${Math.abs(du)} 天（截止 ${s.deadline}）`
                      : du === 0 ? `今天截止（${s.deadline}）` : `剩 ${du} 天（截止 ${s.deadline}）`
                    const color = overdue ? '#ef4444' : du <= 3 ? '#ea580c' : '#ca8a04'
                    return <span style={{ fontSize: '12px', fontWeight: 600, color }}>{text}</span>
                  }}
                  renderActions={(s) => (
                    <button style={pcTextBtn} onClick={() => setEditingSample(s)}>调整状态</button>
                  )}
                />
              ) : (
                <div className="pc-grid" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fExpiring.map((s) => {
                    const du = daysUntil(s.deadline)
                    const overdue = du !== null && du < 0
                    const text = overdue
                      ? `已逾期 ${Math.abs(du)} 天（截止 ${s.deadline}）`
                      : du === 0 ? `今天截止（${s.deadline}）` : `剩 ${du} 天（截止 ${s.deadline}）`
                    const color = overdue ? '#ef4444' : du <= 3 ? '#ea580c' : '#ca8a04'
                    const swiped = swipedHotId === s.id
                    return (
                      <div key={s.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingRight: 4 }}>
                          <button
                            onClick={() => { setSwipedHotId(null); setEditingSample(s) }}
                            style={{ width: 66, height: '80%', border: 'none', background: '#e2e8f0', color: '#475569', fontSize: 12, fontWeight: 600, borderRadius: 9, cursor: 'pointer' }}
                          >调整状态</button>
                        </div>
                        <div
                          onTouchStart={(e) => { const t = e.touches[0]; e.currentTarget.dataset.sx = String(t.clientX); e.currentTarget.dataset.sy = String(t.clientY); e.currentTarget.dataset.swiping = 'false' }}
                          onTouchMove={(e) => {
                            const t = e.touches[0]
                            const sx = Number(e.currentTarget.dataset.sx)
                            const sy = Number(e.currentTarget.dataset.sy)
                            if (!sx) return
                            const dx = t.clientX - sx
                            const dy = t.clientY - sy
                            if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                              e.currentTarget.dataset.swiping = 'true'
                              e.currentTarget.dataset.dir = dx < 0 ? 'left' : 'right'
                            }
                          }}
                          onTouchEnd={(e) => {
                            if (e.currentTarget.dataset.swiping !== 'true') return
                            const dir = e.currentTarget.dataset.dir
                            swipeGuardRef.current = Date.now()
                            setSwipedHotId((prev) => (dir === 'left' ? (prev === s.id ? null : s.id) : null))
                          }}
                          onClick={() => { if (swiped) setSwipedHotId(null) }}
                          style={{
                            position: 'relative', zIndex: 1,
                            background: '#fdfafb', border: '1px solid #f5eef2', borderRadius: '10px', padding: '9px 10px 9px 12px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'transform 0.2s ease', transform: swiped ? 'translateX(-74px)' : 'translateX(0)',
                          }}
                        >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            {planBadge(s.name, s.id)}
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', color: SAMPLE_STATUS[s.status]?.color, background: SAMPLE_STATUS[s.status]?.bg, fontWeight: 600, flexShrink: 0 }}>{SAMPLE_STATUS[s.status]?.icon} {SAMPLE_STATUS[s.status]?.label}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {(remindAccount !== 'all' ? [remindAccount] : getAccounts(s)).map((a) => (
                              <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{a}</span>
                            ))}
                          </div>
                          <div style={{ fontSize: '11px', color, marginTop: '2px', fontWeight: 600 }}>
                            {text}
                          </div>
                        </div>
                        <button
                          onClick={() => { if (!tapOK()) return; quickPlan(s) }}
                          style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 9, border: 'none', background: '#ec4899', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >新建计划</button>
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

      {editingSample && (
        <SampleForm
          inline={false}
          statusMode={true}
          sample={editingSample}
          onClose={() => setEditingSample(null)}
          onSave={(data) => {
            updateSample(editingSample.id, data)
            show('已更新', 'success')
            setEditingSample(null)
          }}
        />
      )}
    </div>
  )
}
