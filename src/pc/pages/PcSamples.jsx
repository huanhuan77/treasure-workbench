import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../store'
import { ACCOUNTS, ACCOUNT_COLOR, maskAccount } from '../../utils/accounts'
import {
  SAMPLE_STATUS_LIST, computeStatusStats, sampleMatchesFilter,
  getAccounts, getCounts, getTopStatus,
} from '../../utils/sampleStatus'
import { deadlineDesc } from '../../utils/helpers'
import { sampleDays } from '../../utils/publish'
import { CATEGORY_STYLE } from '../../utils/productDisplay'
import { isAccountsHidden, setAccountsHidden } from '../../utils/accountVis'
import { SampleDialog } from '../components/SampleDialog'
import { ResetButton } from '../components/ResetButton'

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

// 排序：去掉原来那排「默认 / 收货日期 / 截止日期」按钮，改成点表头（与出单页一致）。
// 首次点某列用该列的默认方向：收货日期看最新 → 降序；截止日期看最急 → 升序；再点同一列翻转。
const SORT_DEFAULT_DIR = { receiveDate: 'desc', deadline: 'asc' }

// 状态筛选已按用户要求改成「与手机版同步」的统计卡片（见下方 .pcv-statbar）。
// 原来那套「彩色文字胶囊」的配色表（SEG_TONE）连同 .pcv-seg--tone 一起删掉了 —— 已无引用。

// PC 版样品记录。
// 数据口径全部复用 utils/sampleStatus 与 utils/helpers，与手机版同一套判定，
// 这里只把「卡片 + 一堆彩色标签」重排成「筛选条 + 紧凑表格」。
export function PcSamples() {
  const navigate = useNavigate()
  const { samples, orders, hiddenAccounts } = useStore()
  // 「隐藏账号」= 名字打星号，不筛选（用户明确「是账号显示星号，不是筛选」）
  const visAcc = useCallback((arr) => (arr || []), [])
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  // 是否出单筛选：all=全部 / yes=已出单 / no=未出单（口径同「是否出单」列，以出单记录表为准）
  const [orderFilter, setOrderFilter] = useState('all')
  const [hideAccount, setHideAccount] = useState(() => isAccountsHidden())
  const [sortKey, setSortKey] = useState('custom')
  const [sortDir, setSortDir] = useState('desc')
  // 样品新增/编辑走弹窗：undefined=关闭、null=新增、对象=编辑
  const [sampleDialog, setSampleDialog] = useState(undefined)
  // 「补记发布」入口已从样品页移除（用户要求），弹窗状态与组件一并删掉
  // 改名、改状态一律走「编辑」弹窗（用户要求：列表里不再有任何行内修改）

  // 保存后「重新请求列表」：清掉可能挡住新样品的筛选（状态/账号/是否出单/搜索），
  // 并 +1 一个 refreshKey 强制重算，保证新加的那条一定出现在当前视图里
  const [refreshKey, setRefreshKey] = useState(0)
  const handleSaved = (id) => {
    setFilter('all')
    setAccountFilter('all')
    setOrderFilter('all')
    setKeyword('')
    setRefreshKey((k) => k + 1)
    if (id) setFlashId(id)
  }

  // 新增样品后**定位并高亮**那一行（用户反馈「新增样品没刷新列表」）：
  // 其实数据已经加进去了，但默认排序把新样品排在长列表最后面，一屏看不到，
  // 看起来就像没刷新。这里记住「上一批 id」，发现新出现的 id 就滚到它并短暂高亮。
  const [flashId, setFlashId] = useState('')
  const prevIdsRef = useRef(new Set())
  useEffect(() => {
    const ids = new Set((samples || []).map((s) => s && s.id).filter(Boolean))
    const prev = prevIdsRef.current
    // 首帧只做基线，不触发高亮
    if (prev.size > 0) {
      const added = [...ids].filter((id) => !prev.has(id))
      if (added.length) {
        const id = added[0]
        setFlashId(id)
        setTimeout(() => {
          const row = document.querySelector(`tr[data-sample-id="${id}"]`)
          if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }, 60)
        setTimeout(() => setFlashId(''), 4000)
      }
    }
    prevIdsRef.current = ids
  }, [samples])

  // 从总览指标卡的「新增」跳过来（/pc/samples?add=1）时自动打开新增弹窗；
  // 打开后把 add 参数清掉，免得刷新或关掉弹窗后又弹一次。
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setSampleDialog(null)
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

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
    // 「全部」默认**不含已放弃**（用户要求）：放弃的样品平时不占列表，
    // 只有点「已放弃」那张状态卡才列出来。这也让「N / 64 个样品」两个数字对得上。
    else list = list.filter((s) => !sampleMatchesFilter(s, 'abandoned'))
    // 是否出单：与「是否出单」列同口径（出单记录表 orderCountBySample 里命中即为已出单）
    if (orderFilter !== 'all') {
      list = list.filter((s) => orderCountBySample.has(s.id) === (orderFilter === 'yes'))
    }
    const kw = keyword.trim().toLowerCase()
    if (kw) list = list.filter((s) => `${s.name || ''} ${s.category || ''}`.toLowerCase().includes(kw))
    return list
  }, [samples, accountFilter, filter, orderFilter, orderCountBySample, keyword])

  // 已过期（未发布/未放弃 + 截止日已过，与「剩 N 天」红字同一口径）的样品排最前面。
  // 默认视图（sortKey=custom）下生效；用户点了表头排序时就按他自己的排序来，不插队。
  const isExpired = (s) => {
    const top = getTopStatus(s)
    if (top === 'published' || top === 'abandoned') return false
    const d = deadlineDesc(s.deadline)
    return !!d && d.includes('过期')
  }

  const displayed = useMemo(() => {
    if (sortKey === 'custom') {
      // 稳定排序：过期的一组在前，组内仍是原来的顺序（收货日期 / 录入顺序）
      return [...accountFiltered].sort((a, b) => (isExpired(a) ? 0 : 1) - (isExpired(b) ? 0 : 1))
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...accountFiltered].sort((a, b) => {
      const va = a[sortKey] || ''
      const vb = b[sortKey] || ''
      if (!va && !vb) return (a.name || '').localeCompare(b.name || '')
      if (!va) return 1
      if (!vb) return -1
      return va.localeCompare(vb) * dir
    })
  }, [accountFiltered, sortKey, sortDir, refreshKey])

  const statusStats = useMemo(() => computeStatusStats(samples, accountFilter), [samples, accountFilter])
  // 与手机版一致：总数扣掉已放弃
  const totalCount = useMemo(
    () => Object.values(statusStats).reduce((a, b) => a + b, 0) - (statusStats.abandoned || 0),
    [statusStats],
  )

  const usedAccounts = useMemo(() => {
    const set = new Set()
    for (const s of samples) for (const a of visAcc(getAccounts(s))) set.add(a)
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

  // 表头排序：sortKey 为 'custom' 表示未排序（默认顺序，即 store 里的排列）。
  // 箭头只在当前排序列上显示，避免每列表头都挂一个箭头。
  const sortDirOf = (field) => (sortKey === field ? sortDir : null)
  const toggleSort = (field) => {
    if (sortKey === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(field)
      setSortDir(SORT_DEFAULT_DIR[field] || 'desc')
    }
  }

  // 重置筛选：状态卡 / 账号 / 搜索关键词 / 排序 一次清回默认。
  // hasFilter 只用来控制按钮的可用态与深浅，不影响筛选逻辑。
  const hasFilter = filter !== 'all' || accountFilter !== 'all' || orderFilter !== 'all' || keyword !== '' || sortKey !== 'custom'
  const resetFilters = () => {
    setFilter('all')
    setAccountFilter('all')
    setOrderFilter('all')
    setKeyword('')
    setSortKey('custom')
    setSortDir('desc')
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
            选中用该状态色描边 + 轻阴影。原来 PC 是「彩色文字胶囊」，ssName机同步。
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

        {/* 账号筛选 + 是否出单筛选（排序入口已移到表头：点「收货日期」/「截止日期」列名） */}
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <button className={accountFilter === 'all' ? 'on' : ''} onClick={() => setAccountFilter('all')}>全部账号</button>
          {usedAccounts.map((a) => (
            <button key={a} className={accountFilter === a ? 'on' : ''} onClick={() => setAccountFilter(a)}>{maskAccount(a, hiddenAccounts)}</button>
          ))}
          {/* 竖线把两组筛选分开，避免读成一长串同类按钮 */}
          <span style={{ width: 1, height: 16, background: 'rgba(15,23,42,0.10)', margin: '0 4px' }} />
          {/* 是否出单：三档胶囊，默认档直接叫「全部」（与账号组的「全部账号」同义） */}
          {[
            { key: 'all', label: '全部' },
            { key: 'yes', label: '已出单' },
            { key: 'no', label: '未出单' },
          ].map((o) => (
            <button
              key={o.key}
              className={orderFilter === o.key ? 'on' : ''}
              onClick={() => setOrderFilter(o.key)}
            >{o.label}</button>
          ))}
          {/* 重置放最右：无筛选时置灰不可点，有筛选时可一键清空 */}
          <ResetButton active={hasFilter} onClick={resetFilters} />
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
                    排序入口去掉了右上那排按钮，改为点「收货日期」「截止日期」表头
                    （收货日期本来没有列，为保住这个排序维度才补的这一列）。
                    操作列现在只放「编辑」一个按钮（标记已拍/改名都收进弹窗），宽度余量充足：
                    130+65+75+260+70+70+107+155 = 932，1440 视口下操作列约 220px。
                    账号列 260px 是为了让「3 个账号」也能一行排完（3×(6+4+65) + 2×8 ≈ 240 < 260-28）。
                    两个日期列加宽到 107 / 155：日期本身 78px，截止日期后面还要跟「剩 N 天」约 42px，
                    原来 90 / 95 装不下，会被折成两行（用户反馈「不要换行」）。 */}
                <th style={{ width: 130 }}>产品</th>
                <th style={{ width: 65 }}>分类</th>
                <th style={{ width: 75 }}>状态</th>
                <th style={{ width: 260 }}>账号</th>
                <th style={{ width: 70 }}>发布</th>
                <th style={{ width: 70 }}>是否出单</th>
                {/* 发布提醒天数：按账号口径（账号单独设 > 产品设 > 默认 7 天），与提醒中心同一套算 */}
                <th style={{ width: 78 }}>提醒天数</th>
                <th style={{ width: 107 }} className="pcv-th-sort" onClick={() => toggleSort('receiveDate')}>
                  收货日期{sortDirOf('receiveDate') ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
                <th style={{ width: 155 }} className="pcv-th-sort" onClick={() => toggleSort('deadline')}>
                  截止日期{sortDirOf('deadline') ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={10} className="pcv-empty">当前筛选下没有样品</td>
                </tr>
              ) : displayed.map((s) => {
                const top = getTopStatus(s)
                const st = SAMPLE_STATUS_LIST.find((x) => x.key === top) || {}
                const accounts = visAcc(getAccounts(s))
                const dl = deadlineDesc(s.deadline)
                // 「发布」列取样品合计（各账号 publishCount 相加），与「发布不足 5 条」提醒同一口径；
                // 各账号的明细留在 title 里，不占版面（多账号样品原来挤在一格里会溢出到隔壁列）。
                const publishTotal = accounts.reduce((n, a) => n + (getCounts(s, a).publishCount || 0), 0)
                // 已过期：整行淡红底 + 首格左侧 3px 红竖条（用户要求「加个明显的背景色」）。
                // 判定与「已过期 N 天」红字同一口径（isExpired），不会出现底色和文案打架。
                const overdue = isExpired(s)
                return (
                  <tr
                    key={s.id}
                    data-sample-id={s.id}
                    // 刚新增的样品短暂高亮（优先于过期底色），配合 scrollIntoView 让用户一眼看到加在哪
                    style={flashId === s.id
                      ? { background: '#fff7e6', transition: 'background .3s ease' }
                      : (overdue ? { background: '#fff4f3', transition: 'background .2s ease' } : undefined)}
                  >
                    <td style={overdue ? { boxShadow: 'inset 3px 0 0 #e6a19c' } : undefined}>
                      {/* 分类已单独成列，产品格只留名字。
                          名字**只读**：改名统一走「操作 → 编辑」弹窗（用户要求「列表里不要改」） */}
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
                        /* 一行内排完、不换行（用户要求）：多账号样品原来会折成 2~3 行把行高撑高。
                           nowrap + overflow:hidden，放不下的账号被裁掉，完整名单在 title 里悬停可看。 */
                        <span
                          style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', whiteSpace: 'nowrap' }}
                          title={accounts.join(' / ')}
                        >
                          {accounts.map((a) => (
                            <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                background: (ACCOUNT_COLOR[a] || {}).c || '#c9cdd4',
                              }} />
                              {/* 账号名不加粗（用户要求）：原来 600 字重在一片正文里太跳，靠圆点区分归属即可 */}
                              <span style={{ color: '#333a45' }}>{maskAccount(a, hiddenAccounts)}</span>
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      {/* 发布：样品合计条数（与「发布不足 5 条」提醒同口径）。
                          各账号明细放 title，鼠标悬停可看「账号 发N」。 */}
                      <span
                        style={{
                          fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
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
                          style={TONE.good}
                          title={`出单记录 ${orderCountBySample.get(s.id)} 条`}
                        >已出单</span>
                      ) : (
                        <span style={{ color: '#c9cdd4' }}>—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {/* 发布提醒天数：按账号口径（账号单独设 > 产品设 > 默认 7 天）。
                          多账号取值不同时显示区间（如 5~7 天），完整明细放 title。
                          「到该发的账号 + 已N天」那行按用户要求去掉了（提醒统一看总览的提醒中心） */}
                      {accounts.length === 0 ? (
                        <span style={{ color: '#c9cdd4' }}>—</span>
                      ) : (() => {
                        const days = accounts.map((a) => sampleDays(s, a))
                        const uniq = [...new Set(days)]
                        const hot = Math.min(...days) <= 5
                        return (
                          <span
                            style={{
                              fontSize: 13, fontWeight: hot ? 700 : 500, fontVariantNumeric: 'tabular-nums',
                              color: hot ? '#f43f5e' : '#6b7280',
                            }}
                            title={accounts.map((a) => `${a} ${sampleDays(s, a)} 天`).join(' / ')}
                          >
                            {uniq.length === 1
                              ? `${uniq[0]} 天`
                              : `${Math.min(...days)}~${Math.max(...days)} 天`}
                          </span>
                        )
                      })()}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {/* 收货日期：仅作为排序维度展示（点表头可排），无则不显示「未设置」占位，
                          避免和截止日期的「未设置」混成一片 */}
                      <span style={{ color: s.receiveDate ? '#4b5563' : '#c9cdd4' }}>{s.receiveDate || '—'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: s.deadline ? '#4b5563' : '#c9cdd4' }}>{s.deadline || '未设置'}</span>
                      {/* 只有未发布才显示「过期 N 天 / 剩 N 天」：已发布的样品截止日已经没有提醒意义，
                          一片红字反而盖住真正要跟进的那几条。日期本身保留（列名就叫「截止日期」）。
                          口径与手机版 SamplesPage 完全一致：已发布 + 已放弃 都不显示
                          （手机版那边的注释也是「截止日对这两类已无意义」）。 */}
                      {/* 「剩 N 天」用橙色（用户要求）：正常倒计时也要能一眼扫到；
                          已过期仍是红调，颜色本身区分了「还来得及 / 已逾期」。 */}
                      {/* 已过期用大红色 #e02020（与总览「已逾期」标签同色），比原来的暗红显眼得多；
                          未过期仍是橙色，颜色本身区分「还来得及 / 已逾期」 */}
                      {dl && top !== 'published' && top !== 'abandoned' && (
                        <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: dl.includes('过期') ? '#e02020' : '#d97706' }}>{dl}</span>
                      )}
                    </td>
                    <td>
                      {/* 列表只留「编辑」一个按钮（用户要求）：标记已拍 / 改名 / 补发布
                          全部收进编辑弹窗，列表不再提供任何行内修改入口。 */}
                      <button
                        className="pcv-btn pcv-btn-ghost"
                        onClick={() => setSampleDialog(s)}
                      >编辑</button>
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
        <SampleDialog
          sample={sampleDialog}
          onClose={() => setSampleDialog(undefined)}
          onSaved={handleSaved}
        />
      )}

    </>
  )
}
