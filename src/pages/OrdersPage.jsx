import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost } from '../components/Modal'
import { ACCOUNTS, ACCOUNT_COLOR, hasAccount } from '../utils/accounts'
import { isSelectableForOrder } from '../utils/publish'


// 把 YYYY/MM/DD 或 YYYY-MM-DD 解析成可排序时间戳
function parseTs(v) {
  if (!v) return null
  const d = new Date(String(v).replace(/\//g, '-'))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
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

// 新增 / 编辑表单（弹窗内）
function OrderFormModal({ open, onClose, editing, onSave }) {
  const [account, setAccount] = useState(editing?.account || '')
  const [sampleId, setSampleId] = useState(editing?.sampleId || '')
  const [name, setName] = useState(editing?.name || '')
  const [date, setDate] = useState(editing?.date || todayStr())
  const [qty, setQty] = useState(editing?.qty ? String(editing.qty) : '1')
  const [remark, setRemark] = useState(editing?.remark || '')
  const [sampleOpen, setSampleOpen] = useState(false)  // 样品搜索面板展开
  const [sampleQuery, setSampleQuery] = useState('')    // 样品搜索关键词
  const { samples } = useStore()
  const { show } = useToast()

  // 先选账号 → 该账号下「已发布」的样品才可关联
  const candidateSamples = useMemo(() => {
    const base = (samples || []).filter((sm) => isSelectableForOrder(sm.status) && hasAccount(sm, account))
    // 编辑旧数据时，若原关联样品已不在候选中（账号变更/状态变化），仍把它列出来以便原样保存
    const oldSm = editing?.sampleId ? (samples || []).find((x) => x.id === editing.sampleId) : null
    if (oldSm && !base.some((x) => x.id === oldSm.id)) return [...base, oldSm]
    return base
  }, [samples, account, editing])

  // 当前账号下可搜的样品（按名称关键词过滤，已选的置顶）
  const searchableSamples = useMemo(() => {
    const q = sampleQuery.trim().toLowerCase()
    const list = candidateSamples.filter((sm) => !q || (sm.name || '').toLowerCase().includes(q))
    return list.sort((a, b) => {
      if (a.id === sampleId) return -1
      if (b.id === sampleId) return 1
      return 0
    })
  }, [candidateSamples, sampleQuery, sampleId])

  const currentSample = sampleId ? (samples || []).find((x) => x.id === sampleId) : null

  const onPickAccount = (a) => {
    setAccount(a)
    const sm = sampleId ? (samples || []).find((x) => x.id === sampleId) : null
    // 切换账号后原样品不属于新账号 → 清空，避免误关联
    if (sm && !hasAccount(sm, a)) { setSampleId(''); setName('') }
  }
  const onPickSample = (sid) => {
    setSampleId(sid)
    setSampleOpen(false)
    setSampleQuery('')
    const sm = (samples || []).find((x) => x.id === sid)
    if (sm) setName(sm.name)
  }
  const openSamplePicker = () => {
    if (!account) { show('请先选择账号', 'error'); return }
    setSampleQuery('')
    setSampleOpen((v) => !v)
  }

  const handleSave = () => {
    if (!account) { show('请先选择账号', 'error'); return }
    if (!sampleId) { show('请选择该账号下已发布的样品', 'error'); return }
    const sm = (samples || []).find((x) => x.id === sampleId)
    if (!sm || !isSelectableForOrder(sm.status) || !hasAccount(sm, account)) {
      show('所选样品需属于该账号且为已发布状态', 'error')
      return
    }
    onSave({
      name: (name.trim() || sm?.name?.trim() || ''),
      date,
      account,
      sampleId,
      productId: sm?.productId || '',
      qty: Number(qty) || 1,
      remark: remark.trim(),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? '编辑出单' : '记一笔出单'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
        <Field label="账号" required>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACCOUNTS.map((a) => {
              const sel = account === a
              return (
                <button key={a} onClick={() => onPickAccount(a)} style={{
                  padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
                  border: sel ? 'none' : '1px solid rgba(0,0,0,0.08)',
                  background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                  color: sel ? '#fff' : 'var(--text-main)', cursor: 'pointer',
                }}>{a}</button>
              )
            })}
          </div>
        </Field>

        <Field label="关联样品（仅该账号已发布）" required>
          {/* 已选样品展示框（点击展开搜索） */}
          <button type="button" onClick={openSamplePicker} style={{
            width: '100%', minHeight: '44px', padding: '12px 14px',
            border: currentSample ? '1.5px solid #16a34a' : '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: '12px', background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            color: 'var(--text-main)', textAlign: 'left', fontFamily: 'inherit', fontSize: '15px',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSample ? (
                <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {currentSample.name}</span>
              ) : (
                <span style={{ color: 'var(--text-sub)' }}>{account ? '点击搜索并选择样品…' : '请先在上方选择账号'}</span>
              )}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>{sampleOpen ? '▲' : '🔍'}</span>
          </button>

          {/* 搜索面板：内联展开 */}
          {sampleOpen && account && (
            <div style={{ marginTop: '8px', border: '1px solid rgba(244,114,182,0.22)', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '8px', borderBottom: '1px solid rgba(244,114,182,0.10)' }}>
                <input
                  autoFocus
                  placeholder="搜索样品名称…"
                  value={sampleQuery}
                  onChange={(e) => setSampleQuery(e.target.value)}
                  style={{ ...inputStyle, minHeight: '38px', padding: '8px 12px', fontSize: '14px' }}
                />
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
                {searchableSamples.length === 0 ? (
                  <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: '13px', color: 'var(--text-sub)' }}>
                    没有匹配的样品
                  </div>
                ) : (
                  searchableSamples.map((sm) => {
                    const valid = isSelectableForOrder(sm.status) && hasAccount(sm, account)
                    const sel = sm.id === sampleId
                    return (
                      <button key={sm.id} type="button" onClick={() => onPickSample(sm.id)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: sel ? 'rgba(22,163,74,0.10)' : 'transparent',
                        color: 'var(--text-main)', textAlign: 'left', fontFamily: 'inherit', fontSize: '14px',
                      }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sm.name}
                          {!valid && <span style={{ fontSize: '11px', color: '#f59e0b' }}>（当前不可选，原记录保留）</span>}
                        </span>
                        {sel && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>已选 ✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>
            {account ? `已列出「${account}」的已发布样品，可搜索` : '选完账号后即可搜索并选择样品'}
          </div>
        </Field>

        <Field label="出单日期">
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="出单数量" required>
          <input type="number" min="1" style={inputStyle} value={qty} onChange={(e) => setQty(e.target.value)} />
          <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>只记本次出单数量，同一产品会按数量累计</div>
        </Field>

        <Field label="备注（选填）">
          <textarea style={{ ...inputStyle, minHeight: '54px', resize: 'vertical' }} placeholder="平台 / 链接 / 说明" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={onClose}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </Modal>
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
  const [quick, setQuick] = useState('')  // ''=全部 / today/yesterday/week/month/lastMonth
  const [month, setMonth] = useState('')  // ''=全部 / 'YYYY-MM'=指定月（与 quick 互斥）
  const [monthOpen, setMonthOpen] = useState(false)  // 月份下拉展开态
  const [monthPos, setMonthPos] = useState(null)     // 月份下拉锚点 {top,left}，fixed 定位用
  const monthBtnRef = useRef(null)

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

  // 时间筛选（快捷段优先，其次指定月份） + 账号筛选
  const filtered = useMemo(() => {
    let arr = list
    if (accountFilter) arr = arr.filter((o) => o.account === accountFilter)
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
  }, [list, accountFilter, quick, month])

  // 汇总：跟着 range+accountFilter 走
  const summary = useMemo(() => {
    const totalEntries = filtered.length
    const totalQty = filtered.reduce((s, o) => s + (Number(o.qty) || 0), 0)
    const perAccount = {}
    for (const a of ACCOUNTS) perAccount[a] = 0
    for (const o of filtered) { if (perAccount[o.account] !== undefined) perAccount[o.account]++ }
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
      })
    }
    // 组按出单数量降序：出单次数 → 累计单量 → 最近出单日期 → 名称兜底
    arr.sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count
      if (a.qty !== b.qty) return b.qty - a.qty
      const ta = a.latest ? parseTs(a.latest) : null
      const tb = b.latest ? parseTs(b.latest) : null
      if (ta !== null && tb !== null) return tb - ta
      if (ta === null && tb === null) return a.name.localeCompare(b.name, 'zh')
      return ta === null ? 1 : -1
    })
    return arr
  }, [filtered])

  // 展开的产品卡（默认收起，点卡片头展开看每天明细）
  const [openGroups, setOpenGroups] = useState(() => new Set())
  const toggleGroup = (name) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const openAdd = () => { setEditing(null); setFormSeq((s) => s + 1); setModalOpen(true) }
  const openEdit = (o) => { setEditing(o); setFormSeq((s) => s + 1); setModalOpen(true) }
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
    <div className="app-container" style={{ background: 'transparent', minHeight: '100vh', color: 'var(--text-main)' }}>
      <PageHeader
        title="出单记录"
        onBack={() => navigate('/')}
        right={
          <button onClick={openAdd} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: 'var(--primary)', color: '#fff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>＋ 记出单</button>
        }
      />

      {/* 顶部汇总 */}
      <div style={{ padding: '12px 16px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div style={{ background: '#fff', border: '1px solid rgba(244,114,182,0.12)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>记录笔数</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1.2 }}>{summary.totalEntries}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(244,114,182,0.12)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>累计出单</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>{summary.totalQty}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(244,114,182,0.12)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>涉及产品</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', lineHeight: 1.2 }}>{groups.length}</div>
        </div>
      </div>

      {/* 时间筛选：全部 / 今天 / 昨天 / 本周 / 本月 / 上月 + 月份（一排横滚） */}
      <div style={{ padding: '10px 16px 2px', display: 'flex', gap: '5px', overflowX: 'auto' }}>
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

      {/* 账号筛选：单行平均分布 + 紧凑尺寸，小手机也能一行装下 */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', gap: '5px' }}>
        <button onClick={() => setAccountFilter('')} style={{
          flex: '1 1 0', minWidth: 0, padding: '5px 4px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
          border: accountFilter === '' ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: accountFilter === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: accountFilter === '' ? '#fff' : 'var(--text-main)', cursor: 'pointer',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>全部 {summary.totalEntries}</button>
        {ACCOUNTS.map((a) => {
          const col = accMeta(a)
          const sel = accountFilter === a
          return (
            <button key={a} onClick={() => setAccountFilter(a)} style={{
              flex: '1 1 0', minWidth: 0, padding: '5px 4px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
              border: sel ? 'none' : `1px solid ${col.c}`,
              background: sel ? col.c : '#fff',
              color: sel ? '#fff' : col.c, cursor: 'pointer',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{a} {summary.perAccount[a] || 0}</button>
          )
        })}
      </div>

      <div style={{ padding: '8px 16px calc(20px + var(--safe-bottom, 0px))' }}>
        {filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid rgba(244,114,182,0.12)', borderRadius: '14px', textAlign: 'center', padding: '60px 24px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <p style={{ fontSize: '15px', margin: 0, color: 'var(--text-main)' }}>
              {orders.length === 0 ? '还没有出单记录' : (accountFilter || quick || month ? '当前筛选下暂无出单' : '该账号下暂无出单')}
            </p>
            <p style={{ fontSize: '13px', margin: '6px 0 0' }}>点右上角「＋ 记出单」记下第一笔</p>
          </div>
        ) : (
          /* 按产品聚合的产品卡：大字累计出单量，点卡片展开每天明细 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {groups.map((g) => {
              const open = openGroups.has(g.name)
              return (
                <div key={g.name} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(244,114,182,0.12)', background: '#fff' }}>
                  {/* 卡片头：品名 + 大字累计数量（点击展开/收起） */}
                  <button onClick={() => toggleGroup(g.name)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>共记 {g.count} 笔{dispDate(g.latest) && ` · 最近 ${dispDate(g.latest)}`}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flexShrink: 0 }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1 }}>{g.qty}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>单</span>
                    </div>
                    <span style={{
                      flexShrink: 0, fontSize: '12px', color: '#c9a3ab', transition: 'transform .15s',
                      transform: open ? 'rotate(180deg)' : 'none',
                    }}>▾</span>
                  </button>
                  {/* 明细：点开才显示 */}
                  {open && (
                    <div style={{ padding: '0 6px 6px', borderTop: '1px solid rgba(244,114,182,0.10)' }}>
                      {g.entries.map((o) => {
                        const meta = accMeta(o.account)
                        return (
                          <div key={o.id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 8px',
                            borderRadius: '10px', cursor: 'pointer',
                          }} onClick={() => openEdit(o)}>
                            <span style={{ flexShrink: 0, width: '9px', height: '9px', borderRadius: '50%', background: meta.c }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-sub)', flexShrink: 0, minWidth: '16px' }}>{dispDate(o.date)}</span>
                            <span style={{ fontSize: '12px', color: o.account ? meta.c : '#94a3b8', flexShrink: 0 }}>{o.account || '未选账号'}</span>
                            <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.remark || ''}</span>
                            <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>+{fmtQty(o.qty)}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(o) }} style={{ flexShrink: 0, border: 'none', background: 'transparent', color: '#f87171', fontSize: '14px', lineHeight: 1, cursor: 'pointer', padding: '2px 4px' }}>🗑</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <OrderFormModal key={formSeq} open={modalOpen} onClose={closeModal} editing={editing} onSave={handleSave} />
    </div>
  )
}
