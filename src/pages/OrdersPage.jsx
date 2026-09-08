import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { OrderFormModal } from '../components/OrderFormModal'
import { ACCOUNTS, ACCOUNT_COLOR } from '../utils/accounts'
import { ProductOrdersSheet } from '../components/ProductOrdersSheet'
import { DraggableFab } from '../components/DraggableFab'


// 把 YYYY/MM/DD 或 YYYY-MM-DD 解析成可排序时间戳
function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
// 快捷时间段区间：返回 [startTs, endTs)；'' 返回 null（不过滤）
function quickBounds(q) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  if (q === 'today') {
    const s = new Date(y, m, d).getTime()
    return [s, s + 86400000]
  }
  if (q === 'yesterday') {
    const s = new Date(y, m, d - 1).getTime()
    return [s, s + 86400000]
  }
  if (q === 'week') {
    // 本周：周一 00:00 → 下周一 00:00（整周）
    const dow = (now.getDay() + 6) % 7  // 周一=0
    const s = new Date(y, m, d - dow).getTime()
    return [s, s + 7 * 86400000]
  }
  if (q === 'month') {
    const s = new Date(y, m, 1).getTime()
    return [s, new Date(y, m + 1, 1).getTime()]
  }
  if (q === 'lastMonth') {
    const s = new Date(y, m - 1, 1).getTime()
    return [s, new Date(y, m, 1).getTime()]
  }
  return null
}

// 按月份筛选区间：返回 [startTs, endTs)；空字符串/无效值返回 null（不过滤）
function monthBounds(ym) {
  if (!ym) return null
  const m = String(ym).match(/^(\d{4})-(\d{1,2})$/)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2])
  if (!y || !mo || mo < 1 || mo > 12) return null
  const s = new Date(y, mo - 1, 1).getTime()
  const e = new Date(y, mo, 1).getTime()
  return [s, e]
}
// 统一显示出单数量：X 单
const fmtQty = (q) => (q && q > 1 ? `${q}单` : '1单')
// 显示日期（可能为空则"未填日期"）
function dispDate(v) {
  if (!v) return '未填日期'
  return String(v).replace(/-/g, '/')
}
// YYYY-MM → 「2026年9月」
function monthLabel(ym) {
  const m = String(ym).match(/^(\d{4})-(\d{1,2})$/)
  if (!m) return String(ym)
  return `${m[1]}年${Number(m[2])}月`
}

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
  const [productFilter, setProductFilter] = useState([])   // 产品名多选筛选；空=全部
  const [quick, setQuick] = useState('today')  // ''=全部 / today/yesterday/week/month/lastMonth（默认今天）
  const [month, setMonth] = useState('')  // ''=全部 / 'YYYY-MM'=指定月（与 quick 互斥）
  const [monthOpen, setMonthOpen] = useState(false)  // 月份下拉展开态
  const [sortKey, setSortKey] = useState('mostDesc')  // 'mostDesc'=出单最多(降序) / 'mostAsc'=出单最少(升序)
  const [monthPos, setMonthPos] = useState(null)     // 月份下拉锚点 {top,left}，fixed 定位用
  const [showProdPicker, setShowProdPicker] = useState(false) // 产品多选面板
  const monthBtnRef = useRef(null)

  const toggleProd = (n) => setProductFilter((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))

  const toggleMonthOpen = () => {
    const el = monthBtnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setMonthPos({
        top: r.bottom + 6,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 238)),
      })
    }
    setMonthOpen((v) => !v)
  }

  // 快捷时间段选项
  const QUICK_RANGES = [
    { id: 'today', label: '今天' },
    { id: 'yesterday', label: '昨天' },
    { id: 'week', label: '本周' },
    { id: 'month', label: '本月' },
    { id: 'lastMonth', label: '上月' },
  ]

  // 各月有数据的笔数（用于月份下拉里展示），仅统计带日期的记录
  const monthCounts = useMemo(() => {
    const map = {}
    for (const o of orders || []) {
      const t = parseTs(o?.date)
      if (t === null) continue
      const d = new Date(t)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map[ym] = (map[ym] || 0) + 1
    }
    return map
  }, [orders])
  // 有数据的月份，新→旧
  const monthList = useMemo(() => Object.keys(monthCounts).sort().reverse(), [monthCounts])

  const list = useMemo(() => {
    // 排序：无日期的排最后，其余按日期新→旧
    return [...(orders || [])].sort((a, b) => {
      const ta = parseTs(a?.date), tb = parseTs(b?.date)
      if (ta !== null && tb !== null) return tb - ta
      if (ta === null && tb === null) return 0
      return ta === null ? 1 : -1
    })
  }, [orders])

  // 时间筛选（快捷段优先，其次指定月份） + 账号筛选 + 产品名筛选
  const filtered = useMemo(() => {
    let arr = list
    if (accountFilter) arr = arr.filter((o) => o.account === accountFilter)
    if (productFilter.length) arr = arr.filter((o) => productFilter.includes(o.name))
    const bounds = quick ? quickBounds(quick) : monthBounds(month)
    if (bounds) {
      const [s, e] = bounds
      arr = arr.filter((o) => {
        const t = parseTs(o?.date)
        // 无日期的在非"全部"时不显示，避免归类困难
        return t !== null && t >= s && t < e
      })
    }
    return arr
  }, [list, accountFilter, productFilter, quick, month])

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
    // 排序：按出单量升降序（次级：笔数 → 最近日期 → 名称）
    const dir = sortKey === 'mostAsc' ? 1 : -1  // mostDesc: 多→少, mostAsc: 少→多
    arr.sort((a, b) => {
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

  // 账号着色
  const accMeta = (a) => ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }

  return (
    <div className="app-container scroll-lock-page" style={{ background: 'transparent', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="出单记录"
        onBack={() => navigate('/')}
      />

      {/* 顶部汇总：白底+浅边框 2×3 卡；账号行做成 chip 风格单行不换行 */}
      <div style={{ padding: '10px 16px 4px', flexShrink: 0 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: '4px', rowGap: '6px',
          background: '#fff',
          border: '1px solid rgba(244,114,182,0.18)',
          borderRadius: '12px', padding: '8px 4px 10px',
        }}>
          {/* 第 1 行：累计出单 / 涉及产品 / 总笔数 */}
          {[
            { label: '累计出单', value: summary.totalQty, unit: '件' },
            { label: '涉及产品', value: groups.length, unit: '款' },
            { label: '总笔数', value: summary.totalEntries, unit: '笔' },
          ].map((c, i) => (
            <div key={i} style={{ padding: '4px 8px', minWidth: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-sub)' }}>{c.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1.15, marginTop: '2px' }}>
                {c.value}<span style={{ fontSize: '10.5px', fontWeight: 500, marginLeft: '2px', color: 'var(--text-sub)' }}>{c.unit}</span>
              </div>
            </div>
          ))}
          {/* 分隔线：横向贯穿三格 */}
          <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(244,114,182,0.14)', margin: '2px 4px 0' }} />
          {/* 第 2 行：三账号件数，用账号主色 chip 风格、账号名单行省略不换行 */}
          {ACCOUNTS.map((a) => {
            const col = ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(100,116,139,0.12)' }
            const stat = summary.perAccount[a] || { count: 0, qty: 0 }
            return (
              <div key={a} style={{ padding: '4px 6px 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{
                  fontSize: '10.5px', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '999px',
                  background: col.bg, color: col.c,
                  whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{a}</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: col.c, lineHeight: 1.15 }}>
                  {stat.qty}<span style={{ fontSize: '10.5px', fontWeight: 500, marginLeft: '2px', color: 'var(--text-sub)' }}>件</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 时间筛选：全部 / 今天 / 昨天 / 本周 / 本月 / 上月 + 月份（一排横滚） */}
      <div style={{ padding: '10px 16px 2px', display: 'flex', gap: '5px', overflowX: 'auto', flexShrink: 0 }}>
        <button onClick={() => { setQuick(''); setMonth(''); setMonthOpen(false) }} style={{
          flex: '0 0 auto', padding: '5px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
          border: (quick === '' && month === '') ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: (quick === '' && month === '') ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: (quick === '' && month === '') ? '#fff' : 'var(--text-main)', cursor: 'pointer',
        }}>全部</button>
        {QUICK_RANGES.map((r) => {
          const sel = quick === r.id
          return (
            <button key={r.id} onClick={() => { setQuick(r.id); setMonth(''); setMonthOpen(false) }} style={{
              flex: '0 0 auto', padding: '5px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              border: sel ? 'none' : '1px solid rgba(244,114,182,0.35)',
              background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
              color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{r.label}</button>
          )
        })}
        {/* 月份：跟在「上月」后面 */}
        <button ref={monthBtnRef} onClick={toggleMonthOpen} style={{
          flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '4px',
          padding: '5px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          position: 'relative', zIndex: monthOpen ? 41 : 'auto',
          border: month ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: month ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: month ? '#fff' : 'var(--text-main)', whiteSpace: 'nowrap',
        }}>
          <span>📅 {month ? monthLabel(month) : '月份'}</span>
          <span style={{ fontSize: '9px', opacity: 0.8, transition: 'transform .15s', transform: monthOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </button>
        {monthOpen && (
          <>
            {/* 点击空白处关闭 */}
            <div onClick={() => setMonthOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{
              position: 'fixed', top: (monthPos?.top ?? 0), left: (monthPos?.left ?? 0), zIndex: 41,
              width: '230px', maxHeight: '300px', overflowY: 'auto',
              background: '#fff', borderRadius: '14px', padding: '6px',
              border: '1px solid rgba(244,114,182,0.22)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
            }}>
              {/* 全部（同时清除快捷时段） */}
              <button onClick={() => { setMonth(''); setQuick(''); setMonthOpen(false) }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '9px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: (month === '' && quick === '') ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
                color: (month === '' && quick === '') ? '#fff' : 'var(--text-main)',
              }}>
                <span>全部</span>
                <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.75 }}>共 {orders.length} 笔</span>
              </button>
              {monthList.length > 0 && <div style={{ height: '1px', background: 'rgba(244,114,182,0.15)', margin: '5px 2px' }} />}
              {/* 有数据的月份，新→旧（选了月份则清掉快捷时段） */}
              {monthList.map((ym) => {
                const sel = month === ym
                return (
                  <button key={ym} onClick={() => { setMonth(ym); setQuick(''); setMonthOpen(false) }} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                    padding: '9px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px',
                    background: sel ? 'rgba(244,114,182,0.14)' : 'transparent',
                    color: sel ? '#db2777' : 'var(--text-main)',
                    fontWeight: sel ? 700 : 500,
                  }}>
                    <span>{monthLabel(ym)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{monthCounts[ym]} 笔</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 账号筛选：chip 自适应内容宽度（不带数字） */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => setAccountFilter('')} style={{
          flex: '0 0 auto', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
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
              flex: '0 0 auto', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
              border: sel ? 'none' : `1px solid ${col.c}`,
              background: sel ? col.c : '#fff',
              color: sel ? '#fff' : col.c, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>{a}</button>
          )
        })}
        {/* 产品多选 */}
        <button onClick={() => setShowProdPicker((v) => !v)} style={{
          flex: '0 0 auto', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
          border: productFilter.length ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: productFilter.length ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: productFilter.length ? '#fff' : 'var(--text-main)', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>📦 产品{productFilter.length ? ` · ${productFilter.length}` : ''}</button>
      </div>

      {/* 产品多选展开面板：列出所有出现过的产品名 */}
      {showProdPicker && (() => {
        // 从 filtered 中聚合所有出现过的产品名（不被时间/账号筛选影响，保证选项全集可见）
        const opts = (() => {
          const base = accountFilter ? list.filter((o) => o.account === accountFilter) : list
          const set = new Set()
          for (const o of base) if (o.name) set.add(o.name)
          return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
        })()
        return (
          <div style={{ padding: '4px 16px 8px', background: 'rgba(255,255,255,0.6)', borderTop: '1px dashed rgba(244,114,182,0.25)', borderBottom: '1px dashed rgba(244,114,182,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}>按产品多选</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setProductFilter([])} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer' }}>清空</button>
                <button onClick={() => setShowProdPicker(false)} style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff', cursor: 'pointer' }}>完成</button>
              </div>
            </div>
            {opts.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', padding: '8px 0' }}>暂无产品数据</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {opts.map((n) => {
                  const sel = productFilter.includes(n)
                  return (
                    <button key={n} onClick={() => toggleProd(n)} style={{
                      fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px',
                      border: sel ? 'none' : '1px solid rgba(0,0,0,0.10)',
                      background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                      color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer',
                    }}>{n}</button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* 排序：按出单量，点按钮在降序/升序之间切换 */}
      <div style={{ padding: '4px 16px 2px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
        <button onClick={() => setSortKey(sortKey === 'mostDesc' ? 'mostAsc' : 'mostDesc')} style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '4px 10px 4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
          border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: '#fff', cursor: 'pointer',
        }}>
          <span>出单最多</span>
          <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.92 }}>{sortKey === 'mostDesc' ? '↓' : '↑'}</span>
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
                {accountFilter || quick || month ? '当前筛选下暂无出单' : '该账号下暂无出单'}
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
        onAddMore={addMoreForActive}
        accMeta={accMeta}
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
