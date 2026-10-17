import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, hasAccount } from '../../utils/accounts'
import { isSelectableForOrder } from '../../utils/publish'
import { todayStr } from '../../utils/helpers'
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
  const [date, setDate] = useState(prefill?.date || todayStr())
  // 每个账号独立的条目：{ [account]: [{ sampleId }] }
  const [byAcc, setByAcc] = useState(() => {
    const o = {}
    for (const a of ACCOUNTS) o[a] = []
    if (prefill?.sampleId) o[initAcc] = [{ sampleId: prefill.sampleId }]
    return o
  })
  const [pickIdx, setPickIdx] = useState(-1)   // 正在为第几行选样品；-1 = 面板收起
  const [query, setQuery] = useState('')

  const entries = byAcc[account] || []

  // 先选账号 → 该账号下「已发布」的样品才可出单（与手机版同口径）
  const candidates = useMemo(
    () => (samples || []).filter((s) => isSelectableForOrder(s.status) && hasAccount(s, account)),
    [samples, account],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    // 别的行已经选过的样品不再重复列出（正在编辑的这行除外）
    const used = new Set(entries.map((e, i) => (i === pickIdx ? null : e.sampleId)).filter(Boolean))
    return candidates
      .filter((s) => !used.has(s.id))
      .filter((s) => !q || (s.name || '').toLowerCase().includes(q))
  }, [candidates, query, entries, pickIdx])

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
  const pickSample = (sid) => {
    setEntries((p) => p.map((e, k) => (k === pickIdx ? { ...e, sampleId: sid } : e)))
    setPickIdx(-1)
    setQuery('')
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
      <div className="pcv-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
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
          <AccountTabs value={account} onChange={(a) => { setAccount(a); setPickIdx(-1); setQuery('') }} counts={counts} />

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
            <span className="pcv-field-label" style={{ margin: 0 }}>关联产品（可多选）</span>
            <div className="pcv-spacer" />
            <button className="pcv-btn pcv-btn-ghost" onClick={addEntry}>＋ 添加</button>
          </div>
          <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 6 }}>只能选「{account}」已发布的样品</div>

          <div className="pcv-entrylist">
            {entries.length === 0 && (
              <div className="pcv-entry-empty">点上方「＋ 添加」新增一条产品</div>
            )}
            {entries.map((e, idx) => (
              <div key={idx}>
                <div className="pcv-entry">
                  <button
                    className={`pcv-entry-pick${e.sampleId ? '' : ' empty'}`}
                    onClick={() => { setPickIdx(pickIdx === idx ? -1 : idx); setQuery('') }}
                  >
                    {e.sampleId ? nameOf(e.sampleId) : '点击选择产品'}
                  </button>
                  <button className="pcv-x" title="删除该条" onClick={() => removeEntry(idx)}>×</button>
                </div>

                {/* 样品选择面板：内联展开在该行下面 */}
                {pickIdx === idx && (
                  <div className="pcv-drop">
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
                      ) : filtered.map((s) => (
                        <button
                          key={s.id}
                          className={`pcv-drop-row${e.sampleId === s.id ? ' on' : ''}`}
                          onClick={() => pickSample(s.id)}
                        >
                          {s.name}
                        </button>
                      ))}
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
          <button className="pcv-btn" onClick={save} disabled={total === 0}>
            保存{total > 1 ? ` ${total} 条` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
