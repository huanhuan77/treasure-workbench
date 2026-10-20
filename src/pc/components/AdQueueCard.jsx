import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../../utils/accounts'
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
  // 弹窗里按账号切换（用户要求）：'' = 全部账号
  const [pickAccount, setPickAccount] = useState('')
  // 弹窗里按**发布日期**筛候选：'' 全部 / today 今天 / yesterday 昨天 / week 近七天
  const [pickRange, setPickRange] = useState('')

  const list = adQueue || []
  const pendingCount = list.filter((a) => a.status === '未投流').length
  const doneCount = list.filter((a) => a.status === '已投流').length
  // 改成「已投流」= 从列表消失（用户要求「就像删除了一样，不需要了」）：
  // 不再提供「已投流 N」查看入口，也不需要找回来。底层数据保留（不会真删，
  // 免得误点后不可恢复），只是不再参与展示。
  const visible = list.filter((a) => a.status !== '已投流')
  const [flashId, setFlashId] = useState('')   // 刚加入的那条：滚动定位 + 高亮 4 秒

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

  // 候选里出现过的账号（按 ACCOUNTS 顺序，未在册的排后面）
  const accountOptions = useMemo(() => {
    const set = new Set(options.map((o) => o.account).filter(Boolean))
    return [...set].sort((x, y) => {
      const ix = ACCOUNTS.indexOf(x)
      const iy = ACCOUNTS.indexOf(y)
      return (ix === -1 ? 999 : ix) - (iy === -1 ? 999 : iy) || x.localeCompare(y, 'zh')
    })
  }, [options])

  const filtered = useMemo(() => {
    const kw = search.trim()
    let arr = options
    if (pickAccount) arr = arr.filter((o) => o.account === pickAccount)
    if (pickRange) {
      const p = (n) => String(n).padStart(2, '0')
      const fmt = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
      const today = fmt(new Date())
      const yesterday = fmt(new Date(Date.now() - 864e5))
      const weekFrom = fmt(new Date(Date.now() - 6 * 864e5))
      arr = arr.filter((o) => {
        const d = o.publishDate || ''
        if (!d) return false
        if (pickRange === 'today') return d === today
        if (pickRange === 'yesterday') return d === yesterday
        return d >= weekFrom   // 近七天（含今天）
      })
    }
    if (!kw) return arr
    return arr.filter((o) => o.name.includes(kw) || o.account.includes(kw))
  }, [options, search, pickAccount, pickRange])

  const add = (o) => {
    const id = addAdQueue({
      sampleId: o.sampleId,
      name: o.name,
      account: o.account,
      publishDate: o.publishDate,
      status: '未投流',
    })
    setPickerOpen(false)
    setSearch('')
    show(`已加入待投流：${o.name}`, 'success')
    // 新增后高亮并滚动到该行（避免「加了却看不到」）
    setFlashId(id || '')
  }

  useEffect(() => {
    if (!flashId) return
    const t = setTimeout(() => {
      const row = document.querySelector(`tr[data-ad-id="${flashId}"]`)
      if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 80)
    const t2 = setTimeout(() => setFlashId(''), 4000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [flashId])

  return (
    <>
      <div className="pcv-card">
        <div className="pcv-card-h">
          <span>待投流</span>
          {list.length > 0 && (
            <span className="pcv-chip" style={{ background: '#fef3c7', color: '#b45309' }}>{pendingCount} 待投</span>
          )}
          {/* 条数只算列表里看得到的（已投流的不算，否则「共 3 条」但只显示 2 行） */}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>共 {visible.length} 条</span>
          {/* 「＋ 添加」紧跟标题（用户要求）：与上面「待办清单」卡头的「新增」同一位置，
              原来用 spacer 顶到最右端，中间空出一大片 */}
          <button
            className="pcv-metric-add"
            style={{ marginLeft: 2 }}
            title="从已发布视频里挑一条加入待投流"
            onClick={() => { setSearch(''); setPickAccount(''); setPickRange(''); setPickerOpen(true) }}
          >新增</button>
          <div className="pcv-spacer" />
        </div>

        {visible.length === 0 ? (
          // 空态只占一行，与发布计划卡片一致，不把卡片撑高
          <div
            className="pcv-empty"
            style={{ padding: '13px 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {list.length === 0
              ? '还没有待投流，点「新增」从已发布视频里挑'
              : `待投流都已投完（已投流 ${doneCount} 条）`}
          </div>
        ) : (
          // 与「待办清单 / 发布计划」并排（各 1/3 宽），表格五列放不下 → 紧凑两行式：
          // 第一行 产品名 + 状态下拉，第二行 账号 · 发布日期 + 删除
          <div>
            {visible.map((a) => {
              const col = ACCOUNT_COLOR[a.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
              const st = AD_STATUS_COLOR[a.status] || AD_STATUS_COLOR['未投流']
              return (
                <div
                  key={a.id}
                  data-ad-id={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                    borderTop: '0.5px solid rgba(15,23,42,0.05)',
                    ...(flashId === a.id ? { background: '#fff7e6', transition: 'background .3s ease' } : null),
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      title={a.name}
                      style={{ fontSize: 14, color: '#333a45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >{a.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 12, color: '#94a3b8' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.c, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.account}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>· {a.publishDate || '—'}</span>
                    </div>
                  </div>
                  {/* 行内下拉即改状态：选完立刻写库 */}
                  <select
                    className="pcv-input"
                    value={a.status}
                    onChange={(e) => updateAdQueue(a.id, { status: e.target.value })}
                    title="修改状态（改成「已投流」后从列表消失）"
                    style={{
                      padding: '3px 6px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                      border: `0.5px solid ${st.c}`, background: st.bg, color: st.c, cursor: 'pointer',
                    }}
                  >
                    {AD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    className="pcv-x"
                    title="删除"
                    style={{ flexShrink: 0 }}
                    onClick={() => { deleteAdQueue(a.id); show('已删除', 'success') }}
                  >×</button>
                </div>
              )
            })}
          </div>
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
              {/* 账号切换：全部 + 候选里出现过的账号（用账号主题色描边，选中实底白字） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <button
                  onClick={() => setPickAccount('')}
                  style={{
                    padding: '4px 10px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                    fontSize: 12, fontWeight: 600,
                    border: pickAccount === '' ? 'none' : '1px solid rgba(15,23,42,0.14)',
                    background: pickAccount === '' ? '#b8517f' : '#fff',
                    color: pickAccount === '' ? '#fff' : '#6b7280',
                  }}
                >全部账号</button>
                {accountOptions.map((a) => {
                  const col = (ACCOUNT_COLOR[a] || {}).c || '#6b7280'
                  const on = pickAccount === a
                  return (
                    <button
                      key={a}
                      onClick={() => setPickAccount(on ? '' : a)}
                      style={{
                        padding: '4px 10px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                        fontSize: 12, fontWeight: 600,
                        border: on ? 'none' : `1px solid ${col}`,
                        background: on ? col : '#fff',
                        color: on ? '#fff' : col,
                      }}
                    >{a}</button>
                  )
                })}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa0a9' }}>
                  当前 {filtered.length} 个
                </span>
              </div>

              {/* 发布日期筛选（用户要求）：今天 / 昨天 / 近七天，只看这段时间发过的视频 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                {[
                  { k: '', l: '全部日期' },
                  { k: 'today', l: '今天' },
                  { k: 'yesterday', l: '昨天' },
                  { k: 'week', l: '近七天' },
                ].map((r) => {
                  const on = pickRange === r.k
                  return (
                    <button
                      key={r.k || 'all'}
                      onClick={() => setPickRange(r.k)}
                      style={{
                        padding: '4px 10px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                        fontSize: 12, fontWeight: 600,
                        border: on ? 'none' : '1px solid rgba(15,23,42,0.14)',
                        background: on ? '#b8517f' : '#fff',
                        color: on ? '#fff' : '#6b7280',
                      }}
                    >{r.l}</button>
                  )
                })}
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
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
