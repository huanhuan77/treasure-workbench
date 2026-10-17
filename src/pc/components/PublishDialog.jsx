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
  const [picked, setPicked] = useState([])         // 面板里临时勾选的样品 id（保留点击顺序）

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
    // 别的行已经选过的样品不再重复列出（正在编辑的这行除外）
    const used = new Set(entries.map((e, i) => (i === pickIdx ? null : e.sampleId)).filter(Boolean))
    return candidates
      .filter((s) => !used.has(s.id))
      .filter((s) => !catFilter || s.category === catFilter)
      .filter((s) => !q || (s.name || '').toLowerCase().includes(q))
  }, [candidates, query, entries, pickIdx, catFilter])

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
  // 多选：面板里点一行 = 勾/取消勾，按「确定」后一次性落地
  // （第一个填当前行，其余每个再起一行，数量默认 1）
  const togglePick = (sid) => setPicked((p) => (p.includes(sid) ? p.filter((x) => x !== sid) : [...p, sid]))
  const applyPicks = () => {
    const ids = picked.filter(Boolean)
    if (ids.length > 0) {
      setEntries((p) => {
        const next = [...p]
        next[pickIdx] = { ...(next[pickIdx] || { qty: '1' }), sampleId: ids[0] }
        for (const id of ids.slice(1)) next.push({ sampleId: id, qty: '1' })
        return next
      })
    }
    setPicked([])
    setPickIdx(-1)
    setQuery('')
    setCatFilter('')
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
          <div className="pcv-field-label">发布日期</div>
          <input
            className="pcv-input"
            style={{ width: 180 }}
            type="date"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
          />

          <div className="pcv-field-label" style={{ marginTop: 18 }}>账号</div>
          <AccountTabs value={account} onChange={(a) => { setAccount(a); setPickIdx(-1); setQuery(''); setCatFilter('') }} counts={counts} />

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
            <span className="pcv-field-label" style={{ margin: 0 }}>样品 &amp; 发布数量（可多选）</span>
            <div className="pcv-spacer" />
            <button className="pcv-btn pcv-btn-ghost" onClick={addEntry}>＋ 添加</button>
          </div>
          <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 6 }}>只能选「{account}」已拍的样品</div>

          <div className="pcv-entrylist">
            {/* 空态本身可点：直接新增一行并展开选样面板（用户要求「点击能新增」），
                不用再去找右上角那个「＋ 添加」 */}
            {entries.length === 0 && (
              <button className="pcv-entry-empty" onClick={addEntry}>
                ＋ 点这里新增一条「样品 + 数量」
              </button>
            )}
            {entries.map((e, idx) => (
              <div key={idx}>
                <div className="pcv-entry">
                  <button
                    className={`pcv-entry-pick${e.sampleId ? '' : ' empty'}`}
                    onClick={() => { setPickIdx(pickIdx === idx ? -1 : idx); setQuery(''); setPicked([]) }}
                  >
                    {e.sampleId ? nameOf(e.sampleId) : '点击选择样品'}
                  </button>
                  <div className="pcv-qty">
                    <button
                      type="button"
                      onClick={() => bumpQty(idx, -1)}
                    >−</button>
                    <input
                      type="number"
                      min="1"
                      value={e.qty}
                      onChange={(ev) => {
                        const n = parseInt(ev.target.value, 10)
                        setQty(idx, Number.isNaN(n) || n < 1 ? '' : String(n))
                      }}
                      onBlur={() => { if (!(Number(e.qty) >= 1)) setQty(idx, '1') }}
                    />
                    <button
                      type="button"
                      onClick={() => bumpQty(idx, 1)}
                    >＋</button>
                  </div>
                  <button className="pcv-x" title="删除该条" onClick={() => removeEntry(idx)}>×</button>
                </div>

                {/* 样品选择面板：内联展开在该行下面 */}
                {pickIdx === idx && (
                  <div className="pcv-drop">
                    {/* 分类筛选：只列候选样品里出现过的分类，一个都没有时整行不显示 */}
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
                        <div className="pcv-drop-hint">该账号下暂无可发布的样品（需已拍、未放弃）</div>
                      ) : filtered.length === 0 ? (
                        <div className="pcv-drop-hint">没有匹配的样品</div>
                      ) : filtered.map((s) => {
                        const on = picked.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            className={`pcv-drop-row${on ? ' on' : ''}`}
                            onClick={() => togglePick(s.id)}
                          >
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                            {on && <span className="pcv-drop-check">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                    {/* 多选确认条：勾完一次性落地（第一个填当前行，其余各起一行） */}
                    <div className="pcv-drop-f">
                      <span>已选 <b>{picked.length}</b> 个，可多选</span>
                      <div className="pcv-spacer" />
                      <button
                        className="pcv-btn pcv-btn-ghost"
                        onClick={() => { setPicked([]); setPickIdx(-1); setQuery(''); setCatFilter('') }}
                      >取消</button>
                      <button className="pcv-btn" disabled={picked.length === 0} onClick={applyPicks}>
                        确定{picked.length > 1 ? `（${picked.length}）` : ''}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
