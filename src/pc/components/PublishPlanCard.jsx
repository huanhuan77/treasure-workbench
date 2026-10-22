import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts, maskAccount } from '../../utils/accounts'
import { isArchivedSample } from '../../utils/sampleStatus'
import { AccountTabs } from './AccountTabs'

// 总览「发布计划」卡片（用户要求）：
//   字段 = 发布产品 / 发布账号 / 发布数量 / 发布时间
//   数据在 store.publishPlans，随本地存储 + 云同步（sync 白名单已加）
//   今天及以前的计划标「已到期」，未来的按时间升序排在前面，方便看这两天要发什么
const fmtDate = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const todayStr = () => fmtDate(new Date())
// 发布计划默认日期 = **明天**（用户要求）：今天发的东西通常是当天就录完了，
// 计划多数是「明天要发什么」，默认明天能省一次选择
const tomorrowStr = () => fmtDate(new Date(Date.now() + 864e5))

// 弹窗交互照「记录发布」弹窗（用户要求「改成图一这种」）：
//   切账号分别填 → 每个账号下可加多条「产品 + 数量」（加减步进器）→ 一次保存写成多条计划。
// 编辑已有计划时只保留原有一条，不允许增删行。
const emptyByAcc = () => {
  const o = {}
  for (const a of ACCOUNTS) o[a] = []
  return o
}
// 行结构带 sampleId：从样品发起/选品时记下，样品改名后「已建计划」仍能对上
const newEntry = () => ({ name: '', qty: '1', sampleId: '' })
// 同一天的条目共用一档底色（三档循环），隔天颜色就变，方便一眼看出「哪天有几条」。
// 三档都带淡色、不用纯白 —— 否则第一天（列表最上面那组）看着像「没上背景色」。
const DATE_TONES = ['#fdf6fa', '#f5f8fd', '#fbfaf2']

export function PublishPlanCard() {
  const { samples, publishPlans, addPublishPlan, updatePublishPlan, deletePublishPlan, addPublishRecord, hiddenAccounts } = useStore()
  const { show } = useToast()
  const [editing, setEditing] = useState(null)   // null=关闭 / 'new' / 条目对象
  const [account, setAccount] = useState(ACCOUNTS[0] || '')
  const [planDate, setPlanDate] = useState(tomorrowStr())
  const [byAcc, setByAcc] = useState(emptyByAcc)  // 新增态：{ 账号: [{ name, qty }] }
  const [editEntry, setEditEntry] = useState(newEntry())  // 编辑态：只有这一行
  const [pickIdx, setPickIdx] = useState(-1)     // 正在为第几行选产品；-1 = 面板收起
  // 从提醒中心「新建计划」进来：产品已带好，隐藏「发布产品 & 数量 / ＋添加 / 提示」那块
  const [lockProduct, setLockProduct] = useState(false)
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('') // 选品面板里的分类筛选，'' = 全部
  // 选品面板里勾选的产品名（可多选，保留点击顺序）
  const [picked, setPicked] = useState([])
  const [flashId, setFlashId] = useState('')     // 刚保存的那条：滚动定位 + 高亮 4 秒

  // 「隐藏账号」= 名字打星号，不做筛选（用户明确「是账号显示星号，不是筛选」）
  const list = publishPlans || []

  // 先按账号分组（同账号排在一起，账号之间按 ACCOUNTS 固定顺序），
  // 组内按发布时间升序（没填日期的排最后），同一天按创建时间倒序
  const sorted = useMemo(() => {
    const rank = (acc) => {
      const i = ACCOUNTS.indexOf(acc)
      return i === -1 ? 999 : i
    }
    return [...list].filter((p) => !p.done).sort((a, b) => {
      // 日期优先：同一天的排在一起（升序）；同一天内按账号归组
      const ad = a.planDate || ''
      const bd = b.planDate || ''
      if (ad && bd && ad !== bd) return ad < bd ? -1 : 1
      if (!ad && bd) return 1
      if (ad && !bd) return -1
      const d = rank(a.account) - rank(b.account)
      if (d !== 0) return d
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  }, [list])

  const today = todayStr()

  // 卡片内的账号筛选（用户要求）：胶囊行，与「提醒中心」同款；
  // '' = 全部账号。默认只列 5 条，底部「查看全部 N 条」展开（与「待办清单」一致）。
  const [accFilter, setAccFilter] = useState('')
  const [expanded, setExpanded] = useState(false)
  // 只列卡里真实出现过的账号（按 ACCOUNTS 固定顺序，未在册的排后面）
  const accOptions = useMemo(() => {
    const set = new Set(list.map((p) => p.account).filter(Boolean))
    return [...set].sort((x, y) => {
      const ix = ACCOUNTS.indexOf(x)
      const iy = ACCOUNTS.indexOf(y)
      return (ix === -1 ? 999 : ix) - (iy === -1 ? 999 : iy) || x.localeCompare(y, 'zh')
    })
  }, [list])
  // 列表 / 待发 / 共 N 条 都按筛选后的账号计算
  const accFiltered = useMemo(
    () => (accFilter ? sorted.filter((p) => p.account === accFilter) : sorted),
    [sorted, accFilter],
  )
  const visible = expanded ? accFiltered : accFiltered.slice(0, 5)
  const upcoming = accFiltered.filter((p) => !p.planDate || p.planDate >= today).length
  // 日期 → 底色：同一日期共用一个底色，按日期升序循环三档（隔天一定换色）
  const dateTone = useMemo(() => {
    const dates = [...new Set(visible.map((p) => p.planDate || ''))].sort()
    const map = {}
    dates.forEach((d, i) => { map[d] = DATE_TONES[i % DATE_TONES.length] })
    return map
  }, [visible])

  const isEditing = !!editing && editing !== 'new'
  // 「紧凑布局」= 从提醒中心带产品进来，或编辑已有计划：两种情况都按「一行固定产品 + 数量」排，
  // 和新增带产品的形态一致（用户要求「编辑的时候跟新增一样的布局」）
  const compactLayout = lockProduct || isEditing
  // 新增态看当前账号自己的行；编辑态只有一行（用户要求「编辑态只保留一行」）
  const entries = isEditing ? [editEntry] : (byAcc[account] || [])

  // 产品候选 = 当前账号名下做过的样品名（含多账号归属的样品）。
  // 先选账号再选产品（用户要求）：只列该账号的品，避免串号；
  // 「已放弃」的样品不进候选（口径同待投流候选：isArchivedSample）。
  const candidates = useMemo(() => {
    const map = new Map()
    for (const s of samples || []) {
      if (isArchivedSample(s)) continue
      if (!getAccounts(s).includes(account)) continue
      const n = String((s && s.name) || '').trim()
      if (!n || map.has(n)) continue
      map.set(n, s.category || '')
    }
    return [...map.entries()]
      .map(([name, category]) => ({ name, category }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  }, [samples, account])

  // 分类筛选只列候选里真实出现过的分类（按 CATEGORIES 顺序）
  const catOptions = useMemo(() => {
    const set = new Set()
    for (const c of candidates) if (c.category) set.add(c.category)
    return [...set]
  }, [candidates])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    // 同一账号下别的行已经选过的产品不重复列出（正在编辑的这行除外）
    const used = new Set(entries.map((e, i) => (i === pickIdx ? null : e.name)).filter(Boolean))
    return candidates
      .filter((c) => !used.has(c.name))
      .filter((c) => !catFilter || c.category === catFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [candidates, query, entries, pickIdx, catFilter])

  const counts = useMemo(() => {
    const o = {}
    for (const a of ACCOUNTS) {
      o[a] = isEditing
        ? (a === account && editEntry.name && Number(editEntry.qty) >= 1 ? 1 : 0)
        : (byAcc[a] || []).filter((e) => e.name && Number(e.qty) >= 1).length
    }
    return o
  }, [byAcc, isEditing, editEntry, account])

  const setEntries = (fn) => {
    if (isEditing) setEditEntry((prev) => fn([prev])[0] || prev)
    else setByAcc((prev) => ({ ...prev, [account]: fn(prev[account] || []) }))
  }
  const addEntry = () => {
    setEntries((p) => [...p, newEntry()])
    setQuery('')
    setCatFilter('')
    setPickIdx(entries.length)
  }
  const removeEntry = (i) => {
    setEntries((p) => p.filter((_, k) => k !== i))
    if (pickIdx === i) setPickIdx(-1)
    else if (pickIdx > i) setPickIdx(pickIdx - 1)
  }
  // 点一条产品即勾选（可多选）：编辑态只能选一个（该态只有一行），新增态可连着勾多个
  const pickProduct = (name) => {
    if (isEditing) { setPicked([name]); return }
    setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]))
  }
  // 确定：第一个勾的填进当前行，其余各自动占一行（数量默认 1）
  const confirmPicked = () => {
    if (picked.length > 0) {
      setEntries((p) => {
        const next = [...p]
        picked.forEach((name, i) => {
          if (i === 0 && pickIdx >= 0 && pickIdx < next.length) {
            next[pickIdx] = { ...(next[pickIdx] || { qty: '1' }), name }
          } else {
            next.push({ name, qty: '1' })
          }
        })
        return next
      })
    }
    setPicked([])
    setPickIdx(-1)
    setQuery('')
    setCatFilter('')
  }
  const setQty = (idx, v) => setEntries((p) => p.map((e, k) => (k === idx ? { ...e, qty: v } : e)))
  // 加减用函数式更新：连点两下时第二次仍拿旧值算，只会 +1
  const bumpQty = (idx, delta) => setEntries((p) => p.map((e, k) => (
    k === idx ? { ...e, qty: String(Math.max(1, (Number(e.qty) || 1) + delta)) } : e
  )))

  const total = useMemo(() => {
    if (isEditing) return editEntry.name && Number(editEntry.qty) >= 1 ? 1 : 0
    return ACCOUNTS.reduce((n, a) => n + (byAcc[a] || []).filter((e) => e.name && Number(e.qty) >= 1).length, 0)
  }, [byAcc, isEditing, editEntry])

  // 打开弹窗时重置所有行的选择面板状态
  const resetPicker = () => { setPickIdx(-1); setQuery(''); setCatFilter(''); setPicked([]) }

  // 「标记已发」：同时把这次发布**写进发布记录**（用户要求「点击完成之后能自动把记录添加到发布记录」）。
  // 记录写进去后，store 会重算该账号的「距上次发布」，提醒自然消失；找不到对应样品时只标记完成。
  const markDone = (p) => {
    const name = String(p.name || '').trim()
    const sm = (samples || []).find(
      (s) => String(s.name || '').trim() === name && getAccounts(s).includes(p.account),
    )
    const qty = Math.max(1, Number(p.qty) || 1)
    if (sm) {
      addPublishRecord({
        sampleId: sm.id,
        productId: sm.productId || '',
        accounts: [p.account],
        publishDate: p.planDate || todayStr(),
        qty,
      })
    }
    updatePublishPlan(p.id, { done: true, doneAt: Date.now() })
    show(
      sm ? `已标记发布，并写入发布记录（${p.account} · ${qty} 条）` : '已标记完成（未找到对应样品，未写发布记录）',
      'success',
    )
    setEditing(null)
  }
  // prefill = { name, account }：外部（提醒中心「新建计划」）带过来的产品名与账号
  const openNew = (prefill) => {
    const base = emptyByAcc()
    const acc = (prefill && prefill.account) || ACCOUNTS[0] || ''
    if (prefill && prefill.name) base[acc] = [{ name: String(prefill.name), qty: '1' }]
    setLockProduct(!!(prefill && prefill.name))
    setByAcc(base)
    setAccount(acc)
    setPlanDate(tomorrowStr())
    setEditEntry(newEntry())
    resetPicker()
    setEditing('new')
  }

  // 监听外部「新建计划」事件：打开新增弹窗并带上产品名/账号（用户要求「点击新建计划要弹出这个，带上产品名」）
  useEffect(() => {
    const onOpen = (e) => openNew(e && e.detail)
    window.addEventListener('wb:new-plan', onOpen)
    return () => window.removeEventListener('wb:new-plan', onOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const openEdit = (p) => {
    setLockProduct(false)
    setAccount(p.account || ACCOUNTS[0] || '')
    setPlanDate(p.planDate || tomorrowStr())
    setEditEntry({ name: p.name || '', qty: String(p.qty || 1) })
    resetPicker()
    setEditing(p)
  }

  const save = () => {
    if (isEditing) {
      const name = editEntry.name.trim()
      if (!name) { show('请选择发布产品', 'error'); return }
      updatePublishPlan(editing.id, {
        name,
        account,
        qty: Math.max(1, Number(editEntry.qty) || 1),
        planDate: planDate || '',
      })
      show('已保存', 'success')
      setFlashId(editing.id)
      setExpanded(true)   // 展开，保证刚改的那条不被折叠隐藏
      setEditing(null)
      return
    }
    let n = 0
    let lastId = ''
    for (const a of ACCOUNTS) {
      for (const e of (byAcc[a] || []).filter((x) => x.name && Number(x.qty) >= 1)) {
        const id = addPublishPlan({
          name: e.name.trim(),
          account: a,
          qty: Math.max(1, Number(e.qty) || 1),
          planDate: planDate || '',
        })
        if (id) lastId = id
        n++
      }
    }
    if (n === 0) { show('请先添加产品并填写数量', 'error'); return }
    show(`已加入 ${n} 条发布计划`, 'success')
    // 新增后滚到这一行并高亮（用户反馈「新增了一条消失不见了」：
    // 条目其实加进去了，但按时间排序可能落在卡片下方，一屏看不到）
    setFlashId(lastId)
    setExpanded(true)
    setEditing(null)
  }

  useEffect(() => {
    if (!flashId) return
    const t = setTimeout(() => {
      const row = document.querySelector(`tr[data-plan-id="${flashId}"]`)
      if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 80)
    const t2 = setTimeout(() => setFlashId(''), 4000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [flashId])

  return (
    <>
      <div className="pcv-card">
        <div className="pcv-card-h">
          <span>发布计划</span>
          {list.length > 0 && (
            <span className="pcv-chip" style={{ background: '#eef2ff', color: '#4f5fbb' }}>{upcoming} 待发</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>共 {accFiltered.length} 条</span>
          <button className="pcv-metric-add" style={{ marginLeft: 2 }} title="新增一条发布计划" onClick={openNew}>新增</button>
          <div className="pcv-spacer" />
        </div>

        {/* 账号筛选胶囊：只在「展开」时才显示（用户要求「没展开的时候不显示这个」），
            收起状态下卡片保持紧凑，点「查看全部 N 条」才出现筛选 */}
        {expanded && accOptions.length > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap',
            overflowX: 'auto', padding: '0 12px 8px',
          }}>
            <button
              onClick={() => { setAccFilter('') }}
              style={{
                padding: '3px 10px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                fontSize: 12, fontWeight: 600,
                border: accFilter === '' ? 'none' : '1px solid rgba(15,23,42,0.14)',
                background: accFilter === '' ? '#b8517f' : '#fff',
                color: accFilter === '' ? '#fff' : '#6b7280',
              }}
            >全部账号</button>
            {accOptions.map((a) => {
              const col = (ACCOUNT_COLOR[a] || {}).c || '#6b7280'
              const on = accFilter === a
              return (
                <button
                  key={a}
                  onClick={() => { setAccFilter(on ? '' : a) }}
                  style={{
                    padding: '3px 10px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                    fontSize: 12, fontWeight: 600,
                    border: on ? 'none' : `1px solid ${col}`,
                    background: on ? col : '#fff',
                    color: on ? '#fff' : col,
                  }}
                >{maskAccount(a, hiddenAccounts)}</button>
              )
            })}
          </div>
        )}

        {list.length === 0 ? (
          // 空态只占一行（用户要求）：文案缩短 + 单行省略，卡片高度不再被撑开
          <div
            className="pcv-empty"
            style={{ padding: '13px 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >还没有发布计划，点「新增」记一条</div>
        ) : accFiltered.length === 0 ? (
          <div
            className="pcv-empty"
            style={{ padding: '13px 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >该账号下还没有发布计划</div>
        ) : (
          // 卡片与「待办清单 / 待投流」并排（各占 1/3），表格五列放不下，
          // 改成紧凑两行式：第一行 产品 + ×数量，第二行 账号 · 时间 + 状态标签
          <div>
            {visible.map((p) => {
              const col = ACCOUNT_COLOR[p.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
              const overdue = p.planDate && p.planDate < today
              const isToday = p.planDate === today
              // 只有「当天及以前的计划」才能点完成；未来日期置灰不可点（用户要求）
              const canDone = !p.planDate || p.planDate <= today
              return (
                <div
                  key={p.id}
                  data-plan-id={p.id}
                  className="pcv-planrow"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                    borderTop: '0.5px solid rgba(15,23,42,0.05)',
                    // 同一天用同一个底色（用户要求「同一天的同一个背景色」），隔天换一档
                    background: flashId === p.id ? '#fff7e6' : (dateTone[p.planDate || ''] || '#fff'),
                    ...(flashId === p.id ? { transition: 'background .3s ease' } : null),
                  }}
                >
                  {/* 单行显示（用户要求）：产品名可截断，其余信息压到同一行 */}
                  <span
                    title={p.name}
                    style={{
                      flex: 1, minWidth: 40, fontSize: 14, color: '#333a45',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >{p.name}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#b8517f', background: '#fdf1f6',
                    padding: '2px 6px', borderRadius: 6, flexShrink: 0,
                  }}>×{p.qty || 1}</span>
                  {/* 账号：直接用账号主题色给文字上色，不再加圆点（用户要求「账号标颜色，不要圆点了」） */}
                  <span
                    title={p.account}
                    style={{
                      flexShrink: 0, maxWidth: 76, fontSize: 11, fontWeight: 600, color: col.c,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >{maskAccount(p.account, hiddenAccounts) || '—'}</span>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontVariantNumeric: 'tabular-nums',
                    color: overdue ? '#b96a66' : (isToday ? '#4f5fbb' : '#b0b6bf'),
                    fontWeight: (overdue || isToday) ? 600 : 400,
                  }}>
                    {(p.planDate || '').slice(5) || '—'}
                  </span>
                  {/* 操作按钮：默认隐藏，鼠标悬停该行才出现（用户要求「太紧凑了」）。
                      左边留 20px 空档：数量/账号/日期整块往左 20px，操作列仍贴住右边缘 */}
                  <span className="pcv-rowacts" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 14 }}>
                    {/* 完成：标记已发 + 自动写入发布记录（用户要求「加个完成按钮」）。
                        三个按钮放大到 24px、间距 8px，避免手快点错。
                        **未来日期的不给点**（用户要求「不是当天的不能点」），只能点当天及以前的 */}
                    <button
                      className="pcv-x"
                      title={canDone
                        ? '标记已发（同时写入发布记录）'
                        : `还没到发布时间（${p.planDate}），到那天才能标记完成`}
                      disabled={!canDone}
                      style={{
                        width: 24, height: 24, fontSize: 14,
                        color: canDone ? '#16a34a' : '#c9cdd4',
                        background: canDone ? 'rgba(22,163,74,0.10)' : 'rgba(148,163,184,0.14)',
                        cursor: canDone ? 'pointer' : 'not-allowed',
                      }}
                      onClick={() => { if (canDone) markDone(p) }}
                    >✓</button>
                    <button className="pcv-x" title="编辑" style={{ width: 24, height: 24, fontSize: 14, color: '#8a8f98' }} onClick={() => openEdit(p)}>✎</button>
                    <button
                      className="pcv-x"
                      title="删除"
                      style={{ width: 24, height: 24, fontSize: 14 }}
                      onClick={() => { deletePublishPlan(p.id); show('已删除', 'success') }}
                    >×</button>
                  </span>
                </div>
              )
            })}
            {/* 超过 5 条才出现展开入口（与「待办清单」一致）：展开后随卡片自然增高 */}
            {accFiltered.length > 5 && (
              <button
                className="pcv-btn-text"
                onClick={() => { if (expanded) setAccFilter(''); setExpanded((v) => !v) }}
                style={{
                  display: 'block', width: '100%', padding: '10px 14px', textAlign: 'center',
                  borderTop: '0.5px solid rgba(15, 23, 42, 0.05)', color: '#b8517f', fontWeight: 600,
                }}
              >
                {expanded ? '收起' : `查看全部 ${accFiltered.length} 条`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 新增 / 编辑弹窗：形态照「记录发布」（切账号 + 可多选行 + 数量加减） */}
      {editing && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog pcv-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{isEditing ? '编辑发布计划' : '新增发布计划'}</span>
              {!isEditing && (
                <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>切账号分别填，保存时一次记完</span>
              )}
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              {/* 发布时间 + 账号放在同一行（用户要求「PC 的可以放一行」），省一层高度 */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                <div style={{ flexShrink: 0 }}>
                  <div className="pcv-field-label">发布时间</div>
                  <input
                    className="pcv-input"
                    style={{ width: 150 }}
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                  />
                </div>
                {/* 先选账号、再选产品（用户要求）：产品候选按账号过滤 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pcv-field-label">账号</div>
                  <AccountTabs
                    value={account}
                    onChange={(a) => {
                      setAccount(a)
                      // 编辑态只有一行：换账号就把已选产品清掉，避免「A 账号 + B 账号的品」
                      if (isEditing) {
                        setEditEntry((prev) => ({ ...prev, name: '' }))
                      } else {
                        // 新增态：从提醒中心带进来的那条产品，换账号时跟着搬过去，
                        // 这样「带出来的账号不对」可以直接切到想要的账号（不用重新选产品）
                        setByAcc((prev) => {
                          const cur = prev[account] || []
                          const target = prev[a] || []
                          if (target.length === 0 && cur.length === 1 && cur[0] && cur[0].name) {
                            return { ...prev, [a]: [{ ...cur[0] }], [account]: [] }
                          }
                          return prev
                        })
                      }
                      resetPicker()
                    }}
                    counts={counts}
                  />
                </div>
              </div>

              {/* 从提醒中心「新建计划」进来时产品已带好：隐藏「发布产品 & 数量 / ＋添加 / 提示」，
                  只留那一条产品行（与手机端一致） */}
              {!compactLayout && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
                    <span className="pcv-field-label" style={{ margin: 0 }}>发布产品 &amp; 数量（可多选）</span>
                    <div className="pcv-spacer" />
                    {!isEditing && <button className="pcv-btn pcv-btn-ghost" onClick={addEntry}>＋ 添加</button>}
                  </div>
                  <div style={{ fontSize: 11, color: '#9aa0a9', marginBottom: 6 }}>
                    只能选「{account}」的样品（已放弃的不会出现）
                  </div>
                </>
              )}

              {/* 从提醒中心进来时上面的标签被隐藏了，这里补上下间距，别贴着账号 tab */}
              <div className="pcv-entrylist" style={compactLayout ? { marginTop: 18, marginBottom: 6 } : undefined}>
                {/* 空态本身可点：直接新增一行并展开选品面板 */}
                {entries.length === 0 && !isEditing && (
                  <button className="pcv-entry-empty" onClick={addEntry}>
                    ＋ 点这里新增一条「产品 + 数量」
                  </button>
                )}
                {entries.map((e, idx) => (
                  <div key={idx}>
                    <div className="pcv-entry">
                      <button
                        className={`pcv-entry-pick${e.name ? '' : ' empty'}`}
                        /* 从提醒中心进来（产品锁定）：产品名占固定 280px，数量加减跟在其后 ——
                           既不会贴到弹窗最右边，也不会紧贴产品名（用户要求「数量框往右一点」） */
                        style={compactLayout ? { flex: '0 0 280px', maxWidth: 280 } : undefined}
                        onClick={() => { setPickIdx(pickIdx === idx ? -1 : idx); setQuery(''); setCatFilter(''); setPicked([]) }}
                      >
                        {e.name || '点击选择产品'}
                      </button>
                      <div className="pcv-qty">
                        <button type="button" onClick={() => bumpQty(idx, -1)}>−</button>
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
                        <button type="button" onClick={() => bumpQty(idx, 1)}>＋</button>
                      </div>
                      {/* 锁定态：把剩余空间推到右边，让「产品 + 数量」整体靠左 */}
                      {compactLayout && <div style={{ flex: 1 }} />}
                    </div>

                    {/* 产品选择面板：内联展开在该行下面，点一行即选中 */}
                    {pickIdx === idx && (
                      <div className="pcv-drop">
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
                          placeholder="搜索产品名…"
                          value={query}
                          onChange={(ev) => setQuery(ev.target.value)}
                          autoFocus
                        />
                        <div className="pcv-drop-list">
                          {candidates.length === 0 ? (
                            <div className="pcv-drop-hint">该账号下还没有样品（已放弃的不列出）</div>
                          ) : filtered.length === 0 ? (
                            <div className="pcv-drop-hint">没有匹配的产品</div>
                          ) : filtered.map((c) => {
                            const on = picked.includes(c.name)
                            return (
                              <button
                                key={c.name}
                                className={`pcv-drop-row${on ? ' on' : ''}`}
                                title={on ? '已勾选，再点一下取消' : '点一下勾选这条产品（可多选）'}
                                onClick={() => pickProduct(c.name)}
                              >
                                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                                {on && <span className="pcv-drop-check">✓</span>}
                              </button>
                            )
                          })}
                        </div>
                        {/* 底部：已选数量 + 取消 / 确定（可多选，勾完点确定才填进条目） */}
                        <div className="pcv-drop-f">
                          <span style={{ fontSize: 12, color: picked.length ? '#b8517f' : '#9aa0a9' }}>
                            {picked.length > 0 ? `已选 ${picked.length} 条` : '可勾选多个产品'}
                          </span>
                          <div className="pcv-spacer" />
                          <button className="pcv-btn pcv-btn-ghost" onClick={resetPicker}>取消</button>
                          <button
                            className="pcv-btn"
                            style={{ marginLeft: 8 }}
                            disabled={picked.length === 0}
                            onClick={confirmPicked}
                          >确定{picked.length > 1 ? ` ${picked.length} 条` : ''}</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="pcv-dialog-f">
              {/* 编辑态：行内不放「完成」按钮了（用户要求列表更清爽），改到这里标记已发 */}
              {isEditing && (() => {
                // 未来日期的计划还不能标记完成（与行内 ✓ 一致）
                const ok = !planDate || planDate <= today
                return (
                  <button
                    className="pcv-btn pcv-btn-ghost"
                    disabled={!ok}
                    title={ok ? '标记已发（同时写入发布记录）' : `还没到发布时间（${planDate}）`}
                    style={{
                      color: ok ? '#16a34a' : '#c9cdd4',
                      borderColor: ok ? 'rgba(22,163,74,0.35)' : 'rgba(148,163,184,0.35)',
                      cursor: ok ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => { if (ok) markDone(editing) }}
                  >标记已发</button>
                )
              })()}
              <span style={{ fontSize: 12, color: '#9aa0a9' }}>
                {total > 0
                  ? `共 ${total} 条（${ACCOUNTS.filter((a) => counts[a] > 0).map((a) => `${a} ${counts[a]}`).join('、')}）`
                  : '还没有条目'}
              </span>
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button
                className="pcv-btn"
                style={{ marginLeft: 10 }}
                onClick={save}
                disabled={total === 0}
              >保存{total > 1 ? ` ${total} 条` : ''}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
