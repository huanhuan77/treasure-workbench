import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { DueTag } from '../../components/DueTag'
import { ConfirmModal } from '../../components/Modal'
import { getStoredToken, uploadBackup, restoreBackup } from '../../utils/cloudBackup'
import { selectAllReminders, REMINDER_TABS, daysUntilDeadline } from '../../utils/reminders'
import { daysSincePublishByAccount, pendingAccounts, isOverdue, compareUrgent } from '../../utils/publish'
import { getAccounts, ACCOUNTS, ACCOUNT_COLOR } from '../../utils/accounts'
import { SAMPLE_STATUS } from '../../utils/sampleStatus'
import { SampleDialog } from '../components/SampleDialog'
import { PublishDialog } from '../components/PublishDialog'
import { OrderDialog } from '../components/OrderDialog'

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
  // 指标卡右侧「＋」里的「记出单」用
  const [orderOpen, setOrderOpen] = useState(false)
  // 云备份：上传（本机覆盖云端）/ 恢复（云端覆盖本机，需二次确认）
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)

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
          <button className="pcv-btn-text" style={{ marginLeft: 10 }} onClick={() => setSampleDialog(s)}>打开样品</button>
        </>
      ),
    },
    low: {
      items: all.low,
      accountsOf: (it) => it.accounts.map((x) => x.account),
      header: '还差条数',
      mid: (it, a) => {
        const row = it.accounts.find((x) => x.account === a)
        return (
          <>
            <span className="pcv-chip" style={TONE.warn}>还差 {it.minLack} 条</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#9aa0a9' }}>该账号已发 {row ? row.publishCount : 0} 条</span>
          </>
        )
      },
      actions: (it) => (
        <>
          <button className="pcv-btn" onClick={() => setPublishDialog({ sampleId: it.sample.id, accounts: it.accounts.map((x) => x.account) })}>补发布</button>
          <button className="pcv-btn-text" style={{ marginLeft: 10 }} onClick={() => setSampleDialog(it.sample)}>打开样品</button>
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
        return <span style={{ fontSize: 13, fontWeight: 600, color }}>{text}</span>
      },
      actions: (s) => (
        <button className="pcv-btn-text" onClick={() => setSampleDialog(s)}>打开样品</button>
      ),
    },
  }), [all, navigate])

  const cur = spec[tab]

  const items = useMemo(
    () => (account ? cur.items.filter((it) => cur.accountsOf(it).includes(account)) : cur.items),
    [cur, account],
  )

  // 当前 Tab 涉及到的账号（供筛选条）
  const accountOptions = useMemo(() => {
    const set = new Set()
    for (const it of cur.items) for (const a of cur.accountsOf(it)) set.add(a)
    return [...set].sort((x, y) => accRank(x) - accRank(y))
  }, [cur])

  // 按账号分组：同一账号下的待处理产品排在一起，便于「一个账号一个账号地补」。
  // ⚠️ 已选定某个账号时，必须只保留该账号这一个分组 —— 否则样品会按自己的
  // 全部账号重新散回各组（点「努力成为富婆」却还能看到 广东刘亦菲 的组），筛选形同失效。
  const groups = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      for (const a of cur.accountsOf(it)) {
        if (account && a !== account) continue
        if (!map.has(a)) map.set(a, [])
        map.get(a).push(it)
      }
    }
    // 「发布提醒」组内排序：**已逾期排最前面**，其次「多久没发视频」由久到近。
    // 比较逻辑提到 utils/publish 的 compareUrgent，和手机版总览/发布提醒页共用一份。
    // 只作用于发布提醒 tab：
    //   · 即将到期 tab 本身已按截止日升序，逾期天然在最前，再排会打乱它；
    //   · 发布不足5条 tab 保持原顺序即可。
    if (tab === 'reminders') {
      for (const arr of map.values()) arr.sort((x, y) => compareUrgent(x.sample || x, y.sample || y))
    }
    return [...map.entries()].sort((x, y) => accRank(x[0]) - accRank(y[0]))
  }, [items, cur, account, tab])

  // 待办清单默认只列 5 条，卡片底部「查看全部 N 条」再展开剩余（用户要求）。
  // 不再用卡内滚动：滚动条在小卡片里不好点，展开/收起更直观。
  const [todoExpanded, setTodoExpanded] = useState(false)
  const todoAll = useMemo(
    () => [...(todos || [])].filter((t) => !t.done),
    [todos],
  )
  const todoList = todoExpanded ? todoAll : todoAll.slice(0, 5)
  const todoUndone = todoAll.length

  const now = new Date()
  const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`

  // Token 存在备份页（localStorage），这里不重复弹输入框：没配就引导过去
  const requireToken = () => {
    const tk = getStoredToken()
    if (!tk) {
      show('请先在「数据备份」页填写 GitHub Token', 'error')
      navigate('/backup')
      return ''
    }
    return tk
  }

  // 上传：本机数据覆盖云端（不弹确认，与备份页行为一致）
  const handleUploadCloud = async () => {
    const tk = requireToken()
    if (!tk || backingUp) return
    setBackingUp(true)
    try {
      await uploadBackup(tk)
      show('☁️ 已上传到云端', 'success')
    } catch (e) {
      show('上传失败：' + e.message, 'error')
    } finally {
      setBackingUp(false)
    }
  }

  // 恢复：云端数据覆盖本机 → 必须重载页面，数据才会整体生效
  const handleRestoreCloud = async () => {
    const tk = getStoredToken()
    setConfirmRestore(false)
    if (!tk) {
      show('请先在「数据备份」页填写 GitHub Token', 'error')
      navigate('/backup')
      return
    }
    setRestoring(true)
    try {
      const { count } = await restoreBackup(tk)
      show(`已恢复 ${count} 个模块，正在刷新…`, 'success')
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      show('恢复失败：' + e.message, 'error')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">工作台总览</div>
          <div className="pcv-sub">{greeting()} · {todayLabel}</div>
        </div>
        <div className="pcv-spacer" />
        <button className="pcv-btn pcv-btn-ghost" onClick={() => navigate('/backup')}>数据备份</button>
        {/* 云备份两个动作放首屏顶栏（原来只在备份页里）：上传=本机覆盖云端，恢复=云端覆盖本机 */}
        <button className="pcv-btn pcv-btn-ghost" disabled={backingUp} onClick={handleUploadCloud}>
          {backingUp ? '上传中…' : '☁️ 上传到云端'}
        </button>
        <button className="pcv-btn pcv-btn-ghost" disabled={restoring} onClick={() => setConfirmRestore(true)}>
          {restoring ? '恢复中…' : '📥 从云端恢复'}
        </button>
      </div>

      <div className="pcv-body">
        <div className="pcv-metrics">
          {/* 每张卡一个语义色：左侧 3px 色条 + 数字同色。
              值为 0 时整卡转灰（「有数才亮」）——否则四个 0 会跟真数据抢注意力。
              颜色仍只用现有那三档语义色 + 品牌粉，不新增色板。
              每张卡右侧一个「＋」：就地新增对应的东西（用户要求加在卡片里）。 */}
          {[
            { label: '样品总数', value: samples.length, accent: '#b8517f', addLabel: '新增样品', onAdd: () => setSampleDialog(null) },
            { label: '待办未完成', value: todoUndone, accent: '#a97c46', addLabel: '新增待办', onAdd: () => navigate('/pc/todos') },
            { label: '发布提醒', value: all.reminders.length, accent: '#b96a66', addLabel: '记一条发布', onAdd: () => navigate('/pc/publish-records') },
            { label: '出单记录', value: orders.length, accent: '#5f8a74', addLabel: '记出单', onAdd: () => setOrderOpen(true) },
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
                <button className="pcv-metric-add" title={m.addLabel} onClick={m.onAdd}>＋</button>
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
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <DueTag due={t.due} />
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

          {/* 提醒中心 */}
          <div className="pcv-card">
            <div className="pcv-card-h">
              <div className="pcv-seg">
                {REMINDER_TABS.map((t) => (
                  <button
                    key={t.id}
                    className={tab === t.id ? 'on' : ''}
                    onClick={() => { setTab(t.id); setAccount('') }}
                  >
                    <span>{t.label}</span>
                    <span className="pcv-count">{spec[t.id].items.length}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pcv-accountbar">
              <button className={account === '' ? 'on' : ''} onClick={() => setAccount('')}>全部账号</button>
              {accountOptions.map((a) => (
                <button key={a} className={account === a ? 'on' : ''} onClick={() => setAccount(a)}>{a}</button>
              ))}
            </div>

            {groups.length === 0 ? (
              <div className="pcv-empty">当前筛选下没有需要处理的样品</div>
            ) : (
              groups.map(([acc, list]) => (
                <div key={acc}>
                  <div className="pcv-grouphead">
                    {/* 账号主题色退成一个小圆点，名字回归中性色 —— 原来三个账号
                        三个颜色的粗体标题，是整页最花的地方 */}
                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, opacity: 0.55, background: (ACCOUNT_COLOR[acc] || {}).c || '#c9cdd4' }} />
                    <span>{acc}</span>
                    <span>{list.length} 个待处理</span>
                  </div>
                  <table className="pcv-table">
                    <thead>
                      <tr>
                        {/* 列宽按「内容宽度 + 适度留白」定死，且总和接近表格可用宽度（约 1100px）：
                            表格是 width:100%，指定宽度后余量按比例摊到各列；
                            若某列定得过宽（早先用 auto / 26%），余量会全堆在那一列，
                            短内容行就会空出一大片（实测中期列 377px、内容只占 107px）。
                            「操作」按用户要求挪到「产品」旁边（原来在最右端，一行要横跨整个屏幕才够得到）。
                            同时把它从 240 收到 160：240 是它待在最右端时留的宽度，
                            内容最多只有「补记发布 + 打开样品」≈130px，放第 2 列会空出一块。
                            右侧空出来的宽度匀给「还差条数/截止时间」那列。 */}
                        <th style={{ width: 250 }}>产品</th>
                        <th style={{ width: 160 }}>操作</th>
                        <th style={{ width: 120 }}>状态</th>
                        <th style={{ width: 260 }}>{cur.header}</th>
                        <th style={{ width: 150 }}>截止日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((it, i) => {
                        const s = it.sample || it
                        const st = SAMPLE_STATUS[s.status]
                        // 逾期行重点标注：整行淡红底 + 产品单元格左侧 3px 竖条（inset 阴影，
                        // 不吃布局空间，也不会被圆角切弯）+ 截止日期转红加粗。
                        // 光靠那枚浅红 chip 在一屏几十行里太弱，扫不出来。
                        const overdue = s.status !== 'published' && isOverdue(s)
                        return (
                          <tr key={`${acc}-${s.id}-${i}`} style={overdue ? { background: '#fdf7f6' } : undefined}>
                            <td
                              className="pcv-name"
                              title={s.name}
                              style={overdue ? { boxShadow: 'inset 3px 0 0 #dd9a95' } : undefined}
                            >{s.name}</td>
                            {/* 操作紧跟在产品后面（表头顺序已同步） */}
                            <td>{cur.actions(it)}</td>
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
                </div>
              ))
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

      {/* 记出单：从「＋ 新增」菜单打开，账号 Tab 切换、一次可记多个账号 */}
      {orderOpen && (
        <OrderDialog onClose={() => setOrderOpen(false)} />
      )}

      {/* 从云端恢复是覆盖式操作（云端盖本机），必须二次确认 */}
      <ConfirmModal
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={handleRestoreCloud}
        title="从云端恢复"
        message="会用云端备份覆盖本机全部数据（产品、样品、收支、投资、日历等），本机未上传的内容会丢失。恢复后页面会自动刷新，确定继续？"
        confirmText="覆盖并恢复"
        danger
      />
    </>
  )
}
