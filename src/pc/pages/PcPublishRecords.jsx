import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { getAccounts } from '../../utils/accounts'
import { dateBounds } from '../../components/DateFilterBar'
import { PublishDialog } from '../components/PublishDialog'
import { ResetButton } from '../components/ResetButton'

// 日期区间快捷项（与手机版 DateFilterBar 同一套 key，交给 dateBounds 解析区间）
const RANGES = [
  { key: '', label: '全部' },
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'last7', label: '近7天' },
  { key: 'thisWeek', label: '本周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
]


// 解析 YYYY/MM/DD 或 YYYY-MM-DD
function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

// PC 版视频发布记录。
// 筛选、拆组、排序、按日期删除的口径与手机版 PublishRecordsPage 完全一致，
// 只是把「卡片 + 展开」重排成「筛选条 + 表格」，并把「共 N 次」做成可展开。
export function PcPublishRecords() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { publishRecords, samples, deletePublishRecord, updatePublishRecord } = useStore()
  // 修改发布日期：{ group, date } —— 点日期胶囊打开，保存时改这一组里同一天的全部记录
  const [dateEdit, setDateEdit] = useState(null)
  const [dateDraft, setDateDraft] = useState('')

  const openDateEdit = (group, date) => { setDateDraft(date || ''); setDateEdit({ group, date }) }
  const saveDateEdit = () => {
    if (!dateEdit || !dateDraft) return
    const { group, date } = dateEdit
    // 同一天可能挂着多条记录（多账号 / 多次录入），一起改
    const ids = [...new Set(group.records.filter((r) => r.publishDate === date).map((r) => r.id))]
    if (ids.length === 0 || dateDraft === date) { setDateEdit(null); return }
    ids.forEach((id) => updatePublishRecord(id, { publishDate: dateDraft }))
    show(ids.length > 1 ? `已把 ${ids.length} 条记录改到 ${dateDraft}` : `发布日期已改为 ${dateDraft}`, 'success')
    setDateEdit(null)
  }
  const [account, setAccount] = useState('')
  const [dateRange, setDateRange] = useState('today') // 与手机版同默认值
  const [keyword, setKeyword] = useState('')
  const [sortKey, setSortKey] = useState('dateDesc')
  const [expanded, setExpanded] = useState('')
  const [delTarget, setDelTarget] = useState(null)
  // 记录发布弹窗：undefined=关闭、对象=打开（可带预填）
  const [publishDialog, setPublishDialog] = useState(undefined)

  // 从总览指标卡「新增」跳过来（/pc/publish-records?add=1）时直接打开「记录发布」弹窗
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setPublishDialog({})
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // 表头排序（与其它 PC 表格同一套交互）：
  // field='date' → dateDesc/dateAsc，field='count' → countDesc/countAsc；
  // 首次点某列按降序，再点同一列翻转。
  const sortDirOf = (field) => {
    if (field === 'date') return sortKey === 'dateAsc' ? 'asc' : sortKey === 'dateDesc' ? 'desc' : null
    return sortKey === 'countAsc' ? 'asc' : sortKey === 'countDesc' ? 'desc' : null
  }
  const toggleSort = (field) => {
    const dir = sortDirOf(field)
    if (field === 'date') setSortKey(dir === 'desc' ? 'dateAsc' : 'dateDesc')
    else setSortKey(dir === 'desc' ? 'countAsc' : 'countDesc')
  }

  // 重置：搜索 + 账号 + 时间范围 + 排序，回到进页面时的默认（时间范围默认「今天」）
  const hasFilter = account !== '' || keyword !== '' || dateRange !== 'today' || sortKey !== 'dateDesc'
  const resetFilters = () => {
    setAccount('')
    setKeyword('')
    setDateRange('today')
    setSortKey('dateDesc')
  }

  const sampleMap = useMemo(() => Object.fromEntries((samples || []).map((s) => [s.id, s])), [samples])
  const records = useMemo(
    () => [...(publishRecords || [])].sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))),
    [publishRecords],
  )

  const bounds = dateBounds(dateRange)
  const groups = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const arr = records.filter((r) => {
      if (account && !(r.accounts || []).includes(account)) return false
      if (bounds) {
        const t = parseTs(r.publishDate)
        if (t === null || t < bounds[0] || t >= bounds[1]) return false
      }
      if (kw) {
        const sm = sampleMap[r.sampleId]
        if (!String(sm ? sm.name : '').toLowerCase().includes(kw)) return false
      }
      return true
    })
    // 一条记录可挂多个账号 → 按 (产品, 账号) 拆开各自成组（与手机版一致）
    const map = new Map()
    for (const r of arr) {
      const sm = sampleMap[r.sampleId]
      const name = sm ? sm.name : '（样品已删除）'
      const keyBase = r.sampleId || name
      const accs = (r.accounts && r.accounts.length) ? r.accounts : getAccounts(sm || {})
      const list = accs.length ? accs : ['']
      for (const a of list) {
        const k = `${keyBase}::${a}`
        if (!map.has(k)) map.set(k, { key: k, name, account: a, records: [] })
        map.get(k).records.push(r)
      }
    }
    const byDate = (a, b, dir) => {
      const A = String(a.dates[0] || ''), B = String(b.dates[0] || '')
      if (!A && !B) return 0
      if (!A) return 1
      if (!B) return -1
      return dir === 'asc' ? A.localeCompare(B) : B.localeCompare(A)
    }
    return [...map.values()]
      .map((g) => {
        const dates = [...new Set(g.records.map((r) => r.publishDate).filter(Boolean))].sort().reverse()
        const qty = g.records.reduce((s, r) => s + (Number(r.qty) > 0 ? Number(r.qty) : 1), 0)
        return { ...g, dates, qty, legacy: g.records.some((r) => r.legacy) }
      })
      .sort((a, b) => {
        // 次数排序与「发布次数」列同口径：用 qty（视频条数），不是记录条数
        if (sortKey === 'dateAsc') return byDate(a, b, 'asc') || (b.qty - a.qty)
        if (sortKey === 'countDesc') return (b.qty - a.qty) || byDate(a, b, 'desc')
        if (sortKey === 'countAsc') return (a.qty - b.qty) || byDate(a, b, 'desc')
        return byDate(a, b, 'desc') || (b.qty - a.qty)
      })
  }, [records, sampleMap, account, bounds, keyword, sortKey])

  const filteredCount = useMemo(
    () => new Set(groups.flatMap((g) => g.records.map((r) => r.id))).size,
    [groups],
  )

  const accountOptions = useMemo(() => {
    const set = new Set()
    for (const r of records) for (const a of (r.accounts || [])) set.add(a)
    return [...set]
  }, [records])

  // 按日期删（一条记录挂多账号时按 id 去重）
  const doDeleteDate = () => {
    if (!delTarget) return
    const { group, date } = delTarget
    const ids = [...new Set(group.records.filter((r) => r.publishDate === date).map((r) => r.id))]
    ids.forEach((id) => deletePublishRecord(id))
    show(ids.length > 1 ? `已删除 ${date} 的 ${ids.length} 条发布记录` : `已删除 ${date} 的发布记录`, 'success')
    setDelTarget(null)
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">视频发布记录</div>
          <div className="pcv-sub">{filteredCount} 条记录 · {groups.length} 个「产品 × 账号」分组</div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 200 }}
          placeholder="搜索产品名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {/* 主操作贴最右（用户要求）：搜索框留在云备份按钮旁边，
            用 marginLeft:auto 把「记录发布」推到整行右端 */}
        <button className="pcv-btn" style={{ marginLeft: 'auto' }} onClick={() => setPublishDialog({})}>记录发布</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none', flexWrap: 'wrap' }}>
          {RANGES.map((r) => (
            <button key={r.key} className={dateRange === r.key ? 'on' : ''} onClick={() => setDateRange(r.key)}>{r.label}</button>
          ))}
          <input
            type="date"
            className="pcv-input"
            style={{ padding: '4px 8px' }}
            onChange={(e) => setDateRange(e.target.value ? `day:${e.target.value}` : '')}
          />
        </div>

        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <button className={account === '' ? 'on' : ''} onClick={() => setAccount('')}>全部账号</button>
          {accountOptions.map((a) => (
            <button key={a} className={account === a ? 'on' : ''} onClick={() => setAccount(a)}>{a}</button>
          ))}
          <ResetButton active={hasFilter} onClick={resetFilters} />
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                {/* 排序入口统一为「点表头」（与样品页、出单页、收支页一致）：
                    「发布日期」点一下切升/降序，「发布次数」点一下按次数排。 */}
                <th style={{ width: 260 }}>产品</th>
                <th style={{ width: 150 }}>账号</th>
                <th style={{ width: 420 }} className="pcv-th-sort" onClick={() => toggleSort('date')}>
                  发布日期{sortDirOf('date') ? (sortDirOf('date') === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
                <th className="pcv-th-sort" onClick={() => toggleSort('count')}>
                  发布次数{sortDirOf('count') ? (sortDirOf('count') === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="pcv-empty">当前筛选下暂无记录</td>
                </tr>
              ) : groups.map((g) => {
                const open = expanded === g.key
                const dates = open ? g.dates : g.dates.slice(0, 1)
                return (
                  <tr key={g.key}>
                    <td>
                      <span className="pcv-namecell">
                        {/* 产品名后不再挂「×N」徽标：右侧「发布次数」列已经显示同一条数，
                            两个数字并排反而让人以为口径不同（用户反馈「为什么不一样」） */}
                        <span className="pcv-nametext" title={g.name}>{g.name}</span>
                      </span>
                    </td>
                    <td>
                      {g.account ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {/* 账号名不标账号主题色 —— 与样品页同样的偏好（用户要求「账号不要标记颜色」） */}
                          <span style={{ color: '#333a45' }}>{g.account}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#9aa0a9' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {dates.map((d) => (
                          <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {/* 日期胶囊可点：点开「修改发布日期」（用户要求能改发布时间）；
                                字号 13，和正文一致后不再显得像附注 */}
                            <button
                              className="pcv-chip"
                              title="点击修改发布日期"
                              style={{
                                background: '#f5f6f8', color: '#4b5563', fontSize: 13,
                                border: 'none', cursor: 'pointer',
                              }}
                              onClick={() => openDateEdit(g, d)}
                            >{d}</button>
                            <button
                              className="pcv-x"
                              title={`删除 ${d} 的发布记录`}
                              onClick={() => setDelTarget({ group: g, date: d })}
                            >×</button>
                          </span>
                        ))}
                        {g.dates.length > 1 && (
                          // 折叠时只显示第一个日期，后面用一个**箭头**展开其余日期
                          // （用户要求「点击箭头查看更多」；原来是一段「还有 N 个日期」的文字按钮）
                          // ⚠️ 箭头用 SVG 不用 ▾/▴ 字符：字符在不同字体环境下可能缺字形（无头环境实测渲染成小点）
                          <button
                            className="pcv-btn-text"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}
                            title={open ? '收起' : `展开另外 ${g.dates.length - 1} 个日期`}
                            onClick={() => setExpanded(open ? '' : g.key)}
                          >
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                            <span style={{ fontSize: 11 }}>{g.dates.length - 1}</span>
                          </button>
                        )}
                      </span>
                    </td>
                    {/* 发布次数 = 该「产品 × 账号」下**视频条数总和**（qty 累加），
                        不是记录条数 —— 一条记录可以记 2 条发布（qty=2），
                        之前这里显示 records.length，才会出现「×2 但发布次数 1」的矛盾。 */}
                    <td className="pcv-num">{g.qty}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDeleteDate}
        title="删除发布记录"
        message={delTarget ? `确定删除 ${delTarget.date} 的发布记录吗？此操作不可撤销。` : ''}
      />

      {/* 修改发布日期：点日期胶囊打开 */}
      {dateEdit && (
        <div className="pcv-overlay" onClick={() => setDateEdit(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>修改发布日期</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setDateEdit(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              <div className="pcv-field-label">产品 / 账号</div>
              <div style={{ fontSize: 13, color: '#333a45', marginBottom: 14 }}>
                {dateEdit.group.name}{dateEdit.group.account ? ` · ${dateEdit.group.account}` : ''}
              </div>
              <div className="pcv-field-label">发布日期</div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') saveDateEdit() }}
              />
              <div style={{ fontSize: 11, color: '#9aa0a9', marginTop: 8, lineHeight: 1.6 }}>
                只改发布日期，发布数量与账号不变；同一天的多条记录会一起改。
              </div>
            </div>
            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setDateEdit(null)}>取消</button>
              <button className="pcv-btn" onClick={saveDateEdit} disabled={!dateDraft}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 记录发布：弹窗，不跳页面 */}
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
