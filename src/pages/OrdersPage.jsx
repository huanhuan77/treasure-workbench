import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { OrderFormModal } from '../components/OrderFormModal'
import { ConfirmModal } from '../components/Modal'
import { ACCOUNTS, ACCOUNT_COLOR } from '../utils/accounts'
import { ProductOrdersSheet } from '../components/ProductOrdersSheet'
import { DraggableFab } from '../components/DraggableFab'
import { DateFilterBar, dateBounds } from '../components/DateFilterBar'


// 把 YYYY/MM/DD 或 YYYY-MM-DD 解析成可排序时间戳
function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
// 统一显示出单数量：X 单
const fmtQty = (q) => (q && q > 1 ? `${q}单` : '1单')
// 显示日期（可能为空则"未填日期"）
function dispDate(v) {
  if (!v) return '未填日期'
  return String(v).replace(/-/g, '/')
}

// 排序按钮样式（与 DateFilterBar 的 SortChips 一致）
const sortChipStyle = (sel) => ({
  flex: '0 0 auto', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  border: sel ? 'none' : '1px solid rgba(244,114,182,0.35)',
  background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
  color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer', whiteSpace: 'nowrap',
})

function PageHeader({ title, onBack, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(244,114,182,0.12)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.12)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', flex: 1 }}>{title}</h1>
      {right}
    </div>
  )
}

export function OrdersPage() {
  const navigate = useNavigate()
  const { orders, addOrder, updateOrder, deleteOrder } = useStore()
  const { show } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)   // null=新增
  const [formSeq, setFormSeq] = useState(0)      // 每次打开自增，作 key 强制重建表单以清空上次输入
  const [accountFilter, setAccountFilter] = useState('')  // ''=全部
  const [dateRange, setDateRange] = useState('')  // ''=全部 / today|yesterday|last7|thisWeek|thisMonth|lastMonth|halfYear|thisYear / day:YYYY-MM-DD
  const [sortKey, setSortKey] = useState('dateDesc')  // dateDesc | dateAsc | mostDesc(出单最多) | mostAsc(出单最少)
  const [productFilter, setProductFilter] = useState('')  // ''=全部产品
  const [dateDelTarget, setDateDelTarget] = useState(null)  // { name, date, entries } —— 按日期删该产品当天的出单

  const list = useMemo(() => {
    // 排序：无日期的排最后，其余按日期新→旧
    return [...(orders || [])].sort((a, b) => {
      const ta = parseTs(a?.date), tb = parseTs(b?.date)
      if (ta !== null && tb !== null) return tb - ta
      if (ta === null && tb === null) return 0
      return ta === null ? 1 : -1
    })
  }, [orders])

  // 时间筛选（统一由 DateFilterBar 给出区间） + 账号筛选
  const filtered = useMemo(() => {
    let arr = list
    if (accountFilter) arr = arr.filter((o) => o.account === accountFilter)
    if (productFilter) arr = arr.filter((o) => (o.name || '') === productFilter)
    const bounds = dateBounds(dateRange)
    if (bounds) {
      const [s, e] = bounds
      arr = arr.filter((o) => {
        const t = parseTs(o?.date)
        return t !== null && t >= s && t < e
      })
    }
    return arr
  }, [list, accountFilter, productFilter, dateRange])

  // 汇总：跟着 range+accountFilter 走
  const summary = useMemo(() => {
    const totalEntries = filtered.length
    const totalQty = filtered.reduce((s, o) => s + (Number(o.qty) || 0), 0)
    // 每个账号：件数(qty 累加) + 笔数(条目数)
    const perAccount = {}
    for (const a of ACCOUNTS) perAccount[a] = { count: 0, qty: 0 }
    for (const o of filtered) {
      if (perAccount[o.account] !== undefined) {
        perAccount[o.account].count += 1
        perAccount[o.account].qty += Number(o.qty) || 0
      }
    }
    return { totalEntries, totalQty, perAccount }
  }, [filtered])

  // 按品名分组（仅当 view==='name' 且未选账号时，按品名看累计；选了账号也按品名看该账号下的）
  const groups = useMemo(() => {
    const map = new Map()  // key: 品名 → entries[]
    for (const o of filtered) {
      const k = o.name || '(未命名)'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(o)
    }
    const arr = []
    for (const [name, entries] of map.entries()) {
      arr.push({
        name,
        entries,
        count: entries.length,
        qty: entries.reduce((s, e) => s + (Number(e.qty) || 0), 0),
        latest: entries.find((e) => e.date)?.date || '',
        accounts: [...new Set(entries.map((e) => e.account).filter(Boolean))],
      })
    }
    // 排序：日期 新→旧 / 旧→新；或按出单量升降序（次级：笔数 → 最近日期 → 名称）
    const byDate = (a, b) => {
      const ta = a.latest ? parseTs(a.latest) : null
      const tb = b.latest ? parseTs(b.latest) : null
      if (ta === null && tb === null) return a.name.localeCompare(b.name, 'zh')
      if (ta === null) return 1
      if (tb === null) return -1
      if (ta === tb) return a.name.localeCompare(b.name, 'zh')
      return sortKey === 'dateAsc' ? ta - tb : tb - ta
    }
    arr.sort((a, b) => {
      if (sortKey === 'dateDesc' || sortKey === 'dateAsc') return byDate(a, b)
      const dir = sortKey === 'mostAsc' ? 1 : -1  // mostDesc: 多→少, mostAsc: 少→多
      if (a.qty !== b.qty) return (a.qty - b.qty) * dir
      if (a.count !== b.count) return (a.count - b.count) * dir
      const ta = a.latest ? parseTs(a.latest) : null
      const tb = b.latest ? parseTs(b.latest) : null
      if (ta !== null && tb !== null) return (tb - ta) * dir
      if (ta === null && tb === null) return a.name.localeCompare(b.name, 'zh')
      return ta === null ? 1 : -1
    })
    return arr
  }, [filtered, sortKey])

  // 点击产品卡 → 弹出该产品的出单记录详情面板
  const [activeName, setActiveName] = useState(null)
  const activeGroup = useMemo(() => groups.find((g) => g.name === activeName) || null, [groups, activeName])

  const [prefill, setPrefill] = useState(null)   // 从详情面板「继续新增一单」带入的账号/样品/品名

  const openAdd = () => { setEditing(null); setModalOpen(false); navigate('/orders/new') }
  const openEdit = (o) => { setEditing(o); setPrefill(null); setFormSeq((s) => s + 1); setModalOpen(true) }
  // 详情面板「继续新增一单」：带上该产品的账号与样品，跳独立页接着记
  const addMoreForActive = () => {
    if (!activeGroup) return
    const acc = activeGroup.entries.find((e) => e.account)?.account || ''
    const sid = activeGroup.entries.find((e) => e.sampleId)?.sampleId || ''
    setActiveName(null)
    setModalOpen(false)
    navigate('/orders/new', { state: { account: acc, sampleId: sid } })
  }
  const closeModal = () => { setModalOpen(false); setEditing(null) }
  const handleSave = (payload) => {
    if (!payload.name) { show('请填写品名', 'error'); return }
    if (editing) { updateOrder(editing.id, payload); show('已更新', 'success') }
    else { addOrder(payload); show('已记一笔出单', 'success') }
    closeModal()
  }
  const handleDelete = (o) => {
    if (!window.confirm(`删除「${o.name}」这笔出单记录？`)) return
    deleteOrder(o.id)
    show('已删除', 'success')
  }

  // 删除「某产品某一天」的全部出单（在详情面板点日期右侧 ×）
  const confirmDeleteDate = () => {
    const t = dateDelTarget
    if (!t) return
    const ids = [...new Set(t.entries.map((e) => e.id))]
    ids.forEach((id) => deleteOrder(id))
    show(`已删除「${t.name}」${dispDate(t.date)} 的 ${ids.length} 笔出单`, 'success')
    setDateDelTarget(null)
  }

  // 账号着色
  const accMeta = (a) => ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }

  // 排序：单个按钮切换（点一下升序↑ 再点降序↓）——「日期」与「出单」各一个
  const isDateMode = sortKey === 'dateDesc' || sortKey === 'dateAsc'
  const dateAsc = sortKey === 'dateAsc'
  const isCountMode = sortKey === 'mostDesc' || sortKey === 'mostAsc'
  const mostAsc = sortKey === 'mostAsc'
  const toggleDateSort = () => setSortKey((p) => (p === 'dateDesc' ? 'dateAsc' : 'dateDesc'))
  const toggleCountSort = () => setSortKey((p) => (p === 'mostDesc' ? 'mostAsc' : 'mostDesc'))

  return (
    <div className="app-container scroll-lock-page" style={{ background: 'transparent', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'calc(12px + var(--safe-top)) 16px 10px', borderBottom: '1px solid rgba(244,114,182,0.12)', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{
          width: '38px', height: '38px', borderRadius: '50%', border: 'none',
          background: 'rgba(244,114,182,0.12)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', flexShrink: 0 }}>出单记录</h1>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          style={{
            flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            border: productFilter ? '1.5px solid var(--primary)' : '1px solid rgba(244,114,182,0.35)',
            background: productFilter ? 'rgba(99,102,241,0.08)' : '#fff',
            color: productFilter ? '#4f46e5' : 'var(--text-sub)', cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">全部产品</option>
          {groups.map((g) => (
            <option key={g.name} value={g.name}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* 顶部汇总：只显示每个账号出单数量 */}
      <div style={{ padding: '10px 16px 4px', flexShrink: 0 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: '4px',
          background: '#fff',
          border: '1px solid rgba(244,114,182,0.18)',
          borderRadius: '12px', padding: '10px 4px',
        }}>
          {ACCOUNTS.map((a) => {
            const col = ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.12)' }
            const stat = summary.perAccount[a] || { count: 0, qty: 0 }
            return (
              <div key={a} style={{ padding: '4px 6px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '999px',
                  background: col.bg, color: col.c,
                  whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{a}</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: col.c, lineHeight: 1.15 }}>
                  {stat.count}<span style={{ fontSize: '11px', fontWeight: 500, marginLeft: '2px', color: 'var(--text-sub)' }}>笔</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 日期筛选：全部 / 今天 / 昨天 / 近7天 / 本周 / 本月 + 📅 日期（快捷键 / 具体某一天 / 本月·上月·近半年·本年） */}
      <DateFilterBar value={dateRange} onChange={setDateRange} />

      {/* 账号筛选：一行不换行，可横滚 */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button onClick={() => setAccountFilter('')} style={{
          flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
          border: accountFilter === '' ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: accountFilter === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: accountFilter === '' ? '#fff' : 'var(--text-main)', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const col = accMeta(a)
          const sel = accountFilter === a
          return (
            <button key={a} onClick={() => setAccountFilter(a)} style={{
              flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
              border: sel ? 'none' : `1px solid ${col.c}`,
              background: sel ? col.c : '#fff',
              color: sel ? '#fff' : col.c, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>{a}</button>
          )
        })}
      </div>

      {/* 排序 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0, padding: '6px 16px 2px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
        <button onClick={toggleDateSort} style={sortChipStyle(isDateMode)}>
          日期 {dateAsc ? '↑' : '↓'}
        </button>
        <button onClick={toggleCountSort} style={sortChipStyle(isCountMode)}>
          出单 {mostAsc ? '↑' : '↓'}
        </button>
      </div>

      {/* 列表：独立滚动 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(88px + var(--safe-bottom, 0px))', WebkitOverflowScrolling: 'touch' }}>
        {filtered.length === 0 ? (
          orders.length === 0 ? (
            <button onClick={openAdd} style={{
              width: '100%', background: '#fff', border: '1px solid rgba(244,114,182,0.12)', borderRadius: '14px',
              textAlign: 'center', padding: '40px 24px', color: 'var(--text-sub)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '4px' }}>📦</div>
              <p style={{ fontSize: '15px', margin: 0, color: 'var(--text-main)' }}>还没有出单记录</p>
              <p style={{ fontSize: '13px', margin: '6px 0 0' }}>点此<span style={{ color: 'var(--primary)', fontWeight: 700 }}>＋ 记出单</span>记下第一笔</p>
            </button>
          ) : (
            <div style={{ background: '#fff', border: '1px solid rgba(244,114,182,0.12)', borderRadius: '14px', textAlign: 'center', padding: '60px 24px', color: 'var(--text-sub)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
              <p style={{ fontSize: '15px', margin: 0, color: 'var(--text-main)' }}>
                {accountFilter || dateRange ? '当前筛选下暂无出单' : '该账号下暂无出单'}
              </p>
            </div>
          )
        ) : (
          /* 按产品聚合的产品卡：大字累计出单量，点卡片展开每天明细 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {groups.map((g) => {
              return (
                <div key={g.name} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(244,114,182,0.12)', background: '#fff' }}>
                  {/* 卡片头：品名 + 大字累计数量（点击查看该产品的出单记录） */}
                  <button onClick={() => setActiveName(g.name)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>共记 {g.count} 笔{dispDate(g.latest) && ` · 最近 ${dispDate(g.latest)}`}</div>
                      {g.accounts.length > 0 && (
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {g.accounts.map((a) => {
                            const col = accMeta(a)
                            return (
                              <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: col.bg, color: col.c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flexShrink: 0 }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1 }}>{g.qty}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>单</span>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: '17px', color: '#c9a3ab', lineHeight: 1 }}>›</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <OrderFormModal key={formSeq} open={modalOpen} onClose={closeModal} editing={editing} onSave={handleSave} prefill={prefill} />

      <ProductOrdersSheet
        open={!!activeGroup}
        group={activeGroup}
        onClose={() => setActiveName(null)}
        onEdit={(o) => { setActiveName(null); openEdit(o) }}
        onDelete={handleDelete}
        onDeleteDate={(date, entries) => setDateDelTarget({ name: activeGroup?.name || '', date, entries })}
        onAddMore={addMoreForActive}
        accMeta={accMeta}
      />

      {/* 按日期删除确认 */}
      <ConfirmModal
        open={!!dateDelTarget}
        onClose={() => setDateDelTarget(null)}
        onConfirm={confirmDeleteDate}
        title="删除该日期的出单记录"
        compact
        danger
        confirmText="删除"
        message={dateDelTarget ? (
          dateDelTarget.entries.length > 1
            ? `确定删除「${dateDelTarget.name}」${dispDate(dateDelTarget.date)} 的 ${dateDelTarget.entries.length} 笔出单记录吗？`
            : `确定删除「${dateDelTarget.name}」${dispDate(dateDelTarget.date)} 的这笔出单记录吗？`
        ) : ''}
      />

      <DraggableFab storageKey="orders" onClick={openAdd} round>
        {/* 加号+圆圈：与待办页一致，用 SVG 而非文字「＋」，避免圆内偏位 */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" style={{ display: 'block' }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </DraggableFab>
    </div>
  )
}
