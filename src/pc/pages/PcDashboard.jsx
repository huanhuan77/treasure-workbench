import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { DueTag } from '../../components/DueTag'
import { selectAllReminders, REMINDER_TABS, daysUntilDeadline } from '../../utils/reminders'
import { daysSincePublishByAccount, pendingAccounts, reminderAccounts, isOverdue, hotReminderDays, accountDue, sampleDays } from '../../utils/publish'
import { getAccounts, ACCOUNTS, ACCOUNT_COLOR } from '../../utils/accounts'
import { SAMPLE_STATUS } from '../../utils/sampleStatus'
import { SampleDialog } from '../components/SampleDialog'
import { PublishDialog } from '../components/PublishDialog'
import { AdQueueCard } from '../components/AdQueueCard'
import { PublishPlanCard } from '../components/PublishPlanCard'

// 顶部问候（按时段）
function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早安'
  if (h < 18) return '下午好'
  return '晚上好'
}

// 账号排序权重：跟随全局账号表，未登记的排最后
const accRank = (a) => {
  const i = ACCOUNTS.indexOf(a)
  return i === -1 ? 999 : i
}

// PC 版统一「浅底 + 中调文字」的小标签，整页只在三档语义上着色，
// 不再到处铺实底彩色块（用户要求：整体浅色系、少颜色、不要太深）。
// 例外：danger（已逾期）按用户要求改成大红色实底 —— 逾期是唯一需要「一眼alert」的状态。
const TONE = {
  neutral: { background: '#f3f4f6', color: '#6b7280' },
  good: { background: '#eef4ef', color: '#5f8a74' },
  warn: { background: '#faf1e3', color: '#a97c46' },
  danger: { background: '#e02020', color: '#fff' },
}

// 样品状态 → 色调：只有「已发布」算好状态用淡绿，其余统一中性灰。
// 状态名本身仍写在标签里，语义不丢，只是不再一状态一颜色。
function statusTone(status) {
  return status === 'published' ? TONE.good : TONE.neutral
}

// 「每个账号多少天没发」的小胶囊：左半段用账号主题色底，右半段浅琥珀底放天数。
// 两块底色不同 → 一眼分得清「哪个账号 / 多少天」，也不会像同色 chip 那样糊成一片
// （用户先后反馈「颜色重叠了」「加背景色区分」）。
function AccountDays({ sample, list }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
      {list.map((x) => {
        const days = daysSincePublishByAccount(sample, x)
        const th = sampleDays(sample, x)
        // 超过阈值（该提醒了）的天数用红色，其余用灰 —— 用户要求「过期天数改为红色」
        const due = days === Infinity || days >= th
        const col = ACCOUNT_COLOR[x] || { c: '#8a8f98', bg: 'rgba(148,163,184,0.16)' }
        return (
          <span
            key={x}
            title={`${x}：${days === Infinity ? '从未发布' : `${days} 天没发`}（阈值 ${th} 天）`}
            style={{
              display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
              borderRadius: 6, overflow: 'hidden', lineHeight: '16px',
            }}
          >
            <span style={{ background: col.bg, color: col.c, fontWeight: 600, padding: '0 5px' }}>{x}</span>
            <span
              style={{
                padding: '0 5px', fontWeight: 700,
                background: due ? 'rgba(225,29,72,0.10)' : 'rgba(148,163,184,0.16)',
                color: due ? '#e11d48' : '#64748b',
              }}
            >
              {days === Infinity ? '从未发布' : `已${days}天`}
            </span>
          </span>
        )
      })}
    </span>
  )
}

// PC 版总览。
// 业务口径全部复用 utils/reminders 与 utils/publish 的选择器 ——
// 这里只重写「怎么摆」，不重新定义「哪些算要提醒」，避免两套 UI 口径漂移。
export function PcDashboard() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { samples, todos, orders } = useStore()
  const [tab, setTab] = useState('hot')   // 默认「高频出单」（与手机端一致）
  const [account, setAccount] = useState('')
  // 「为什么没提醒」诊断弹窗
  const [whyOpen, setWhyOpen] = useState(false)
  // 「打开样品」走弹窗（用户要求 PC 端不跳页面）：undefined=关闭、对象=编辑
  const [sampleDialog, setSampleDialog] = useState(undefined)
  const [publishDialog, setPublishDialog] = useState(undefined)

  const all = useMemo(() => selectAllReminders(samples), [samples])

  // 每个 Tab 的口径：怎么取数、一条归到哪些账号、中列与操作各显示什么
  const spec = useMemo(() => ({
    // 高频出单：手动设了提醒天数（≤5 天）且已到该发的产品（与手机端同一口径）
    hot: {
      items: all.hot,
      // 列「到该发」的账号：含多账号里非高频的那个，避免只显示高频账号后
      // 另一个账号的待发状态被藏起来（这些样品已从「发布提醒」里剔除）
      accountsOf: (s) => pendingAccounts(s),
      header: '未发布天数',
      mid: (s, a, accs) => {
        // 展示高频口径的天数（取高频账号里最小的），不要拿默认 7 天
        const per = hotReminderDays(s)
        const list = (accs && accs.length ? accs : [a]).filter(Boolean)
        return (
          <>
            {/* 「每N天提醒」不再用红色（红色留给真正超期的天数），改为中性灰 */}
            <span className="pcv-chip" style={{ background: '#f1f2f4', color: '#6b7280', marginRight: 6 }}>每{per}天提醒</span>
            <AccountDays sample={s} list={list} />
          </>
        )
      },
      actions: (s) => (
        <>
          <button className="pcv-btn" onClick={() => setPublishDialog({ sampleId: s.id, accounts: getAccounts(s) })}>补记发布</button>
          <button className="pcv-btn pcv-btn-ghost" style={{ marginLeft: 8 }} onClick={() => setSampleDialog(s)}>打开样品</button>
        </>
      ),
    },
    reminders: {
      items: all.reminders,
      // 只列「真正还需要发」的账号：有账号从未发过就只显示它们，
      // 不会把已经发过的账号一起挂在这一行里（用户反馈：晚梨发过了，不该再提醒）
      accountsOf: (s) => reminderAccounts(s),
      header: '未发布天数',
      mid: (s, a, accs) => {
        const overdue = s.status !== 'published' && isOverdue(s)
        // 多账号时**每个账号各一个天数**（用户要求「能列出来每个账号分别几天吗」），
        // 只有该账号确实该发才列，避免把不用管的账号也挂上来
        const list = (accs && accs.length ? accs : [a]).filter(Boolean)
        return (
          <>
            {/* 逾期 chip 不再重复带截止日 —— 右面已经有独立的「截止日期」列，
                重复写会让这一格时宽时窄，短内容行的空洞特别明显 */}
            {overdue && <span className="pcv-chip" style={{ ...TONE.danger, marginRight: 6 }}>已逾期</span>}
            <AccountDays sample={s} list={list} />
          </>
        )
      },
      actions: (s) => (
        <>
          <button className="pcv-btn" onClick={() => setPublishDialog({ sampleId: s.id, accounts: getAccounts(s) })}>补记发布</button>
          <button className="pcv-btn pcv-btn-ghost" style={{ marginLeft: 8 }} onClick={() => setSampleDialog(s)}>打开样品</button>
        </>
      ),
    },
    low: {
      items: all.low,
      accountsOf: (it) => it.accounts.map((x) => x.account),
      header: '还差条数',
      // 条目粒度是**样品**（与手机端一致）：「还差 N 条」按样品合计，账号列列出涉及的账号，
      // 已发条数用合计，避免把同一个品拆成好几行后数字被摊薄
      mid: (it) => {
        const sent = it.accounts.reduce((n, x) => n + (x.publishCount || 0), 0)
        return (
          <>
            <span className="pcv-chip" style={TONE.warn}>还差 {it.minLack} 条</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#9aa0a9' }}>合计已发 {sent} 条</span>
          </>
        )
      },
      actions: (it) => (
        <>
          <button className="pcv-btn" onClick={() => setPublishDialog({ sampleId: it.sample.id, accounts: it.accounts.map((x) => x.account) })}>补发布</button>
          <button className="pcv-btn pcv-btn-ghost" style={{ marginLeft: 8 }} onClick={() => setSampleDialog(it.sample)}>打开样品</button>
        </>
      ),
    },
    expiring: {
      items: all.expiring,
      accountsOf: (s) => getAccounts(s),
      header: '截止时间',
      mid: (s) => {
        const du = daysUntilDeadline(s.deadline)
        const overdue = du !== null && du < 0
        const text = overdue
          ? `已逾期 ${Math.abs(du)} 天（截止 ${s.deadline}）`
          : du === 0 ? `今天截止（${s.deadline}）` : `剩 ${du} 天（截止 ${s.deadline}）`
        const color = overdue ? '#b96a66' : du <= 3 ? '#b07d4a' : '#a99154'
        return <span style={{ fontSize: 14, fontWeight: 600, color }}>{text}</span>
      },
      actions: (s) => (
        <button className="pcv-btn pcv-btn-ghost" onClick={() => setSampleDialog(s)}>打开样品</button>
      ),
    },
  }), [all, navigate])

  // 当前 Tab；REMINDER_TABS 里新增了 tab 但 spec 还没跟上时，兜底回「发布提醒」，
  // 避免整页因为 spec[tab] 为 undefined 直接崩掉（reading 'items'）。
  const cur = spec[tab] || spec.reminders

  const items = useMemo(
    () => (account ? cur.items.filter((it) => cur.accountsOf(it).includes(account)) : cur.items),
    [cur, account],
  )

  // Tab 上的数字要跟着账号筛选变（与手机端一致）：
  // 原来直接取 spec[t.id].items.length，选了账号后列表变了、数字却纹丝不动，
  // 看起来像「点了没反应」。
  const tabCount = (id) => {
    const sp = spec[id]
    if (!sp) return 0
    if (!account) return sp.items.length
    return sp.items.filter((it) => sp.accountsOf(it).includes(account)).length
  }

  // 当前 Tab 涉及到的账号（供筛选条）
  const accountOptions = useMemo(() => {
    const set = new Set()
    for (const it of cur.items) for (const a of cur.accountsOf(it)) set.add(a)
    return [...set].sort((x, y) => accRank(x) - accRank(y))
  }, [cur])

  // 「全部账号」时**合并成一张表**，用一列「账号」标出属于谁（用户要求）。
  // 粒度与手机端一致：**一个样品一行**（同一个品不按账号拆成多行），
  // 账号列里并列列出涉及的账号；天数这类数字取「最严重的那个账号」。
  // 选定了某个账号时只保留包含该账号的行，筛选依旧生效。
  const rows = useMemo(() => {
    const out = []
    for (const it of items) {
      const accs = cur.accountsOf(it).filter((a) => !account || a === account)
      if (accs.length === 0) continue
      const s = it.sample || it
      // 天数 / 条数这类数字按「最严重的那一个账号」展示（与手机端一致：取最大值）
      const worst = (tab === 'reminders' || tab === 'hot')
        ? accs.reduce((w, a) => (daysSincePublishByAccount(s, a) > daysSincePublishByAccount(s, w) ? a : w), accs[0])
        : accs[0]
      out.push({ it, accs, acc: worst })
    }
    // 「发布提醒 / 高频出单」排序：
    //   ① 已逾期的一律排最前；
    //   ② 其余按**这一行显示的那个天数**降序（从未发布 = 最大，排最前）。
    // 注意：原来用 compareUrgent（跨全部账号取最久），跟行里显示的天数不是同一个口径，
    // 会出现「50 / 24 / 50」这种看着没排序的情况（用户反馈「没按顺序排」）。
    if (tab === 'reminders' || tab === 'hot') {
      const overdueOf = (r) => {
        const s = r.it.sample || r.it
        return (s.status !== 'published' && isOverdue(s)) ? 0 : 1
      }
      const rowDays = (r) => {
        const s = r.it.sample || r.it
        const d = daysSincePublishByAccount(s, r.acc)
        return d === Infinity ? Number.MAX_SAFE_INTEGER : d
      }
      out.sort((x, y) => {
        const oa = overdueOf(x)
        const ob = overdueOf(y)
        if (oa !== ob) return oa - ob
        return rowDays(y) - rowDays(x)
      })
    } else if (account === '') {
      // 其它 Tab 未筛选时按账号归拢，读起来是「一账号一段」而不是随机交错
      out.sort((x, y) => accRank(x.acc) - accRank(y.acc))
    }
    return out
  }, [items, cur, account, tab])

  // ── 「为什么没提醒」诊断数据 ────────────────────────────────
  // 列出**全部样品**（不再只列已超期的），每个账号给出「已N天 / 阈值」和是否判为超期，
  // 再标注它现在的归属（高频出单 / 发布提醒 / 未超期 / 已归档）。
  // 这样「这个为什么没提醒」点开就能看到具体数字，不用再猜。
  const [whyQuery, setWhyQuery] = useState('')
  const [whyOnlyMiss, setWhyOnlyMiss] = useState(false)
  const whyRows = useMemo(() => {
    const hotIds = new Set((all.hot || []).map((s) => s.id))
    const remIds = new Set((all.reminders || []).map((s) => s.id))
    const out = []
    for (const s of samples || []) {
      if (!s || !s.id) continue
      const accs = getAccounts(s).map((a) => ({
        a,
        days: daysSincePublishByAccount(s, a),
        th: sampleDays(s, a),
        due: accountDue(s, a),
      }))
      if (!accs.length) continue
      const tabName = hotIds.has(s.id) ? '高频出单' : (remIds.has(s.id) ? '发布提醒' : '')
      const archived = !!(s.archived || s.status === 'abandoned')
      const anyDue = accs.some((x) => x.due)
      let reason = ''
      if (tabName) reason = `已在「${tabName}」tab`
      else if (archived) reason = '样品已放弃/归档'
      else if (!anyDue) reason = '没有账号超期'
      else reason = '未进提醒（其它原因）'
      out.push({ s, accs, tabName, reason, anyDue, missing: anyDue && !tabName })
    }
    // 真的漏掉的排最前，其次按名字
    return out.sort((x, y) => (y.missing ? 1 : 0) - (x.missing ? 1 : 0) || String(x.s.name).localeCompare(String(y.s.name), 'zh'))
  }, [samples, all])
  // 弹窗里按关键字 + 「只看漏掉的」过滤
  const whyShown = useMemo(() => {
    const q = whyQuery.trim().toLowerCase()
    return whyRows.filter((r) => {
      if (whyOnlyMiss && !r.missing) return false
      if (!q) return true
      return String(r.s.name || '').toLowerCase().includes(q) || r.accs.some((x) => x.a.includes(q))
    })
  }, [whyRows, whyQuery, whyOnlyMiss])

  // 提醒中心的列表直接用 rows（搜索条已按用户要求去掉）

  // 待办清单默认只列 5 条，卡片底部「查看全部 N 条」再展开剩余（用户要求）。
  // 不再用卡内滚动：滚动条在小卡片里不好点，展开/收起更直观。
  const [todoExpanded, setTodoExpanded] = useState(false)
  // 未完成的待办，**新加的排最前**（用户要求）：按创建时间倒序，
  // 刚记的一条立刻出现在卡片顶部，不用滚到底去找
  const todoAll = useMemo(
    () => [...(todos || [])]
      .filter((t) => !t.done)
      // 置顶的排最前（与待办页同一规则），其余按新建倒序
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
        return (b.createdAt || 0) - (a.createdAt || 0)
      }),
    [todos],
  )
  const todoList = todoExpanded ? todoAll : todoAll.slice(0, 5)
  const todoUndone = todoAll.length

  const now = new Date()
  const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`

  return (
    <>
      {/* 数据备份 / 上传 / 恢复三个按钮已上移到 PcShell（全站右上角固定），这里不再重复 */}
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">工作台总览</div>
          <div className="pcv-sub">{greeting()} · {todayLabel}</div>
        </div>
        {/* 诊断入口：页面标题栏右上角，粉色描边按钮（用户要求「放在标题顶部右边 粉色边框」） */}
        <button
          className="pcv-btn pcv-btn-ghost"
          onClick={() => setWhyOpen(true)}
          title="列出已超阈值、但没出现的样品，并说明原因"
          style={{ marginLeft: 'auto', flexShrink: 0, color: '#b8517f', borderColor: 'rgba(184,81,127,0.55)' }}
        >为什么没提醒</button>
      </div>

      <div className="pcv-body">
        <div className="pcv-metrics">
          {/* 每张卡一个语义色：左侧 3px 色条 + 数字同色。
              值为 0 时整卡转灰（「有数才亮」）——否则四个 0 会跟真数据抢注意力。
              颜色仍只用现有那三档语义色 + 品牌粉，不新增色板。
              每张卡右侧一个「＋」：就地新增对应的东西（用户要求加在卡片里）。 */}
          {/* 「新增」统一改成「跳到对应页面并自动打开那页的新增弹窗」（?add=1），
              这样加完能顺手在列表里看到刚加的那条，而不是在总览上弹一个孤立的表单。 */}
          {[
            { label: '样品总数', value: samples.length, accent: '#b8517f', addLabel: '新增样品', onAdd: () => navigate('/pc/samples?add=1') },
            { label: '待办未完成', value: todoUndone, accent: '#a97c46', addLabel: '新增待办', onAdd: () => navigate('/pc/todos') },
            { label: '发布提醒', value: all.reminders.length, accent: '#b96a66', addLabel: '记一条发布', onAdd: () => navigate('/pc/publish-records?add=1') },
            { label: '出单记录', value: orders.length, accent: '#5f8a74', addLabel: '记出单', onAdd: () => navigate('/pc/orders?add=1') },
          ].map((m) => {
            const on = m.value > 0
            return (
              <div
                key={m.label}
                className="pcv-metric"
                style={{ borderLeft: `3px solid ${on ? m.accent : '#e5e7eb'}` }}
              >
                <div className="pcv-metric-body">
                  <div className="pcv-metric-label">{m.label}</div>
                  <div className="pcv-metric-value" style={{ color: on ? m.accent : '#c9cdd4' }}>{m.value}</div>
                </div>
                <button className="pcv-metric-add" title={m.addLabel} onClick={m.onAdd}>新增</button>
              </div>
            )
          })}
        </div>

        <div className="pcv-stack">
          {/* 发布计划 / 待投流 / 待办清单：三块并排（用户要求），各占 1/3 宽；
              顺序按用户要求把「发布计划、待投流」放在最前面 */}
          <div className="pcv-3col">
          {/* 发布计划：产品 / 账号 / 数量 / 时间（store.publishPlans，随云同步） */}
          <PublishPlanCard />

          {/* 待投流：与手机端同一份数据（store.adQueue），从已发布视频里挑，状态行内可改 */}
          <AdQueueCard />

          {/* 待办清单：空的时候只占一行，不留大块空白 */}
          <div className="pcv-card">
            <div className="pcv-card-h">
              <span>待办清单</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>{todoUndone} 未完成</span>
              {/* 卡头就地放一个「新增」：跳到待办页并自动聚焦输入框（用户要求加在这儿） */}
              <button
                className="pcv-metric-add"
                style={{ marginLeft: 8 }}
                title="新增待办"
                onClick={() => navigate('/pc/todos?add=1')}
              >新增</button>
              <div className="pcv-spacer" />
              <button className="pcv-btn-text" onClick={() => navigate('/pc/todos')}>去管理</button>
            </div>
            {todoList.length === 0 ? (
              <div className="pcv-inline-empty">
                <span>没有未完成的待办</span>
                <button className="pcv-btn-text" onClick={() => navigate('/pc/todos')}>去添加一条</button>
              </div>
            ) : (
              <>
                <div className="pcv-todogrid">
                  {todoList.map((t) => (
                    <div key={t.id} className="pcv-copyitem" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #c4b5fd', flexShrink: 0 }} />
                      {/* 标题不再 flex:1，截止日期紧跟标题靠左（原来被推到整行最右，离标题很远） */}
                      <span style={{
                        flex: '0 1 auto', minWidth: 0, maxWidth: '72%', fontSize: 14, color: '#334155',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{t.title}</span>
                      <DueTag due={t.due} />
                      <div style={{ flex: 1 }} />
                    </div>
                  ))}
                </div>
                {/* 超过 5 条才出现展开入口；展开后文案变「收起」 */}
                {todoAll.length > 5 && (
                  <button
                    className="pcv-btn-text"
                    onClick={() => setTodoExpanded((v) => !v)}
                    style={{
                      display: 'block', width: '100%', padding: '10px 14px', textAlign: 'center',
                      borderTop: '0.5px solid rgba(15, 23, 42, 0.05)', color: '#b8517f', fontWeight: 600,
                    }}
                  >
                    {todoExpanded ? '收起' : `查看全部 ${todoAll.length} 条`}
                  </button>
                )}
              </>
            )}
          </div>

          </div>{/* /pcv-3col */}

          {/* 提醒中心：Tab 与账号筛选合并到卡头同一行（原来分两行，白占一层高度） */}
          <div className="pcv-card">
            <div className="pcv-card-h" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
              {/* Tab 样式照手机端：透明底 + 选中粉字 + 彩色计数气泡 + 短下划线
                  （原来是白底药丸 + 灰气泡，和手机端不是一套语言） */}
              <div className="pcv-rtabs">
                {REMINDER_TABS.map((t) => {
                  const on = tab === t.id
                  const n = tabCount(t.id)
                  return (
                    <button
                      key={t.id}
                      className={`pcv-rtab${on ? ' on' : ''}`}
                      onClick={() => { setTab(t.id); setAccount('') }}
                    >
                      <span>{t.label}</span>
                      <span className="pcv-rtab-count">{n}</span>
                    </button>
                  )
                })}
              </div>
              <span style={{ width: 1, height: 16, background: 'rgba(15,23,42,0.10)', flexShrink: 0, margin: '0 4px' }} />
              {/* 账号胶囊也照手机端：用账号主题色描边，选中填充同色白字
                  （原来是统一的灰色胶囊，和手机端的账号色对不上） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                {/* 「全部账号」选中态用品牌粉填充（原来是深黑底，与其他账号胶囊的彩色不搭，用户要求不要黑色） */}
                <button
                  onClick={() => setAccount('')}
                  style={{
                    padding: '5px 11px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                    fontSize: 12, fontWeight: 600,
                    border: account === '' ? 'none' : '1px solid rgba(15,23,42,0.14)',
                    background: account === '' ? '#b8517f' : '#fff',
                    color: account === '' ? '#fff' : '#4b5563',
                  }}
                >全部账号</button>
                {accountOptions.map((a) => {
                  const col = (ACCOUNT_COLOR[a] || {}).c || '#6b7280'
                  const on = account === a
                  return (
                    <button
                      key={a}
                      onClick={() => setAccount(a)}
                      style={{
                        padding: '5px 11px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                        fontSize: 12, fontWeight: 600,
                        border: on ? 'none' : `1px solid ${col}`,
                        background: on ? col : '#fff',
                        color: on ? '#fff' : col,
                      }}
                    >{a}</button>
                  )
                })}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="pcv-empty">当前筛选下没有需要处理的样品</div>
            ) : (
              // 合并成一张表：账号不再各占一个标题+表格，改成一列「账号」（用户要求）
              // --inset：表头不用深灰带（用户要求），与卡头连成一块，不再像被一条灰线分开
              <table className="pcv-table pcv-table--inset">
                <thead>
                  <tr>
                    <th style={{ width: 190 }}>产品</th>
                    <th style={{ width: 180 }}>操作</th>
                    {/* 未发布天数挪到「账号」前面（用户要求换顺序）：先看还差几天，再看是哪个账号 */}
                    {/* 每个账号一个天数胶囊，列加宽到 320，配合 11px 字号尽量不换行 */}
                    <th style={{ width: 320 }}>{cur.header}</th>
                    {/* 账号列加宽到 210：两个长账号名并排也能放下，不再折行 */}
                    <th style={{ width: 210 }}>账号</th>
                    <th style={{ width: 90 }}>状态</th>
                    <th style={{ width: 110 }}>截止日期</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ it, accs, acc }, i) => {
                    const s = it.sample || it
                    const st = SAMPLE_STATUS[s.status]
                    // 逾期行重点标注：整行淡红底 + 产品单元格左侧 3px 竖条（inset 阴影，
                    // 不吃布局空间，也不会被圆角切弯）+ 截止日期转红加粗。
                    const overdue = s.status !== 'published' && isOverdue(s)
                    return (
                      <tr key={`${acc}-${s.id}-${i}`} style={overdue ? { background: '#fdf7f6' } : undefined}>
                        <td
                          className="pcv-name"
                          title={s.name}
                          style={overdue ? { boxShadow: 'inset 3px 0 0 #dd9a95' } : undefined}
                        >{s.name}</td>
                        <td>{cur.actions(it)}</td>
                        {/* 未发布天数（列顺序：操作 → 天数 → 账号，用户要求换顺序） */}
                        <td>{cur.mid(it, acc, accs)}</td>
                        {/* 账号列：彩色圆点 + 名字；多账号并列**不换行**（用户要求「不要换行」） */}
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
                            {accs.map((a, k) => (
                              <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                {k > 0 && <span style={{ width: 8 }} />}
                                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, opacity: 0.75, background: (ACCOUNT_COLOR[a] || {}).c || '#c9cdd4' }} />
                                <span style={{ color: '#333a45' }}>{a}</span>
                              </span>
                            ))}
                          </span>
                        </td>
                        <td>{st && <span className="pcv-chip" style={statusTone(s.status)}>{st.label}</span>}</td>
                        <td
                          className="pcv-num"
                          style={{
                            color: overdue ? '#ad5c58' : (s.deadline ? '#475569' : '#cbd5e1'),
                            fontWeight: overdue ? 600 : 400,
                          }}
                        >{s.deadline || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 「为什么没提醒」诊断弹窗 */}
      {whyOpen && (
        <div className="pcv-overlay" onClick={() => setWhyOpen(false)}>
          <div className="pcv-dialog pcv-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>为什么没提醒</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>
                共 {whyRows.length} 个样品
              </span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setWhyOpen(false)}>×</button>
            </div>
            {/* 搜索 + 只看漏掉的：**放在滚动区外面**，列表滚的时候它固定不动（用户要求「搜索栏固定」） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px 10px' }}>
              <input
                className="pcv-input"
                style={{ flex: 1, minWidth: 0 }}
                placeholder="搜索产品名或账号…"
                value={whyQuery}
                onChange={(e) => setWhyQuery(e.target.value)}
              />
              <button
                className={whyOnlyMiss ? 'pcv-btn' : 'pcv-btn pcv-btn-ghost'}
                onClick={() => setWhyOnlyMiss((v) => !v)}
                style={{ flexShrink: 0 }}
              >只看漏掉的</button>
            </div>
            <div className="pcv-dialog-b" style={{ maxHeight: '62vh', overflowY: 'auto', paddingTop: 0 }}>
              {whyShown.length === 0 ? (
                <div className="pcv-empty">没有匹配的样品</div>
              ) : (
                <table className="pcv-table">
                  <thead>
                    <tr>
                      <th style={{ width: 190 }}>产品</th>
                      <th>每个账号：已N天 / 阈值（超期标红）</th>
                      <th style={{ width: 165 }}>结论</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whyShown.map(({ s, accs, reason, missing }) => (
                      <tr key={s.id}>
                        <td className="pcv-name" title={s.name}>{s.name}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {accs.map((x) => (
                              <span key={x.a} style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                                <span style={{ color: (ACCOUNT_COLOR[x.a] || {}).c || '#8a8f98', fontWeight: 600 }}>{x.a}</span>
                                <span style={{ color: x.due ? '#c2410c' : '#94a3b8', marginLeft: 4, fontWeight: x.due ? 700 : 400 }}>
                                  {x.days === Infinity ? '从未发布' : `已${x.days}天`}
                                  {` / 阈值${x.th}`}
                                </span>
                              </span>
                            ))}
                          </span>
                        </td>
                        <td style={{ color: missing ? '#b96a66' : '#5f8a74', fontWeight: 600 }}>{reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="pcv-dialog-f">
              <span style={{ fontSize: 12, color: '#9aa0a9' }}>
                红色字＝该账号已超阈值；结论「已在某 tab」是正常的，红色的「未进提醒」才是漏了
              </span>
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setWhyOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 打开样品：弹窗（复用样品表单），不跳页面 */}
      {sampleDialog !== undefined && (
        <SampleDialog sample={sampleDialog} onClose={() => setSampleDialog(undefined)} />
      )}

      {/* 补记发布：弹窗，不跳页面 */}
      {publishDialog !== undefined && (
        <PublishDialog
          sampleId={publishDialog.sampleId}
          accounts={publishDialog.accounts}
          onClose={() => setPublishDialog(undefined)}
        />
      )}

    </>
  )
}
