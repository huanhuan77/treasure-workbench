import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, hasAccount } from '../../utils/accounts'
import { CATEGORIES } from '../../utils/categories'
import { isSelectableForOrder } from '../../utils/publish'
import { AccountTabs } from './AccountTabs'

// PC 版「记出单」弹窗（新增）。
//
// 交互照手机版 NewOrderPage：**账号 Tab 切换，每个账号下独立加产品，
// 保存时一次性把所有账号的条目都写进去** —— 用户要求「可以同时记录多个账号」。
// 原来 PC 用的是手机版的 OrderFormModal：账号是一排单选 pill，一次只能记一个账号。
//
// 只负责**新增**。编辑单笔出单仍走 OrderFormModal：
// 一条出单记录只属于一个账号，编辑场景没有「多账号」这回事，不需要 tab。
// prefill 可传 { account, sampleId }，用于「继续新增一单」。
export function OrderDialog({ prefill, onClose }) {
  const { samples, addOrder } = useStore()
  const { show } = useToast()

  const initAcc = prefill?.account || ACCOUNTS[0]
  const [account, setAccount] = useState(initAcc)
  // 出单日期默认「昨天」：出单基本都是事后补记，写当天十有八九要改（用户要求）
  const [date, setDate] = useState(() => {
    if (prefill?.date) return prefill.date
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  // 每个账号独立的条目：{ [account]: [{ sampleId }] }
  const [byAcc, setByAcc] = useState(() => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = []
    if (prefill?.sampleId) o[initAcc] = [{ sampleId: prefill.sampleId }]
    return o
  })
  const [pickIdx, setPickIdx] = useState(-1)   // 正在为第几行选样品；-1 = 面板收起
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('')   // 选样面板里的分类筛选，'' = 全部

  const entries = byAcc[account] || []

  // 先选账号 → 该账号下「已发布」的样品才可出单（与手机版同口径）
  const candidates = useMemo(
    () => (samples || []).filter((s) => isSelectableForOrder(s.status) && hasAccount(s, account)),
    [samples, account],
  )

  // 分类选项：只列该账号候选样品里真实出现过的分类（按全局 CATEGORIES 排序）
  const catOptions = useMemo(() => {
    const set = new Set()
    for (const s of candidates) if (s.category) set.add(s.category)
    return [...set].sort((a, b) => {
      const ia = CATEGORIES.indexOf(a), ib = CATEGORIES.indexOf(b)
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, 'zh')
    })
  }, [candidates])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    // 已勾选的样品**仍然列出来并打钩**（用户要求「勾选多个打钩，不是消失」），
    // 不再把它们从列表里剔掉 —— 再点一次就是取消勾选
    return candidates
      .filter((s) => !catFilter || s.category === catFilter)
      .filter((s) => !q || (s.name || '').toLowerCase().includes(q))
  }, [candidates, query, catFilter])

  const counts = useMemo(() => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = (byAcc[a] || []).filter((e) => e.sampleId).length
    return o
  }, [byAcc])

  const setEntries = (fn) => setByAcc((prev) => ({ ...prev, [account]: fn(prev[account] || []) }))
  const addEntry = () => {
    setEntries((p) => [...p, { sampleId: '' }])
    setQuery('')
    setPickIdx(entries.length)   // 新加的那行直接展开选择面板
  }
  const removeEntry = (i) => {
    setEntries((p) => p.filter((_, k) => k !== i))
    if (pickIdx === i) setPickIdx(-1)
    else if (pickIdx > i) setPickIdx(pickIdx - 1)
  }
  // 从标签框里移除某个已选样品（× 按钮）
  const removeSample = (sid) => setEntries((p) => p.filter((e) => e.sampleId !== sid))
  // 选样品：**点一下=勾选，再点=取消**（用户要求「勾选多个打钩，不是消失」）——
  // 勾上就立刻占一条（当前行空着就填当前行，否则再加一行），
  // 列表里保持打钩可见，账号 tab 的条数实时跟着变，不需要点「确定」。
  const pickSample = (sid) => {
    const exists = entries.some((e) => e.sampleId === sid)
    if (exists) {
      setEntries((p) => p.filter((e) => e.sampleId !== sid))
    } else {
      setEntries((p) => {
        const next = [...p]
        if (pickIdx >= 0 && pickIdx < next.length && !next[pickIdx].sampleId) {
          next[pickIdx] = { ...(next[pickIdx] || {}), sampleId: sid }
        } else {
          next.push({ sampleId: sid })
        }
        return next
      })
    }
    // 勾选后**保留分类筛选和搜索词**（用户反馈「点击筛选，选择之后又回到了全部」）：
    // 连续挑同一个分类下的多个产品时不用每次重新点分类
  }

  const total = useMemo(
    () => ACCOUNTS.reduce((n, a) => n + (byAcc[a] || []).filter((e) => e.sampleId).length, 0),
    [byAcc],
  )

  const nameOf = (sid) => (samples || []).find((s) => s.id === sid)?.name || ''

  const save = () => {
    if (total === 0) { show('请至少选 1 个产品', 'error'); return }
    let n = 0
    for (const a of ACCOUNTS) {
      for (const e of (byAcc[a] || []).filter((x) => x.sampleId)) {
        const sm = (samples || []).find((s) => s.id === e.sampleId)
        addOrder({
          name: (sm?.name || '').trim(),
          date,
          account: a,
          sampleId: e.sampleId,
          productId: sm?.productId || '',
          qty: 1,
          remark: '',
        })
        n++
      }
    }
    show(n > 1 ? `已记 ${n} 条出单` : '已记一笔出单', 'success')
    onClose()
  }

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog pcv-dialog--tall" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span>记出单</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>
            切账号分别填，保存时一次记完
          </span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          <div className="pcv-field-label">出单日期</div>
          <input
            className="pcv-input"
            style={{ width: 180 }}
            type="date"
            value={date}
            onChange={(e) => { if (e.target.value) setDate(e.target.value) }}
          />

          <div className="pcv-field-label" style={{ marginTop: 18 }}>账号</div>
          <AccountTabs value={account} onChange={(a) => { setAccount(a); setPickIdx(-1); setQuery(''); setCatFilter('') }} counts={counts} />

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
            <span className="pcv-field-label" style={{ margin: 0 }}>关联产品（可多选）</span>
            <div className="pcv-spacer" />
            <button className="pcv-btn pcv-btn-ghost" onClick={addEntry}>＋ 添加</button>
          </div>
          <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 6 }}>只能选「{account}」已发布的样品</div>

          <div className="pcv-entrylist">
            {/* 多选标签框（用户要求「改成这种」：已选产品是可删除的标签，点框展开选样面板） */}
            <div
              className="pcv-tagbox"
              onClick={() => { if (pickIdx < 0) { setPickIdx(0); setQuery('') } }}
            >
              {entries.filter((e) => e.sampleId).map((e) => (
                <span key={e.sampleId} className="pcv-tag">
                  {nameOf(e.sampleId)}
                  <button
                    type="button"
                    title="移除这条"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      removeSample(e.sampleId)
                    }}
                  >×</button>
                </span>
              ))}
              {entries.filter((e) => e.sampleId).length === 0 && (
                <span className="pcv-tagbox-hint">点击选择产品</span>
              )}
              <span className="pcv-tagbox-caret">▾</span>
            </div>

            {/* 样品选择面板：内联展开在标签框下面（勾选即生效，再点取消） */}
            {pickIdx >= 0 && (
                  <div className="pcv-drop">
                    {/* 分类筛选：只列当前账号候选样品里出现过的分类，一个分类都没有时整行不显示 */}
                    {catOptions.length > 1 && (
                      <div className="pcv-catfilter">
                        <button className={catFilter === '' ? 'on' : ''} onClick={() => setCatFilter('')}>全部</button>
                        {catOptions.map((c) => (
                          <button key={c} className={catFilter === c ? 'on' : ''} onClick={() => setCatFilter(c)}>{c}</button>
                        ))}
                      </div>
                    )}
                    <input
                      className="pcv-input"
                      style={{ width: '100%' }}
                      placeholder="搜索样品名称…"
                      value={query}
                      onChange={(ev) => setQuery(ev.target.value)}
                      autoFocus
                    />
                    <div className="pcv-drop-list">
                      {candidates.length === 0 ? (
                        <div className="pcv-drop-hint">该账号下暂无可出单的样品（需已发布）</div>
                      ) : filtered.length === 0 ? (
                        <div className="pcv-drop-hint">没有匹配的样品</div>
                      ) : filtered.map((s) => {
                        const on = entries.some((e) => e.sampleId === s.id)
                        return (
                          <button
                            key={s.id}
                            className={`pcv-drop-row${on ? ' on' : ''}`}
                            title={on ? '已勾选，再点一下取消' : '点一下勾选（可多选）'}
                            onClick={() => pickSample(s.id)}
                          >
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                            {on && <span className="pcv-drop-check">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                    {/* 底部：只作提示 + 收起（勾选即生效，不需要再点确定） */}
                    <div className="pcv-drop-f">
                      <span style={{ fontSize: 12, color: entries.some((e) => e.sampleId) ? '#b8517f' : '#9aa0a9' }}>
                        {entries.filter((e) => e.sampleId).length > 0
                          ? `已勾选 ${entries.filter((e) => e.sampleId).length} 条（再点一次取消）`
                          : '点一下勾选，可多选'}
                      </span>
                      <div className="pcv-spacer" />
                      <button
                        className="pcv-btn pcv-btn-ghost"
                        onClick={() => { setPickIdx(-1); setQuery(''); setCatFilter('') }}
                      >收起</button>
                    </div>
              </div>
            )}
          </div>
        </div>

        <div className="pcv-dialog-f">
          <span style={{ fontSize: 12, color: '#9aa0a9' }}>
            {total > 0 ? `共 ${total} 条（${ACCOUNTS.filter((a) => counts[a] > 0).map((a) => `${a} ${counts[a]}`).join('、')}）` : '还没有条目'}
          </span>
          <div className="pcv-spacer" />
          <button className="pcv-btn pcv-btn-ghost" onClick={onClose}>取消</button>
          <button className="pcv-btn" style={{ marginLeft: 10 }} onClick={save} disabled={total === 0}>
            保存{total > 1 ? ` ${total} 条` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
