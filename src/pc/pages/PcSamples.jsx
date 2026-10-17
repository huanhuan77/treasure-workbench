import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR } from '../../utils/accounts'
import {
  SAMPLE_STATUS_LIST, computeStatusStats, sampleMatchesFilter,
  getAccounts, getCounts, getTopStatus, isShotSample, isArchivedSample,
} from '../../utils/sampleStatus'
import { deadlineDesc } from '../../utils/helpers'
import { CATEGORY_STYLE } from '../../utils/productDisplay'
import { isAccountsHidden, setAccountsHidden } from '../../utils/accountVis'
import { SampleDialog } from '../components/SampleDialog'
import { PublishDialog } from '../components/PublishDialog'

// 状态色调只用三档 + 一档淡出：
//   中性（未到货）/ 待办（未拍、已拍未发）/ 完成（已发布）/ 淡出（已放弃）
// 手机版是「一个状态一种颜色」，在这里会被压成浅色系里的一片花，所以按语义归一。
const TONE = {
  neutral: { background: '#f3f4f6', color: '#6b7280' },
  warn: { background: '#faf1e3', color: '#a97c46' },
  good: { background: '#eef4ef', color: '#5f8a74' },
  muted: { background: '#f5f6f8', color: '#9aa0a9' },
}
const STATUS_TONE = {
  un_arrived: TONE.neutral,
  arrived: TONE.warn,
  shot: TONE.warn,
  published: TONE.good,
  abandoned: TONE.muted,
}

const SORT_OPTIONS = [
  { key: 'custom', label: '默认' },
  { key: 'receiveDate', label: '收货日期', defaultDir: 'desc' },
  { key: 'deadline', label: '截止日期', defaultDir: 'asc' },
]

// 状态筛选已按用户要求改成「与手机版同步」的统计卡片（见下方 .pcv-statbar）。
// 原来那套「彩色文字胶囊」的配色表（SEG_TONE）连同 .pcv-seg--tone 一起删掉了 —— 已无引用。

// PC 版样品记录。
// 数据口径全部复用 utils/sampleStatus 与 utils/helpers，与手机版同一套判定，
// 这里只把「卡片 + 一堆彩色标签」重排成「筛选条 + 紧凑表格」。
export function PcSamples() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { samples, orders, updateSample } = useStore()
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [hideAccount, setHideAccount] = useState(() => isAccountsHidden())
  const [sortKey, setSortKey] = useState('custom')
  const [sortDir, setSortDir] = useState('desc')
  // 样品新增/编辑走弹窗：undefined=关闭、null=新增、对象=编辑
  const [sampleDialog, setSampleDialog] = useState(undefined)
  // 补记发布弹窗：undefined=关闭、{ sampleId, accounts }=打开
  const [publishDialog, setPublishDialog] = useState(undefined)

  // 「是否出单」按**出单记录表**（store.orders）关联，不是样品里的 countsByAccount。
  // 两者口径不同：countsByAccount 是样品内部维护的影子计数，历史数据可能没跟上；
  // 出单记录表才是真实台账。所以这列以 orders 里 sampleId 命中为准。
  const orderCountBySample = useMemo(() => {
    const m = new Map()
    for (const o of orders || []) {
      const sid = o && o.sampleId
      if (!sid) continue
      m.set(sid, (m.get(sid) || 0) + 1)
    }
    return m
  }, [orders])

  const accountFiltered = useMemo(() => {
    let list = samples
    if (accountFilter !== 'all') list = list.filter((s) => getAccounts(s).includes(accountFilter))
    if (filter !== 'all') list = list.filter((s) => sampleMatchesFilter(s, filter))
    const kw = keyword.trim().toLowerCase()
    if (kw) list = list.filter((s) => `${s.name || ''} ${s.category || ''}`.toLowerCase().includes(kw))
    return list
  }, [samples, accountFilter, filter, keyword])

  const displayed = useMemo(() => {
    if (sortKey === 'custom') return accountFiltered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...accountFiltered].sort((a, b) => {
      const va = a[sortKey] || ''
      const vb = b[sortKey] || ''
      if (!va && !vb) return (a.name || '').localeCompare(b.name || '')
      if (!va) return 1
      if (!vb) return -1
      return va.localeCompare(vb) * dir
    })
  }, [accountFiltered, sortKey, sortDir])

  const statusStats = useMemo(() => computeStatusStats(samples, accountFilter), [samples, accountFilter])
  // 与手机版一致：总数扣掉已放弃
  const totalCount = useMemo(
    () => Object.values(statusStats).reduce((a, b) => a + b, 0) - (statusStats.abandoned || 0),
    [statusStats],
  )

  const usedAccounts = useMemo(() => {
    const set = new Set()
    for (const s of samples) for (const a of getAccounts(s)) set.add(a)
    return [...set].sort((x, y) => {
      const ix = ACCOUNTS.indexOf(x)
      const iy = ACCOUNTS.indexOf(y)
      return (ix === -1 ? 999 : ix) - (iy === -1 ? 999 : iy)
    })
  }, [samples])

  const toggleHideAccount = () => {
    const next = !hideAccount
    setHideAccount(next)
    setAccountsHidden(next)
  }

  // 与手机版一致：标记已拍 / 补记发布跳同一页 / 编辑跳同一页
  const markShot = (s) => {
    updateSample(s.id, { isShot: true })
    show('已标记为已拍', 'success')
  }

  const pickSort = (o) => {
    if (sortKey === o.key && o.key !== 'custom') {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(o.key)
      setSortDir(o.defaultDir || 'desc')
    }
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">样品记录</div>
          <div className="pcv-sub">
            {displayed.length} / {totalCount} 个样品
            {SAMPLE_STATUS_LIST.filter((s) => statusStats[s.key] > 0)
              .map((s) => ` · ${s.label} ${statusStats[s.key]}`)
              .join('')}
          </div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 200 }}
          placeholder="搜索产品名称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button className="pcv-btn pcv-btn-ghost" onClick={toggleHideAccount}>
          {hideAccount ? '显示账号' : '隐藏账号'}
        </button>
        <button className="pcv-btn" onClick={() => setSampleDialog(null)}>新增样品</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        {/* 状态筛选：与手机版 SamplesPage 同款**统计卡片** ——
            白底小卡，上行「状态色点 + 图标/名称」，下行大数字；
            选中用该状态色描边 + 轻阴影。原来 PC 是「彩色文字胶囊」，用户要求跟手机同步。
            颜色取 `SAMPLE_STATUS[key].color`（手机同一套），用量只有 6px 点和 1.5px 边框，不会花。 */}
        <div className="pcv-statbar">
          <button
            className="pcv-statcard"
            style={filter === 'all' ? { border: '1.5px solid #64748b', boxShadow: '0 4px 12px rgba(100,116,139,0.18)' } : undefined}
            onClick={() => setFilter('all')}
          >
            <span className="pcv-statcard-top">
              <span className="pcv-statcard-dot" style={{ background: '#64748b' }} />
              <span className="pcv-statcard-label">🗂 全部</span>
            </span>
            <span className="pcv-statcard-num">{totalCount}</span>
          </button>
          {/* 与手机版对齐：排除「未到货」（该状态已不再使用，卡上永远是 0）。
              手机版 SamplesPage 同样有 .filter((f) => f.key !== 'un_arrived')。 */}
          {SAMPLE_STATUS_LIST.filter((s) => s.key !== 'un_arrived').map((s) => {
            const on = filter === s.key
            return (
              <button
                key={s.key}
                className="pcv-statcard"
                style={on ? { border: `1.5px solid ${s.color}`, boxShadow: `0 4px 12px ${s.color}26` } : undefined}
                onClick={() => setFilter(s.key)}
              >
                <span className="pcv-statcard-top">
                  <span className="pcv-statcard-dot" style={{ background: s.color }} />
                  <span className="pcv-statcard-label">{s.icon} {s.label}</span>
                </span>
                <span className="pcv-statcard-num">{statusStats[s.key] || 0}</span>
              </button>
            )
          })}
        </div>

        {/* 账号筛选 + 排序 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <button className={accountFilter === 'all' ? 'on' : ''} onClick={() => setAccountFilter('all')}>全部账号</button>
          {usedAccounts.map((a) => (
            <button key={a} className={accountFilter === a ? 'on' : ''} onClick={() => setAccountFilter(a)}>{a}</button>
          ))}
          {/* 排序组紧靠账号筛选右边，不再用 spacer 顶到最右（用户要求「往左边靠」） */}
          <div className="pcv-sortgrp">
            {SORT_OPTIONS.map((o) => (
              <button key={o.key} className={sortKey === o.key ? 'on' : ''} onClick={() => pickSort(o)}>
                {o.label}
                {sortKey === o.key && o.key !== 'custom' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                {/* 每列都定宽，余量交给最后一列（操作）吸收：
                    账号列原来是唯一的 auto 列，整张表的余量全落到它头上，就空出一大片。
                    空白留在表尾（操作列右侧）看起来才是「表格留白」，夹在中间就是空洞。
                    本次把原来「账号 · 发布/出单」一列拆成两列（账号 / 发布），
                    并把「出单」改名为「是否出单」（口径不变，仍看出单记录表）：
                    原来一个格子里塞「账号名 + 发N · 出N」，多账号样品会溢出格子、压到截止日期列上。
                    ⚠️ 加列必须给操作列留够：三个按钮「标记已拍/补记发布/编辑」实测要约 216px，
                    第一版剩下 210px 时「编辑」被挤到第二行（按钮 top 不一致）。
                    160+80+90+200+100+90+150 = 870，1440 视口下操作列约 280px。 */}
                <th style={{ width: 160 }}>产品</th>
                <th style={{ width: 80 }}>分类</th>
                <th style={{ width: 90 }}>状态</th>
                <th style={{ width: 200 }}>账号</th>
                <th style={{ width: 100 }}>发布</th>
                <th style={{ width: 90 }}>是否出单</th>
                <th style={{ width: 150 }}>截止日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={8} className="pcv-empty">当前筛选下没有样品</td>
                </tr>
              ) : displayed.map((s) => {
                const top = getTopStatus(s)
                const st = SAMPLE_STATUS_LIST.find((x) => x.key === top) || {}
                const accounts = getAccounts(s)
                const dl = deadlineDesc(s.deadline)
                const shot = isShotSample(s)
                const archived = isArchivedSample(s)
                // 「发布」列取样品合计（各账号 publishCount 相加），与「发布不足 5 条」提醒同一口径；
                // 各账号的明细留在 title 里，不占版面（多账号样品原来挤在一格里会溢出到隔壁列）。
                const publishTotal = accounts.reduce((n, a) => n + (getCounts(s, a).publishCount || 0), 0)
                return (
                  <tr key={s.id}>
                    <td>
                      {/* 分类已单独成列，产品格只留名字（原来是名字后面跟一个分类小标签） */}
                      <span className="pcv-nametext" title={s.name}>{s.name}</span>
                    </td>
                    <td>
                      {/* 分类：与文案库那列统一 —— 浅灰底 chip + 6px 分类色圆点（原来只有灰 chip，两页不一致） */}
                      {s.category ? (
                        <span className="pcv-chip" style={{ background: '#f3f4f6', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0, opacity: 0.7,
                            background: (CATEGORY_STYLE[s.category] || CATEGORY_STYLE['其他']).color,
                          }} />
                          {s.category}
                        </span>
                      ) : (
                        <span style={{ color: '#c9cdd4' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="pcv-chip" style={STATUS_TONE[top] || TONE.neutral}>{st.label || top}</span>
                    </td>
                    <td>
                      {/* 账号：6px 账号主题色圆点 + 名字（圆点只做归属区分，不给文字着色，
                          与总览「提醒中心」的账号分组头一个用法）。发布/出单数字已拆到右侧两列。 */}
                      {hideAccount ? (
                        <span className="pcv-chip" style={TONE.neutral}>{accounts.length} 个账号</span>
                      ) : accounts.length === 0 ? (
                        <span style={{ color: '#9aa0a9' }}>—</span>
                      ) : (
                        accounts.map((a) => (
                          <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 10, whiteSpace: 'nowrap' }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                              background: (ACCOUNT_COLOR[a] || {}).c || '#c9cdd4',
                            }} />
                            <span style={{ color: '#333a45', fontWeight: 600 }}>{a}</span>
                          </span>
                        ))
                      )}
                    </td>
                    <td>
                      {/* 发布：样品合计条数（与「发布不足 5 条」提醒同口径）。
                          各账号明细放 title，鼠标悬停可看「账号 发N」。 */}
                      <span
                        style={{
                          fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                          color: publishTotal > 0 ? '#5f8a74' : '#9aa0a9',
                        }}
                        title={accounts.map((a) => `${a} 发${getCounts(s, a).publishCount}`).join(' / ') || '无账号'}
                      >
                        {publishTotal}
                      </span>
                    </td>
                    <td>
                      {/* 是否出单：以出单记录表（orders）里有没有这个 sampleId 为准。
                          不用 countsByAccount.orderCount —— 那是样品内部的影子计数，历史数据可能没维护。 */}
                      {orderCountBySample.has(s.id) ? (
                        <span
                          className="pcv-chip"
                          style={{ background: '#fbeaea', color: '#b96a66' }}
                          title={`出单记录 ${orderCountBySample.get(s.id)} 条`}
                        >已出单</span>
                      ) : (
                        <span style={{ color: '#c9cdd4' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: s.deadline ? '#4b5563' : '#c9cdd4' }}>{s.deadline || '未设置'}</span>
                      {/* 只有未发布才显示「过期 N 天 / 剩 N 天」：已发布的样品截止日已经没有提醒意义，
                          一片红字反而盖住真正要跟进的那几条。日期本身保留（列名就叫「截止日期」）。
                          口径与手机版 SamplesPage 完全一致：已发布 + 已放弃 都不显示
                          （手机版那边的注释也是「截止日对这两类已无意义」）。 */}
                      {dl && top !== 'published' && top !== 'abandoned' && (
                        <span style={{ marginLeft: 6, fontSize: 12, color: dl.includes('过期') ? '#b96a66' : '#9aa0a9' }}>{dl}</span>
                      )}
                    </td>
                    <td>
                      {!shot && !archived && (
                        <button className="pcv-btn pcv-btn-ghost" onClick={() => markShot(s)}>标记已拍</button>
                      )}
                      <button className="pcv-btn" style={{ marginLeft: 8 }} onClick={() => setPublishDialog({ sampleId: s.id, accounts })}>补记发布</button>
                      {/* 「编辑」原来是文字链接（pcv-btn-text），按用户要求统一成按钮，
                          样式取 ghost（白底 + 细描边），与「标记已拍」同款。 */}
                      <button className="pcv-btn pcv-btn-ghost" style={{ marginLeft: 8 }} onClick={() => setSampleDialog(s)}>编辑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑样品：弹窗（PC 版外壳，见 components/SampleDialog），不跳页面 */}
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
