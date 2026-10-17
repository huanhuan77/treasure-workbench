import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { ACCOUNT_COLOR, getAccounts } from '../../utils/accounts'
import { dateBounds } from '../../components/DateFilterBar'
import { PublishDialog } from '../components/PublishDialog'

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

// 排序：日期一个按钮（点一下切升降序）、发布最多一个按钮。
// 原来是「日期↓、日期↑、发布最多」三个，用户要求把日期那对合并成一个（与出单页一致）。
const SORTS = [
  { key: 'countDesc', label: '发布最多' },
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
  const { publishRecords, samples, deletePublishRecord } = useStore()
  const [account, setAccount] = useState('')
  const [dateRange, setDateRange] = useState('today') // 与手机版同默认值
  const [keyword, setKeyword] = useState('')
  const [sortKey, setSortKey] = useState('dateDesc')
  const [expanded, setExpanded] = useState('')
  const [delTarget, setDelTarget] = useState(null)
  // 记录发布弹窗：undefined=关闭、对象=打开（可带预填）
  const [publishDialog, setPublishDialog] = useState(undefined)

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
        if (sortKey === 'dateAsc') return byDate(a, b, 'asc') || (b.records.length - a.records.length)
        if (sortKey === 'countDesc') return (b.records.length - a.records.length) || byDate(a, b, 'desc')
        return byDate(a, b, 'desc') || (b.records.length - a.records.length)
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
        <button className="pcv-btn" onClick={() => setPublishDialog({})}>记录发布</button>
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
          {/* 排序组紧靠账号筛选右边，不再用 spacer 顶到最右（与样品页统一） */}
          <div className="pcv-sortgrp">
            <button
              className={sortKey === 'dateDesc' || sortKey === 'dateAsc' ? 'on' : ''}
              onClick={() => setSortKey((k) => (k === 'dateDesc' ? 'dateAsc' : 'dateDesc'))}
            >日期 {sortKey === 'dateAsc' ? '↑' : '↓'}</button>
            {SORTS.map((s) => (
              <button key={s.key} className={sortKey === s.key ? 'on' : ''} onClick={() => setSortKey(s.key)}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 260 }}>产品</th>
                <th style={{ width: 150 }}>账号</th>
                <th style={{ width: 420 }}>发布日期</th>
                <th>发布次数</th>
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
                        <span className="pcv-nametext" title={g.name}>{g.name}</span>
                        {g.qty > 1 && <span className="pcv-chip" style={{ background: '#f3f4f6', color: '#6b7280' }}>×{g.qty}</span>}
                      </span>
                    </td>
                    <td>
                      {g.account ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {/* 账号名本身带账号主题色（去掉原来的小圆点） */}
                          <span style={{ color: (ACCOUNT_COLOR[g.account] || {}).c || '#4b5563', fontWeight: 600 }}>{g.account}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#9aa0a9' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {dates.map((d) => (
                          <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span className="pcv-chip" style={{ background: '#f5f6f8', color: '#6b7280' }}>{d}</span>
                            <button
                              className="pcv-x"
                              title={`删除 ${d} 的发布记录`}
                              onClick={() => setDelTarget({ group: g, date: d })}
                            >×</button>
                          </span>
                        ))}
                        {g.dates.length > 1 && (
                          <button className="pcv-btn-text" onClick={() => setExpanded(open ? '' : g.key)}>
                            {open ? '收起' : `还有 ${g.dates.length - 1} 个日期`}
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="pcv-num">{g.records.length}</td>
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
