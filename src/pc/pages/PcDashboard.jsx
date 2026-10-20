import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { DueTag } from '../../components/DueTag'
import { selectAllReminders, REMINDER_TABS, daysUntilDeadline } from '../../utils/reminders'
import { daysSincePublishByAccount, pendingAccounts, isOverdue, compareUrgent } from '../../utils/publish'
import { getAccounts, ACCOUNTS, ACCOUNT_COLOR } from '../../utils/accounts'
import { SAMPLE_STATUS } from '../../utils/sampleStatus'
import { SampleDialog } from '../components/SampleDialog'
import { PublishDialog } from '../components/PublishDialog'
import { AdQueueCard } from '../components/AdQueueCard'

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

// PC 版总览。
// 业务口径全部复用 utils/reminders 与 utils/publish 的选择器 ——
// 这里只重写「怎么摆」，不重新定义「哪些算要提醒」，避免两套 UI 口径漂移。
export function PcDashboard() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { samples, todos, orders } = useStore()
  const [tab, setTab] = useState('reminders')
  const [account, setAccount] = useState('')
  // 「打开样品」走弹窗（用户要求 PC 端不跳页面）：undefined=关闭、对象=编辑
  const [sampleDialog, setSampleDialog] = useState(undefined)
  const [publishDialog, setPublishDialog] = useState(undefined)

  const all = useMemo(() => selectAllReminders(samples), [samples])

  // 每个 Tab 的口径：怎么取数、一条归到哪些账号、中列与操作各显示什么
  const spec = useMemo(() => ({
    reminders: {
      items: all.reminders,
      accountsOf: (s) => { const p = pendingAccounts(s); return p.length ? p : getAccounts(s) },
      header: '未发布天数',
      mid: (s, a) => {
        const days = daysSincePublishByAccount(s, a)
        const overdue = s.status !== 'published' && isOverdue(s)
        return (
          <>
            {/* 逾期 chip 不再重复带截止日 —— 右面已经有独立的「截止日期」列，
                重复写会让这一格时宽时窄，短内容行的空洞特别明显 */}
            {overdue && <span className="pcv-chip" style={{ ...TONE.danger, marginRight: 6 }}>已逾期</span>}
            <span className="pcv-chip" style={TONE.warn}>
              {days === Infinity ? '从未发布过视频' : `已 ${days} 天没发`}
            </span>
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

  const cur = spec[tab]

  const items = useMemo(
    () => (account ? cur.items.filter((it) => cur.accountsOf(it).includes(account)) : cur.items),
    [cur, account],
  )

  // Tab 上的数字要跟着账号筛选变（与手机端一致）：
  // 原来直接取 spec[t.id].items.length，选了账号后列表变了、数字却纹丝不动，
  // 看起来像「点了没反应」。
  const tabCount = (id) => {
    const sp = spec[id]
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
      const worst = tab === 'reminders'
        ? accs.reduce((w, a) => (daysSincePublishByAccount(s, a) > daysSincePublishByAccount(s, w) ? a : w), accs[0])
        : accs[0]
      out.push({ it, accs, acc: worst })
    }
    // 「发布提醒」排序（用户要求「逾期的排前面」）：
    //   ① 已逾期的一律排最前 —— 判定必须与界面上的「已逾期」标签完全一致；
    //   ② 其余按截止日期升序（最早到期的最急）；
    //   ③ 截止日相同/缺失时用 compareUrgent 兜底（多久没发视频）；
    //   ④ 最后按账号顺序，让同一账号的行尽量挨在一起。
    if (tab === 'reminders') {
      const overdueOf = (r) => {
        const s = r.it.sample || r.it
        return (s.status !== 'published' && isOverdue(s)) ? 0 : 1
      }
      out.sort((x, y) => {
        const oa = overdueOf(x)
        const ob = overdueOf(y)
        if (oa !== ob) return oa - ob
        const a = (x.it.sample || x.it).deadline || ''
        const b = (y.it.sample || y.it).deadline || ''
        if (!a && !b) return accRank(x.acc) - accRank(y.acc)
        if (!a) return 1     // 没填截止日的排在最后
        if (!b) return -1
        return a.localeCompare(b)
          || accRank(x.acc) - accRank(y.acc)
          || compareUrgent(x.it.sample || x.it, y.it.sample || y.it)
      })
    } else if (account === '') {
      // 其它 Tab 未筛选时按账号归拢，读起来是「一账号一段」而不是随机交错
      out.sort((x, y) => accRank(x.acc) - accRank(y.acc))
    }
    return out
  }, [items, cur, account, tab])

  // 待办清单默认只列 5 条，卡片底部「查看全部 N 条」再展开剩余（用户要求）。
  // 不再用卡内滚动：滚动条在小卡片里不好点，展开/收起更直观。
  const [todoExpanded, setTodoExpanded] = useState(false)
  // 未完成的待办，**新加的排最前**（用户要求）：按创建时间倒序，
  // 刚记的一条立刻出现在卡片顶部，不用滚到底去找
  const todoAll = useMemo(
    () => [...(todos || [])]
      .filter((t) => !t.done)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
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
          {/* 待办清单：全宽。空的时候只占一行，不留大块空白 */}
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

          {/* 待投流：与手机端同一份数据（store.adQueue），从已发布视频里挑，状态行内可改 */}
          <AdQueueCard />

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
                    <th style={{ width: 170 }}>账号</th>
                    <th style={{ width: 90 }}>状态</th>
                    <th style={{ width: 230 }}>{cur.header}</th>
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
                        {/* 账号列：彩色圆点 + 名字；多账号（即将到期）并列显示 */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                        <td>{cur.mid(it, acc)}</td>
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
