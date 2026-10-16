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

// 状态筛选分段控件的每档配色（用户要求「加点颜色区分」）。
// 色相沿用手机版 SAMPLE_STATUS（同一个状态两端同一个观感），但**文字色统一压深一档** ——
// 手机版那几个（#94a3b8 / #9ca3af）当白底文字对比度不够。
// 表现方式：未选中就把颜色标在**文字**上，选中了再补一层同色浅底 + 描边。
// 不另加色点 —— 用户对账号列讲过「不要圆点，颜色标记到账号上」，同一套偏好。
const SEG_TONE = {
  all: { c: '#b8517f', bg: '#fdf1f6', bd: '#f2cbdd' },        // 全部 = 品牌粉
  un_arrived: { c: '#5d7a99', bg: '#eef2f6', bd: '#dae3ec' },  // 未到货 = 蓝灰
  arrived: { c: '#b1702c', bg: '#faf1e3', bd: '#f0dfc2' },     // 未拍 = 琥珀
  shot: { c: '#2f7f96', bg: '#e9f3f6', bd: '#d1e5ec' },        // 已拍未发 = 青
  published: { c: '#4f8a68', bg: '#eef4ef', bd: '#d7e6dd' },   // 已发布 = 绿
  abandoned: { c: '#8a8f98', bg: '#f4f5f7', bd: '#e4e6ea' },   // 已放弃 = 中性灰
}

// PC 版样品记录。
// 数据口径全部复用 utils/sampleStatus 与 utils/helpers，与手机版同一套判定，
// 这里只把「卡片 + 一堆彩色标签」重排成「筛选条 + 紧凑表格」。
export function PcSamples() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { samples, updateSample } = useStore()
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
        {/* 状态筛选：分段控件 + 数量气泡，口径与手机版的状态分组卡一致 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <div className="pcv-seg pcv-seg--tone">
            <button
              className={filter === 'all' ? 'on' : ''}
              style={{ color: SEG_TONE.all.c, ...(filter === 'all' ? { background: SEG_TONE.all.bg, borderColor: SEG_TONE.all.bd } : {}) }}
              onClick={() => setFilter('all')}
            >
              <span>全部</span>
              <span className="pcv-count">{totalCount}</span>
            </button>
            {SAMPLE_STATUS_LIST.map((s) => {
              const t = SEG_TONE[s.key] || SEG_TONE.abandoned
              const on = filter === s.key
              return (
                <button
                  key={s.key}
                  className={on ? 'on' : ''}
                  style={{ color: t.c, ...(on ? { background: t.bg, borderColor: t.bd } : {}) }}
                  onClick={() => setFilter(s.key)}
                >
                  <span>{s.label}</span>
                  <span className="pcv-count">{statusStats[s.key] || 0}</span>
                </button>
              )
            })}
          </div>
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
                    加「分类」列后从产品/账号/截止日期各匀了一点出来，保证操作列不被挤到换行。 */}
                <th style={{ width: 200 }}>产品</th>
                <th style={{ width: 90 }}>分类</th>
                <th style={{ width: 100 }}>状态</th>
                <th style={{ width: 320 }}>账号 · 发布/出单</th>
                <th style={{ width: 175 }}>截止日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="pcv-empty">当前筛选下没有样品</td>
                </tr>
              ) : displayed.map((s) => {
                const top = getTopStatus(s)
                const st = SAMPLE_STATUS_LIST.find((x) => x.key === top) || {}
                const accounts = getAccounts(s)
                const dl = deadlineDesc(s.deadline)
                const shot = isShotSample(s)
                const archived = isArchivedSample(s)
                return (
                  <tr key={s.id}>
                    <td>
                      {/* 分类已单独成列，产品格只留名字（原来是名字后面跟一个分类小标签） */}
                      <span className="pcv-nametext" title={s.name}>{s.name}</span>
                    </td>
                    <td>
                      {s.category ? (
                        <span className="pcv-chip" style={{ background: '#f3f4f6', color: '#6b7280' }}>{s.category}</span>
                      ) : (
                        <span style={{ color: '#c9cdd4' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="pcv-chip" style={STATUS_TONE[top] || TONE.neutral}>{st.label || top}</span>
                    </td>
                    <td>
                      {hideAccount ? (
                        <span className="pcv-chip" style={TONE.neutral}>{accounts.length} 个账号</span>
                      ) : accounts.length === 0 ? (
                        <span style={{ color: '#9aa0a9' }}>—</span>
                      ) : (
                        accounts.map((a) => {
                          const c = getCounts(s, a)
                          return (
                            <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12, whiteSpace: 'nowrap' }}>
                              {/* 账号名本身带账号主题色（原来是个 6px 小圆点，用户要求去掉圆点、把颜色标到文字上） */}
                              <span style={{ color: (ACCOUNT_COLOR[a] || {}).c || '#4b5563', fontWeight: 600 }}>{a}</span>
                              <span style={{ fontSize: 12, color: c.publishCount > 0 ? '#5f8a74' : '#9aa0a9' }}>
                                发{c.publishCount}{c.orderCount > 0 ? ` · 出${c.orderCount}` : ''}
                              </span>
                            </span>
                          )
                        })
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
                      <button className="pcv-btn-text" style={{ marginLeft: 8 }} onClick={() => setSampleDialog(s)}>编辑</button>
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
