import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, hasAccount } from '../../utils/accounts'
import { CATEGORIES } from '../../utils/categories'
import { isShotSample, isArchivedSample } from '../../utils/sampleStatus'
import { todayStr } from '../../utils/helpers'
import { AccountTabs } from './AccountTabs'

// PC 版「记录发布 / 补记发布」弹窗。
//
// 交互改照手机版 NewPublishRecordPage：**账号 Tab 切换，每个账号下独立加「样品 + 数量」行，
// 保存时一次性把所有账号的行都写进去** —— 用户要求「改成这种账号 tab 切换的、
// 可以同时记录多个账号」，和「记出单」统一。
// 原来这里是一排账号 chips 多选 + 只能选一个样品，一次只能给同一样品记几个账号。
//
// 落库字段照抄 NewPublishRecordPage.handleSave：
//   { sampleId, productId, accounts: [账号], publishDate, qty }
// prefill 可传 { sampleId, accounts }（样品页「补记发布」/ 总览「补记发布」用）。
// 与手机版一致：预填只把样品放进第一个账号的条目里。
export function PublishDialog({ sampleId: initSampleId = '', accounts: initAccounts = [], onClose }) {
  const { samples, addPublishRecord } = useStore()
  const { show } = useToast()

  const initAcc = (Array.isArray(initAccounts) && initAccounts[0]) || ACCOUNTS[0]
  const [publishDate, setPublishDate] = useState(todayStr())
  const [account, setAccount] = useState(initAcc)
  // 每个账号独立的条目：{ [account]: [{ sampleId, qty }] }
  const [byAcc, setByAcc] = useState(() => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = []
    if (initSampleId) o[initAcc] = [{ sampleId: initSampleId, qty: '1' }]
    return o
  })
  const [pickIdx, setPickIdx] = useState(-1)   // 正在为第几行选样品；-1 = 面板收起
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('')   // 选样面板里的分类筛选，'' = 全部

  const entries = byAcc[account] || []

  // 可选样品：已拍、未归档、且归属当前账号（与手机版同口径）。
  // 已经选中的样品即使不再满足条件也保留列出，免得切回来发现行是空的。
  const candidates = useMemo(() => {
    const all = samples || []
    const picked = new Set(entries.map((e) => e.sampleId).filter(Boolean))
    const base = all.filter((s) => !isArchivedSample(s) && isShotSample(s) && hasAccount(s, account))
    const extra = all.filter((s) => picked.has(s.id) && !base.some((b) => b.id === s.id))
    return [...extra, ...base]
  }, [samples, account, entries])

  // 分类选项：只列候选样品里真实出现过的分类（按全局 CATEGORIES 排序）
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
    // 再点一次就是取消勾选
    return candidates
      .filter((s) => !catFilter || s.category === catFilter)
      .filter((s) => !q || (s.name || '').toLowerCase().includes(q))
  }, [candidates, query, catFilter])

  const counts = useMemo(() => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = (byAcc[a] || []).filter((e) => e.sampleId && Number(e.qty) >= 1).length
    return o
  }, [byAcc])

  const setEntries = (fn) => setByAcc((prev) => ({ ...prev, [account]: fn(prev[account] || []) }))
  const addEntry = () => {
    setEntries((p) => [...p, { sampleId: '', qty: '1' }])
    setQuery('')
    setPickIdx(entries.length)   // 新加的那行直接展开选择面板
  }
  const removeEntry = (i) => {
    setEntries((p) => p.filter((_, k) => k !== i))
    if (pickIdx === i) setPickIdx(-1)
    else if (pickIdx > i) setPickIdx(pickIdx - 1)
  }
  // 选样品：**点一下=勾选，再点=取消**（用户要求「勾选多个打钩，不是消失」）——
  // 勾上就立刻占一条（当前行空着就填当前行，否则再加一行，数量默认 1），
  // 列表保持打钩可见，账号 tab 的条数实时跟着变，不需要点「确定」。
  const pickSample = (sid) => {
    const exists = entries.some((e) => e.sampleId === sid)
    if (exists) {
      setEntries((p) => p.filter((e) => e.sampleId !== sid))
    } else {
      setEntries((p) => {
        const next = [...p]
        if (pickIdx >= 0 && pickIdx < next.length && !next[pickIdx].sampleId) {
          next[pickIdx] = { ...(next[pickIdx] || { qty: '1' }), sampleId: sid }
        } else {
          next.push({ sampleId: sid, qty: '1' })
        }
        return next
      })
    }
    // 勾选后保留分类筛选与搜索词（与「记出单」一致：选完不会跳回「全部」）
  }

  const setQty = (idx, v) => setEntries((p) => p.map((e, k) => (k === idx ? { ...e, qty: v } : e)))
  // 加减必须用函数式更新：否则连点两下时，第二次仍拿渲染闭包里的旧 qty 计算，只加得动 1
  const bumpQty = (idx, delta) => setEntries((p) => p.map((e, k) => (
    k === idx ? { ...e, qty: String(Math.max(1, (Number(e.qty) || 1) + delta)) } : e
  )))

  const total = useMemo(
    () => ACCOUNTS.reduce((n, a) => n + (byAcc[a] || []).filter((e) => e.sampleId && Number(e.qty) >= 1).length, 0),
    [byAcc],
  )

  const nameOf = (sid) => (samples || []).find((s) => s.id === sid)?.name || ''

  const save = () => {
    if (total === 0) { show('请至少选择 1 个样品并填写数量', 'error'); return }
    let n = 0
    for (const a of ACCOUNTS) {
      for (const e of (byAcc[a] || []).filter((x) => x.sampleId && Number(x.qty) >= 1)) {
        const sm = (samples || []).find((s) => s.id === e.sampleId)
        addPublishRecord({
          sampleId: e.sampleId,
          productId: sm?.productId || '',
          accounts: [a],
          publishDate,
          qty: Math.max(1, Number(e.qty) || 1),
        })
        n++
      }
    }
    show(n > 1 ? `已记录 ${n} 条发布` : '已记录 1 条发布', 'success')
    onClose()
  }

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog pcv-dialog--lg pcv-dialog--tall" onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span>记录发布</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>
            切账号分别填，保存时一次记完
          </span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          {/* 发布日期 + 账号放同一行（用户要求「一行显示」，与记出单/新建计划一致） */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div style={{ flexShrink: 0 }}>
              <div className="pcv-field-label">发布日期</div>
              <input
                className="pcv-input"
                style={{ width: 150 }}
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pcv-field-label">账号</div>
              <AccountTabs value={account} onChange={(a) => { setAccount(a); setPickIdx(-1); setQuery(''); setCatFilter('') }} counts={counts} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
            <span className="pcv-field-label" style={{ margin: 0 }}>样品 &amp; 发布数量（可多选）</span>
            <div className="pcv-spacer" />
            <button className="pcv-btn pcv-btn-ghost" onClick={addEntry}>＋ 添加</button>
          </div>
          <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 6 }}>只能选「{account}」已拍的样品</div>

          <div className="pcv-entrylist">
            {/* 与「记出单」统一：已选样品是可删除的标签（带数量 ×N），点框展开选样面板 */}
            <div className="pcv-tagbox" onClick={() => { if (pickIdx < 0) { setPickIdx(0); setQuery('') } }}>
              {entries.filter((e) => e.sampleId).map((e) => {
                const idx = entries.findIndex((x) => x.sampleId === e.sampleId)
                const qty = Number(e.qty) > 0 ? Number(e.qty) : 1
                return (
                  <span key={e.sampleId} className="pcv-tag" onClick={(ev) => ev.stopPropagation()}>
                    <span className="pcv-tag-name">{nameOf(e.sampleId)}</span>
                    <span className="pcv-tag-qty">
                      <button type="button" title="减 1" onClick={(ev) => { ev.stopPropagation(); bumpQty(idx, -1) }}>−</button>
                      <span>{qty}</span>
                      <button type="button" title="加 1" onClick={(ev) => { ev.stopPropagation(); bumpQty(idx, 1) }}>＋</button>
                    </span>
                    <button
                      type="button"
                      title="移除这条"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        removeEntry(idx)
                      }}
                    >×</button>
                  </span>
                )
              })}
              {entries.filter((e) => e.sampleId).length === 0 && (
                <span className="pcv-tagbox-hint">点击选择样品</span>
              )}
              <span className="pcv-tagbox-caret">▾</span>
            </div>

            {/* 样品选择面板：勾选即生效，数量在行内直接加减 */}
            {pickIdx >= 0 && (
              <div className="pcv-drop">
                {/* 分类筛选：只列候选样品里出现过的分类，一个都没有时整行不显示 */}
                {/* 分类筛选 + 收起按钮同一行（与「记出单」一致） */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {catOptions.length > 1 ? (
                    <div className="pcv-catfilter" style={{ flex: 1, minWidth: 0 }}>
                      <button className={catFilter === '' ? 'on' : ''} onClick={() => setCatFilter('')}>全部</button>
                      {catOptions.map((c) => (
                        <button key={c} className={catFilter === c ? 'on' : ''} onClick={() => setCatFilter(c)}>{c}</button>
                      ))}
                    </div>
                  ) : <div style={{ flex: 1 }} />}
                  <button
                    className="pcv-btn pcv-btn-ghost"
                    style={{ flexShrink: 0, height: 26, padding: '0 10px', fontSize: 12 }}
                    onClick={() => { setPickIdx(-1); setQuery(''); setCatFilter('') }}
                  >收起</button>
                </div>
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
                    <div className="pcv-drop-hint">该账号下暂无可发布的样品（需已拍、未放弃）</div>
                  ) : filtered.length === 0 ? (
                    <div className="pcv-drop-hint">没有匹配的样品</div>
                  ) : filtered.map((s) => {
                    const idx = entries.findIndex((e) => e.sampleId === s.id)
                    const on = idx >= 0
                    const qty = on ? (Number(entries[idx].qty) > 0 ? Number(entries[idx].qty) : 1) : 1
                    return (
                      <div
                        key={s.id}
                        className={`pcv-drop-row${on ? ' on' : ''}`}
                        title={on ? '已勾选，再点一下取消' : '点一下勾选（可多选）'}
                        onClick={() => pickSample(s.id)}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                        {on && (
                          <>
                            {/* 数量直接在行内加减（不用回到上面那条目行） */}
                            <span
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <button type="button" className="pcv-qty-mini" onClick={() => bumpQty(idx, -1)}>−</button>
                              <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
                              <button type="button" className="pcv-qty-mini" onClick={() => bumpQty(idx, 1)}>＋</button>
                            </span>
                            <span className="pcv-drop-check">✓</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* 底部只留提示（「收起」已挪到分类行右侧） */}
                <div className="pcv-drop-f">
                  <span style={{ fontSize: 12, color: entries.some((e) => e.sampleId) ? '#b8517f' : '#9aa0a9' }}>
                    {entries.filter((e) => e.sampleId).length > 0
                      ? `已勾选 ${entries.filter((e) => e.sampleId).length} 条（再点一次取消）`
                      : '点一下勾选，可多选'}
                  </span>
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
