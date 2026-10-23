import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, hasAccount } from '../../utils/accounts'
import { CATEGORIES } from '../../utils/categories'
import { isSelectableForOrder } from '../../utils/publish'
import { AccountTabs } from './AccountTabs'

// PC 版「记出单 / 编辑出单」弹窗。
//
// 交互照手机版 NewOrderPage：**账号 Tab 切换，每个账号下独立加产品，
// 保存时一次性把所有账号的条目都写进去** —— 用户要求「可以同时记录多个账号」。
//
// editing 传一条出单记录 → 进入编辑模式（只保留这一条，保存走 updateOrder）。
// 编辑也用这个 PC 弹窗，不再复用手机版 OrderFormModal（用户反馈「怎么变成了手机弹窗」）。
// prefill 可传 { account, sampleId }，用于「继续新增一单」。
export function OrderDialog({ prefill, onClose, editing }) {
  const { samples, addOrder, updateOrder } = useStore()
  const { show } = useToast()
  const isEditing = !!editing

  const initAcc = editing?.account || prefill?.account || ACCOUNTS[0]
  const [account, setAccount] = useState(initAcc)
  // 出单日期默认「昨天」：出单基本都是事后补记，写当天十有八九要改（用户要求）
  const [date, setDate] = useState(() => {
    if (editing?.date) return editing.date
    if (prefill?.date) return prefill.date
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  // 备注（编辑时可改；新增时也允许填）
  const [remark, setRemark] = useState(editing?.remark || '')
  // 每个账号独立的条目：{ [account]: [{ sampleId, qty }] }
  const [byAcc, setByAcc] = useState(() => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = []
    const sid = editing?.sampleId || prefill?.sampleId
    if (sid) o[initAcc] = [{ sampleId: sid, qty: String(Math.max(1, Number(editing?.qty) || 1)) }]
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
    setEntries((p) => [...p, { sampleId: '', qty: '1' }])
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
  // 出单数量加减（行内 − N ＋）
  const bumpQty = (idx, delta) => setEntries((p) => p.map((e, i) => (
    i === idx ? { ...e, qty: String(Math.max(1, (Number(e.qty) || 1) + delta)) } : e
  )))
  // 直接输入数量（用户要求「可以输入数字」）：只留数字、清空时允许临时为空，失焦后兜底回 1
  const setQty = (idx, v) => setEntries((p) => p.map((e, i) => (i === idx ? { ...e, qty: v } : e)))
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
          next[pickIdx] = { ...(next[pickIdx] || { qty: '1' }), sampleId: sid, qty: next[pickIdx]?.qty || '1' }
        } else {
          next.push({ sampleId: sid, qty: '1' })
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
    // 编辑：只改这一条（账号 / 日期 / 产品 / 数量 / 备注）
    if (isEditing) {
      const e = (byAcc[account] || []).find((x) => x.sampleId)
      const sm = (samples || []).find((s) => s.id === e?.sampleId)
      updateOrder(editing.id, {
        name: (sm?.name || editing.name || '').trim(),
        date,
        account,
        sampleId: e?.sampleId || editing.sampleId || '',
        productId: sm?.productId || editing.productId || '',
        qty: Math.max(1, Number(e?.qty) || 1),
        remark,
      })
      show('已保存', 'success')
      onClose()
      return
    }
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
          // 出单数量按条目里填的写（用户要求「出单填写出单数量」），默认 1
          qty: Math.max(1, Number(e.qty) || 1),
          remark,
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
          <span>{isEditing ? '编辑出单' : '记出单'}</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>
            {isEditing ? '改完点保存' : '切账号分别填，保存时一次记完'}
          </span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          {/* 出单日期 + 账号放同一行（用户要求「一行显示」，与总结页新建计划弹窗一致） */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div style={{ flexShrink: 0 }}>
              <div className="pcv-field-label">出单日期</div>
              <input
                className="pcv-input"
                style={{ width: 150 }}
                type="date"
                value={date}
                onChange={(e) => { if (e.target.value) setDate(e.target.value) }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pcv-field-label">账号</div>
              <AccountTabs value={account} onChange={(a) => { setAccount(a); setPickIdx(-1); setQuery(''); setCatFilter('') }} counts={counts} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
            <span className="pcv-field-label" style={{ margin: 0 }}>关联产品（可多选）</span>
            <div className="pcv-spacer" />
            {/* 编辑时只有这一条，不需要「＋ 添加」 */}
            {!isEditing && <button className="pcv-btn pcv-btn-ghost" onClick={addEntry}>＋ 添加</button>}
          </div>
          <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 6 }}>只能选「{account}」已发布的样品</div>

          <div className="pcv-entrylist">
            {/* 已选产品：每条一行（产品名在左、数量 − N ＋ 在右），点名称可展开选样面板
                —— 用户要求「改成图一那种」（整行 + 右侧数量加减） */}
            {entries.filter((e) => e.sampleId).length === 0 && (
              <button className="pcv-entry-empty" onClick={addEntry}>
                ＋ 点这里选择产品
              </button>
            )}
            {entries.filter((e) => e.sampleId).map((e) => {
              const idx = entries.findIndex((x) => x.sampleId === e.sampleId)
              return (
                <div key={e.sampleId} className="pcv-entry" style={{ marginBottom: 8 }}>
                  <button
                    className="pcv-entry-pick"
                    title="点一下换产品 / 继续多选"
                    onClick={() => { setPickIdx(pickIdx === 0 ? -1 : 0); setQuery('') }}
                  >{nameOf(e.sampleId)}</button>
                  <div className="pcv-qty">
                    <button type="button" title="减 1" onClick={() => bumpQty(idx, -1)}>−</button>
                    {/* 可直接键盘输入数量（原来 readOnly 只能点加减）；输入时显示原值，失焦兜底 1 */}
                    <input
                      value={e.qty}
                      inputMode="numeric"
                      title="直接输入数量"
                      onChange={(ev) => { const v = ev.target.value.replace(/[^\d]/g, '').slice(0, 4); setQty(idx, v) }}
                      onBlur={() => { if (!(Number(e.qty) > 0)) setQty(idx, '1') }}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') ev.currentTarget.blur() }}
                    />
                    <button type="button" title="加 1" onClick={() => bumpQty(idx, 1)}>＋</button>
                  </div>
                  <button
                    type="button"
                    className="pcv-x"
                    title="移除这条"
                    onClick={() => removeSample(e.sampleId)}
                  >×</button>
                </div>
              )
            })}

            {/* 样品选择面板：内联展开在标签框下面（勾选即生效，再点取消） */}
            {pickIdx >= 0 && (
                  <div className="pcv-drop">
                    {/* 分类筛选 + 收起按钮同一行（用户要求「收起放分类旁边」） */}
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
                        <div className="pcv-drop-hint">该账号下暂无可出单的样品（需已发布）</div>
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
                                {/* 出单数量：行内直接加减（用户要求「出单填写出单数量」） */}
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

          {/* 备注（选填）：编辑时能改原来的备注 */}
          <div className="pcv-field-label" style={{ marginTop: 14 }}>备注（选填）</div>
          <input
            className="pcv-input"
            style={{ width: '100%' }}
            placeholder="平台 / 链接 / 说明…"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
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
