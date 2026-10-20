import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNT_COLOR, getAccounts } from '../../utils/accounts'
import { getCounts, hasPublished, isArchivedSample } from '../../utils/sampleStatus'

// 总览「待投流」卡片（对齐手机端 DashboardPage 的那个板块）：
//   · 数据：store 的 adQueue / addAdQueue / updateAdQueue / deleteAdQueue
//   · 添加：从「已发布」样品里挑（样品 × 账号），带出该账号最近一次发布时间与条数
//   · 状态：未投流 / 已投流 / 暂停，行内下拉即改
const AD_STATUSES = ['未投流', '已投流', '暂停']
const AD_STATUS_COLOR = {
  '未投流': { c: '#b45309', bg: '#fef3c7' },
  '已投流': { c: '#059669', bg: '#d1fae5' },
  '暂停': { c: '#6b7280', bg: '#f3f4f6' },
}

export function AdQueueCard() {
  const { samples, adQueue, addAdQueue, updateAdQueue, deleteAdQueue } = useStore()
  const { show } = useToast()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const list = adQueue || []
  const pendingCount = list.filter((a) => a.status === '未投流').length

  // 可作为待投流的候选：已发布（至少一条视频）的 样品 × 账号
  const options = useMemo(() => {
    const out = []
    for (const s of samples || []) {
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
    return out.sort((x, y) => (y.publishDate || '').localeCompare(x.publishDate || ''))
  }, [samples])

  const filtered = useMemo(() => {
    const kw = search.trim()
    if (!kw) return options
    return options.filter((o) => o.name.includes(kw) || o.account.includes(kw))
  }, [options, search])

  const add = (o) => {
    addAdQueue({
      sampleId: o.sampleId,
      name: o.name,
      account: o.account,
      publishDate: o.publishDate,
      status: '未投流',
    })
    setPickerOpen(false)
    setSearch('')
    show('已加入待投流', 'success')
  }

  return (
    <>
      <div className="pcv-card">
        <div className="pcv-card-h">
          <span>待投流</span>
          {list.length > 0 && (
            <span className="pcv-chip" style={{ background: '#fef3c7', color: '#b45309' }}>{pendingCount} 待投</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>共 {list.length} 条</span>
          {/* 「＋ 添加」紧跟标题（用户要求）：与上面「待办清单」卡头的「新增」同一位置，
              原来用 spacer 顶到最右端，中间空出一大片 */}
          <button
            className="pcv-metric-add"
            style={{ marginLeft: 2 }}
            title="从已发布视频里挑一条加入待投流"
            onClick={() => { setSearch(''); setPickerOpen(true) }}
          >新增</button>
          <div className="pcv-spacer" />
        </div>

        {list.length === 0 ? (
          <div className="pcv-empty">还没有待投流，点右上角「＋ 添加」从已发布视频里挑</div>
        ) : (
          <table className="pcv-table pcv-table--inset">
            <thead>
              <tr>
                <th style={{ width: 240 }}>产品</th>
                <th style={{ width: 170 }}>账号</th>
                <th style={{ width: 140 }}>发布日期</th>
                <th style={{ width: 130 }}>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const col = ACCOUNT_COLOR[a.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
                const st = AD_STATUS_COLOR[a.status] || AD_STATUS_COLOR['未投流']
                return (
                  <tr key={a.id}>
                    <td className="pcv-name" title={a.name}>{a.name}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.c, flexShrink: 0 }} />
                        <span style={{ color: '#333a45' }}>{a.account}</span>
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{a.publishDate || '—'}</td>
                    <td>
                      {/* 行内下拉即改状态：选完立刻写库，不用另开弹窗 */}
                      <select
                        className="pcv-input"
                        value={a.status}
                        onChange={(e) => updateAdQueue(a.id, { status: e.target.value })}
                        style={{
                          padding: '3px 8px', fontSize: 12, fontWeight: 600,
                          border: `0.5px solid ${st.c}`, background: st.bg, color: st.c, cursor: 'pointer',
                        }}
                      >
                        {AD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        className="pcv-btn-text"
                        style={{ color: '#b96a66' }}
                        onClick={() => { deleteAdQueue(a.id); show('已删除', 'success') }}
                      >删除</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 选择弹窗：列出「已发布 样品 × 账号」 */}
      {pickerOpen && (
        <div className="pcv-overlay" onClick={() => setPickerOpen(false)}>
          <div className="pcv-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>选择要投流的视频</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>共 {options.length} 个候选</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setPickerOpen(false)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              <input
                className="pcv-input"
                style={{ width: '100%', marginBottom: 8 }}
                placeholder="搜索产品名或账号…"
                value={search}
                autoFocus
                onChange={(e) => setSearch(e.target.value)}
              />
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div className="pcv-empty" style={{ padding: '26px 0' }}>没有匹配的已发布视频</div>
                ) : filtered.map((o, i) => {
                  const col = ACCOUNT_COLOR[o.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
                  return (
                    <button
                      key={`${o.sampleId}_${o.account}_${i}`}
                      onClick={() => add(o)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                        padding: '9px 8px', border: 'none', borderBottom: '0.5px solid rgba(15,23,42,0.06)',
                        background: 'transparent', cursor: 'pointer',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#333a45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.name}
                      </span>
                      <span className="pcv-chip" style={{ background: col.bg, color: col.c, flexShrink: 0 }}>{o.account}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                        {o.publishDate || '未填日期'} · 共 {o.publishCount} 条
                      </span>
                      <span style={{ color: '#b8517f', fontSize: 15, flexShrink: 0 }}>＋</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="pcv-dialog-f">
              <span style={{ fontSize: 11, color: '#9aa0a9' }}>只列已发布过的样品；点一条即加入待投流</span>
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setPickerOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
