import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { CATEGORIES } from '../../utils/categories'
import { CATEGORY_STYLE, displayTitle, getIconInfo } from '../../utils/productDisplay'
import { copyText as writeClipboard } from '../../utils/clipboard'
import { ProductDialog } from '../components/ProductDialog'
import { CopyDialog } from '../components/CopyDialog'
import { CopyImportDialog } from '../components/CopyImportDialog'
import { TopicDialog, allTopicTags } from '../components/TopicDialog'
import { ResetButton } from '../components/ResetButton'
import { todayStr } from '../../utils/helpers'
import { generateSimilarCopy, getStyles, rewriteSimilar } from '../../utils/copyGenerator'
import { readTextFiles } from '../../utils/readTextFile'
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 每条文案的状态标记，与手机版 ProductDetailPage 的 CopyCard 一一对应：
// 出单 / 爆单 / 用过三个可切换标记（手机版是三颗按钮，PC 版做成可切换的小标签）。
// 配色（用户指定，两端统一）：出单=绿 / 爆单=红 / 用过=黄。
// bar 是卡片左侧那条 3px 竖条的颜色，优先级由数组顺序决定：出单 > 爆单 > 用过。
// icon 用 ¥ / SVG 火焰 / ✓ 这类「跟随 currentColor」的符号：
// 未选中时它们是灰的，选中后跟着标签一起变深色，不会像 emoji 那样永远彩色。
const COPY_FLAGS = [
  { key: 'hasOrder', label: '出单', icon: 'bag', bg: '#d8ecdf', fg: '#2f6b4a', border: 'rgba(47,107,74,.28)', bar: '#8fbf9f' },
  { key: 'hasHot', label: '爆单', icon: 'flame', bg: '#fadada', fg: '#b3261e', border: 'rgba(179,38,30,.24)', bar: '#e08a86' },
  { key: 'used', label: '用过', icon: 'check', bg: '#fbeccd', fg: '#96620a', border: 'rgba(150,98,10,.26)', bar: '#e8c07a' },
]

// 标记按钮里的小图标（11px，走 currentColor）
function FlagIcon({ kind }) {
  // 出单：**实心**购物袋。11px 下线性图标会被压成一团糊，实心剪影才认得出来。
  if (kind === 'bag') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2z" />
      </svg>
    )
  }
  if (kind === 'flame') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14a8 8 0 1 0 16 0c0-5.39-3.46-9.9-6.5-13.33zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
      </svg>
    )
  }
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  )
}

// 「用过」距今多久：今天 / 昨天 / N天前（与手机版 CopyCard 同口径）。
// usedDate 存的是 YYYY-MM-DD，解析失败时原样返回，避免脏数据把日期显示成 NaN。
function usedAgo(dateStr) {
  const t = new Date(`${String(dateStr).replace(/\//g, '-')}T00:00:00`).getTime()
  if (Number.isNaN(t)) return String(dateStr)
  const today = new Date(`${todayStr()}T00:00:00`).getTime()
  const diff = Math.round((today - t) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff > 1) return `${diff}天前`
  return `${-diff}天后`
}

// 可拖拽排序的产品行。
// 拖动把手不再单独占一列（用户要求去掉最左边那列），改成把把手交给 children 渲染，
// 由调用方放进「操作」列 —— 行首因此不再有一条突兀的拖动列。
function SortableProductRow({ p, isActive, onClick, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#fdf2f8' : undefined,
  }
  // 拖动把手：四向移动箭头（上下左右），语义就是「拖动」，
  // 用描边风格（fill:none + stroke）与侧边栏那套图标同一种笔画语言
  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e) }}
      onClick={(e) => e.stopPropagation()}
      title="按住拖动排序"
      className="pcv-draghandle"
    >
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 9l-3 3 3 3" />
        <path d="M9 5l3-3 3 3" />
        <path d="M15 19l-3 3-3-3" />
        <path d="M19 9l3 3-3 3" />
        <path d="M2 12h20" />
        <path d="M12 2v20" />
      </svg>
    </button>
  )
  return (
    <tr ref={setNodeRef} style={style} className={isActive ? 'on' : ''} onClick={onClick}>
      {children(dragHandle)}
    </tr>
  )
}

// 操作列按钮里的小图标（12px，实心，跟随 currentColor —— 置顶/置底变粉变蓝时图标一起变色）
function ActIcon({ d, rotate }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
      style={{ transform: rotate ? 'rotate(180deg)' : undefined, flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  )
}
const ICON_PIN = 'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z'
const ICON_EDIT = 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
const ICON_TRASH = 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'

// PC 版文案库：左表右详情。
// 数据全部来自同一个 store（与手机版完全一致），这里只重排展示。
export function PcProducts() {
  const { show } = useToast()
  const { products, updateCopy, deleteCopy, deleteProduct, updateProduct, reorderProducts, addCopy } = useStore()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [activeId, setActiveId] = useState('')
  const [delTarget, setDelTarget] = useState(null)   // 待删除的「文案」
  const [delProduct, setDelProduct] = useState(null) // 待删除的「产品」（之前漏了状态，点删除会静默报错）
  // 右侧文案列表的筛选：all / order（已出单）/ hot（已爆单）/ used（已用过）
  const [copyFilter, setCopyFilter] = useState('all')
  // 产品新增/编辑走弹窗（editing: 'new' | 产品对象 | null），不跳页面
  const [editing, setEditing] = useState(null)
  // 文案编辑弹窗：undefined=关闭、文案对象=打开
  const [copyDialog, setCopyDialog] = useState(undefined)
  // 相似文案生成弹窗
  const [simOpen, setSimOpen] = useState(null) // {copy}
  const [simResults, setSimResults] = useState([])
  const [simLoading, setSimLoading] = useState(false)
  // 批量导入文案弹窗 / 话题管理弹窗（用户要求：PC 端都要有，且都不跳页面）
  const [importOpen, setImportOpen] = useState(false)
  // 「📄 导入 txt」：读文件 → 预填进导入弹窗预览 → 确认后入库（入口在卡片头，与「# 话题 / ＋ 新增文案」同一排）
  const [importText, setImportText] = useState('')
  const copyFileRef = useRef(null)
  const [topicOpen, setTopicOpen] = useState(false)

  // 左右分栏宽度可拖动（用户要求），并记住上次的宽度。
  // 上下限 320~900：再窄产品表四列会挤到出横向滚动条，再宽右栏就没意义了。
  const SPLIT_KEY = 'pc_products_split_w'
  const [splitW, setSplitW] = useState(() => {
    const v = Number(localStorage.getItem(SPLIT_KEY))
    // 默认 560：1440 视口下右栏仍比左栏宽，符合「左边小一点」的诉求。可拖 320~900。
    return v >= 320 && v <= 900 ? v : 560
  })
  const splitWRef = useRef(splitW)
  const [dragging, setDragging] = useState(false)

  const onHandleDown = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = splitW
    setDragging(true)
    const move = (ev) => {
      const w = Math.min(900, Math.max(320, startW + (ev.clientX - startX)))
      splitWRef.current = w
      setSplitW(w)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.userSelect = ''
      setDragging(false)
      try { localStorage.setItem(SPLIT_KEY, String(splitWRef.current)) } catch (err) { /* 隐私模式忽略 */ }
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const arr = (products || []).filter((p) => {
      if (category && p.category !== category) return false
      if (!kw) return true
      return `${p.brand || ''} ${p.name || ''}`.toLowerCase().includes(kw)
    })
    // 置顶最前，置底最后，其余保持原顺序
    return arr.sort((a, b) => {
      const rank = (p) => p.pinned ? 0 : p.pinnedBottom ? 2 : 1
      return rank(a) - rank(b)
    })
  }, [products, keyword, category])

  // 置顶：写在产品记录上（pinned 字段），随 store 一起落本地 + 云同步，换设备也在
  const togglePin = (p) => updateProduct(p.id, { pinned: !p.pinned })
  const togglePinBottom = (p) => updateProduct(p.id, { pinnedBottom: !p.pinnedBottom })

  // 拖动排序
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const onDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = list.findIndex((p) => p.id === active.id)
    const newIndex = list.findIndex((p) => p.id === over.id)
    const newList = arrayMove(list, oldIndex, newIndex)
    reorderProducts(newList.map((p) => p.id))
  }

  // 选中的产品：默认取第一行；筛选后若选中项被过滤掉，自动回落到第一行
  const active = list.find((p) => p.id === activeId) || list[0] || null

  const totalCopies = (products || []).reduce((n, p) => n + (p.copies?.length || 0), 0)

  // 右侧文案筛选：切产品时自动回到「全部」，否则换了产品还停在「已出单」容易以为没数据
  useEffect(() => { setCopyFilter('all') }, [activeId])
  const activeCopies = active?.copies || []
  const copyCounts = useMemo(() => {
    const used = activeCopies.filter((c) => c.used).length
    return {
      all: activeCopies.length,
      order: activeCopies.filter((c) => c.hasOrder).length,
      hot: activeCopies.filter((c) => c.hasHot).length,
      used,
      // 未用过 = 总数 − 已用过（同一份数据的补集，不会对不上）
      unused: activeCopies.length - used,
    }
  }, [activeCopies])
  const copyList = useMemo(() => {
    let base = activeCopies
    if (copyFilter === 'unused') base = activeCopies.filter((c) => !c.used)
    else if (copyFilter !== 'all') {
      const key = copyFilter === 'order' ? 'hasOrder' : copyFilter === 'hot' ? 'hasHot' : 'used'
      base = activeCopies.filter((c) => c[key])
    }
    // 置顶的最前（用户新增），其余按标记排：爆单 → 出单 → 用过 → 未标记。
    // 组内保持原有顺序（Array.sort 稳定），不会把同状态的文案打乱。
    const rank = (c) => (c.hasHot ? 0 : c.hasOrder ? 1 : c.used ? 2 : 3)
    return [...base].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
      return rank(a) - rank(b)
    })
  }, [activeCopies, copyFilter])

  // 话题（产品级 ∪ 所有文案自带，去重、按 # 拆分），与手机版 ProductDetailPage 同口径
  const topics = active ? allTopicTags(active) : []

  // 复制全部话题：单个 # 前缀 + 空格分隔，与手机版一致
  const copyAllTopics = () => {
    if (topics.length === 0) { show('这个产品还没有话题', 'error'); return }
    writeClipboard(topics.map((t) => '#' + t).join(' ')).then((ok) => {
      show(ok ? `已复制 ${topics.length} 个话题` : '复制失败', ok ? 'success' : 'error')
    })
  }

  // 文案置顶：写在文案记录上（copies[].pinned），随产品一起落本地 + 云同步，换设备也在。
  // 排序见 copyList：置顶的一律排最前，再按爆单/出单/用过排。
  const togglePinCopy = (c) => {
    if (!active) return
    updateCopy(active.id, c.id, { pinned: !c.pinned })
    show(!c.pinned ? '已置顶这条文案' : '已取消置顶', 'success')
  }

  // 复制：与手机版一致 —— 复制成功即视为「用过」，顺带写 usedDate
  const copyOne = (c) => {
    writeClipboard(c.content).then((ok) => {
      show(ok ? '文案已复制' : '复制失败', ok ? 'success' : 'error')
      if (ok && active) updateCopy(active.id, c.id, { used: true, usedDate: todayStr() })
    })
  }

  // 生成相似文案：保持原文格式/字数，只换几个词
  const openSimilar = (c) => {
    setSimOpen({ copy: c })
    setSimResults([])
    setSimLoading(true)
    setTimeout(() => {
      setSimResults(rewriteSimilar(c.content, 4).map((content, i) => ({
        id: Date.now() + i,
        content,
        collected: false,
      })))
      setSimLoading(false)
    }, 400)
  }
  const collectSimilar = (r) => {
    addCopy(active.id, { content: r.content })
    setSimResults((rs) => rs.map((x) => x.id === r.id ? { ...x, collected: true } : x))
    show('已收藏到文案库', 'success')
    setTimeout(() => setSimOpen(null), 400)
  }

  // 三个标记的切换语义与手机版 ProductDetailPage 完全对齐：
  // 出单 → hasOrder + used + usedDate（保留已有 usedDate）；爆单 → hasHot；用过 → used + usedDate
  const toggleFlag = (c, key) => {
    if (!active) return
    if (key === 'hasOrder') {
      updateCopy(active.id, c.id, {
        hasOrder: !c.hasOrder,
        used: true,
        usedDate: c.usedDate || todayStr(),
      })
      show(!c.hasOrder ? '已标记「出单」' : '已取消出单', 'success')
    } else if (key === 'hasHot') {
      updateCopy(active.id, c.id, { hasHot: !c.hasHot })
      show(!c.hasHot ? '🔥 已标记「爆单」' : '已取消「爆单」', 'success')
    } else if (c.used) {
      updateCopy(active.id, c.id, { used: false, usedDate: null })
      show('已取消「用过」', 'success')
    } else {
      updateCopy(active.id, c.id, { used: true, usedDate: todayStr() })
      show('已标记「用过」', 'success')
    }
  }

  const confirmDeleteCopy = () => {
    if (!delTarget || !active) return
    deleteCopy(active.id, delTarget.id)
    setDelTarget(null)
    show('文案已删除', 'success')
  }

  // 删除产品：连同它下面的文案一起删（store 里 deleteProduct 会整条移除）
  const confirmDeleteProduct = () => {
    if (!delProduct) return
    deleteProduct(delProduct.id)
    if (activeId === delProduct.id) setActiveId('')   // 清掉选中，右侧回落到第一行
    setDelProduct(null)
    show('产品已删除', 'success')
  }

  // 重置：只清「搜索 + 分类筛选」，不动当前选中的产品（那是浏览位置，不是筛选）
  const hasFilter = keyword !== '' || category !== ''
  const resetFilters = () => {
    setKeyword('')
    setCategory('')
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">文案库</div>
          <div className="pcv-sub">{(products || []).length} 个产品 · {totalCopies} 条文案</div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 240 }}
          placeholder="搜索产品 / 品牌"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button className="pcv-btn" onClick={() => setEditing('new')}>新增产品</button>
      </div>

      {/* 整屏不滚：外壳固定一屏高，左右两栏各自滚动（见 pc.css 的 --fill / --scroll） */}
      <div className="pcv-body pcv-body--fill">
        <div className="pcv-accountbar" style={{ padding: '0 0 12px', borderBottom: 'none' }}>
          <button className={category === '' ? 'on' : ''} onClick={() => setCategory('')}>全部</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>{c}</button>
          ))}
          <ResetButton active={hasFilter} onClick={resetFilters} />
        </div>

        <div
          className="pcv-split pcv-split--fill"
          // 三列：左固定 px（可拖） / 拖动条 / 右 1fr；gap 交给拖动条自己，所以这里 gap 设 0
          style={{ gridTemplateColumns: `${splitW}px 14px minmax(0, 1fr)`, gap: 0 }}
        >
          {/* 左：产品表。卡片自己滚，表头 sticky 不跟着滚 */}
          <div className="pcv-card pcv-card--scroll">
            <table className="pcv-table">
              <thead>
                <tr>
                  {/* 操作列 46% → 50%：按钮加了图标后每个宽约 60px，四个 + 拖动把手约需 270px */}
                  <th style={{ width: '36%' }}>产品</th>
                  <th style={{ width: '14%' }}>分类</th>
                  <th style={{ width: '50%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="pcv-empty">没有匹配的产品</td>
                  </tr>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={list.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                      {list.map((p) => {
                        const st = CATEGORY_STYLE[p.category] || CATEGORY_STYLE['其他']
                        const icon = getIconInfo(p.name, p.category)
                        return (
                          <SortableProductRow
                            key={p.id}
                            p={p}
                            isActive={active && p.id === active.id}
                            onClick={() => setActiveId(p.id)}
                          >
                            {(dragHandle) => (
                              <>
                            <td>
                              {/* 产品名前的置顶图钉已去掉（用户要求）：置顶状态由操作列按钮的高亮表达，
                                  行首只留「分类图标 + 名称」，更干净 */}
                              <span className="pcv-namecell">
                                <span className="pcv-caticon" style={{ background: icon.bg, color: icon.color }}>{icon.text}</span>
                                <span className="pcv-nametext" title={displayTitle(p)}>{displayTitle(p)}</span>
                              </span>
                            </td>
                            <td>
                              {p.category && (
                                <span className="pcv-chip" style={{ background: '#f3f4f6', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, opacity: 0.7, background: st.color }} />
                                  {p.category}
                                </span>
                              )}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {/* 拖动把手放在最前面（原来单独占一列，已被去掉） */}
                              {dragHandle}
                              <button
                                className="pcv-btn pcv-btn-ghost"
                                style={{ padding: '4px 8px', fontSize: 12, marginLeft: 2, display: 'inline-flex', alignItems: 'center', gap: 3, ...(p.pinned ? { color: '#b8517f', borderColor: 'rgba(184,81,127,0.45)' } : null) }}
                                title={p.pinned ? '取消置顶' : '置顶'}
                                onClick={(e) => { e.stopPropagation(); togglePin(p) }}
                              ><ActIcon d={ICON_PIN} />置顶</button>
                              <button
                                className="pcv-btn pcv-btn-ghost"
                                style={{ padding: '4px 8px', fontSize: 12, marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 3, ...(p.pinnedBottom ? { color: '#2563eb', borderColor: 'rgba(37,99,235,0.45)' } : null) }}
                                title={p.pinnedBottom ? '取消置底' : '置底'}
                                onClick={(e) => { e.stopPropagation(); togglePinBottom(p) }}
                              ><ActIcon d={ICON_PIN} rotate />置底</button>
                              <button
                                className="pcv-btn pcv-btn-ghost"
                                style={{ padding: '4px 8px', fontSize: 12, marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                onClick={(e) => { e.stopPropagation(); setEditing(p) }}
                              ><ActIcon d={ICON_EDIT} />编辑</button>
                              <button
                                className="pcv-btn pcv-btn-ghost pcv-btn-ghost--danger"
                                style={{ padding: '4px 8px', fontSize: 12, marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                onClick={(e) => { e.stopPropagation(); setDelProduct(p) }}
                              ><ActIcon d={ICON_TRASH} />删除</button>
                            </td>
                              </>
                            )}
                          </SortableProductRow>
                        )
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </tbody>
            </table>
          </div>

          {/* 拖动条：按住左右拖可调整分栏宽度（宽度会记住） */}
          <div
            className={`pcv-split-handle${dragging ? ' dragging' : ''}`}
            onPointerDown={onHandleDown}
            title="拖动调整宽度"
          />

          {/* 右：选中产品的文案。同样卡片自己滚，卡头 sticky 钉在顶部 */}
          <div className="pcv-card pcv-card--scroll">
            {!active ? (
              <div className="pcv-empty">左侧选一个产品，这里显示它的文案</div>
            ) : (
              <>
                {/* 顶部三行（产品名 / 话题 / 筛选）整体固定在卡片顶部，不随文案列表滚动
                    —— 用户要求「这部分固定住」 */}
                <div className="pcv-copys-head">
                <div className="pcv-card-h">
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayTitle(active)}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>{active.copies?.length || 0} 条</span>
                  <div className="pcv-spacer" />
                  {/* 「打开详情」「编辑」按用户要求去掉了。
                      产品改名/改分类在左表的行内「编辑」里还有入口，功能没丢；
                      手机版产品详情页在 PC 上不再有入口（它的功能这边都有了）。 */}
                  {/* 与手机版产品详情页同一组入口：话题管理 + 批量导入文案 */}
                  <button className="pcv-btn-text" onClick={() => setTopicOpen(true)}>
                    # 话题{topics.length > 0 ? ` ${topics.length}` : ''}
                  </button>
                  {/* 导入 txt：选文件 → 读内容 → 打开导入弹窗预览（用户要求放在这一排） */}
                  <input
                    ref={copyFileRef}
                    type="file"
                    accept=".txt,.md,text/plain"
                    multiple
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const files = [...(e.target.files || [])]
                      e.target.value = ''
                      if (!files.length) return
                      try {
                        const merged = await readTextFiles(files)
                        if (!merged) { show('文件是空的', 'error'); return }
                        setImportText(merged)
                        setImportOpen(true)
                      } catch (err) {
                        show('读取文件失败，请确认是文本文件', 'error')
                      }
                    }}
                  />
                  <button
                    className="pcv-btn pcv-btn-ghost"
                    onClick={() => { if (copyFileRef.current) copyFileRef.current.click() }}
                    title="导入 txt / md 文档，自动识别编码与分段"
                    style={{ color: '#7a5ea8', borderColor: 'rgba(122,94,168,0.75)', background: '#f7f2fc', fontWeight: 600 }}
                  >
                    📄 导入 txt
                  </button>
                  <button className="pcv-btn pcv-btn-ghost" onClick={() => { setImportText(''); setImportOpen(true) }}>＋ 新增文案</button>
                </div>

                {/* 话题行：常驻显示（产品级 ∪ 文案自带，去重），右侧给一个复制全部话题的快捷入口。
                    不放进 .pcv-card-h 里 —— 那个是 sticky 的，话题多的时候会把列表挤下去。 */}
                {topics.length > 0 && (
                  <div className="pcv-topicrow">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9aa0a9', flexShrink: 0 }}>话题</span>
                    {topics.map((t, i) => (
                      <span key={i} className="pcv-topic">{t}</span>
                    ))}
                    <button className="pcv-btn-text" style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={copyAllTopics}>
                      复制全部
                    </button>
                  </div>
                )}

                {/* 文案筛选：按标记过滤。0 条的项一般不显示（避免一排空选项），
                    但「未用过」常显（用户要求）：它是最常用的反向筛选，
                    为 0 时也要能点进去看（显示「没有未用过的文案」的空态） */}
                {activeCopies.length > 0 && (
                  <div className="pcv-copyfilter">
                    {[
                      { key: 'all', label: '全部', n: copyCounts.all },
                      { key: 'order', label: '已出单', n: copyCounts.order, color: '#5f8a74' },
                      { key: 'hot', label: '已爆单', n: copyCounts.hot, color: '#c0392b' },
                      { key: 'used', label: '已用过', n: copyCounts.used, color: '#b7791f' },
                      { key: 'unused', label: '未用过', n: copyCounts.unused, color: '#8a8f98' },
                    ].filter((f) => f.key === 'all' || f.key === 'unused' || f.n > 0).map((f) => (
                      <button
                        key={f.key}
                        className={copyFilter === f.key ? 'on' : ''}
                        style={copyFilter === f.key && f.color ? { color: f.color, borderColor: f.color } : undefined}
                        onClick={() => setCopyFilter(f.key)}
                      >
                        {f.label} {f.n}
                      </button>
                    ))}
                  </div>
                )}

                </div>{/* /pcv-copys-head 固定区结束 */}

                {activeCopies.length === 0 ? (
                  <div className="pcv-empty">这个产品还没有文案，点右上角「＋ 新增文案」粘贴一批</div>
                ) : copyList.length === 0 ? (
                  <div className="pcv-empty">这个产品还没有「{({ order: '已出单', hot: '已爆单', used: '已用过', unused: '未用过' })[copyFilter] || ''}」的文案</div>
                ) : (
                  copyList.map((c) => {
                    // 竖条颜色直接取 COPY_FLAGS（数组顺序即优先级：出单 > 爆单 > 用过），
                    // 不再在这里重复写一遍色值，改配色只需动上面那张表。
                    const bar = (COPY_FLAGS.find((f) => c[f.key]) || {}).bar || null
                    return (
                      <div
                        key={c.id}
                        className="pcv-copyitem"
                        // 左侧 3px 竖条标状态：已置顶优先显示粉色，其余与手机版 CopyCard 同口径（出单 > 爆单 > 用过）
                        style={c.pinned
                          ? { boxShadow: 'inset 3px 0 0 #b8517f', background: '#fdf9fb' }
                          : (bar ? { boxShadow: `inset 3px 0 0 ${bar}` } : undefined)}
                      >
                        <div className="pcv-copytext">{c.content}</div>
                        <div className="pcv-copyfoot">
                          {/* 相似按钮暂时隐藏
                          <button className="pcv-btn" style={{ padding: '7px 8px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(99,102,241,0.12)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.3)' }} onClick={() => openSimilar(c)}>✨相似</button>
                          */}
                          {/* 复制放最前（用户要求）：最常用的动作固定在行首，眼睛不用来回找 */}
                          <button
                            className="pcv-btn"
                            style={{ padding: '7px 8px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            onClick={() => copyOne(c)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="9" y="9" width="12" height="12" rx="2" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                            复制
                          </button>
                          {COPY_FLAGS.map((f) => (
                            <button
                              key={f.key}
                              className="pcv-flag"
                              style={c[f.key]
                                ? { background: f.bg, color: f.fg, borderColor: f.border, fontWeight: 700 }
                                : undefined}
                              onClick={() => toggleFlag(c, f.key)}
                            >
                              <FlagIcon kind={f.icon} />
                              {f.label}
                            </button>
                          ))}
                          {/* 「用过」后跟时间（与手机版 CopyCard 同口径：今天 / N天前），
                              日期本身放 title，鼠标悬停可看具体哪一天 */}
                          {c.used && c.usedDate && (
                            <span
                              title={c.usedDate}
                              style={{ fontSize: 11, fontWeight: 600, color: '#b7791f', whiteSpace: 'nowrap', marginLeft: 2 }}
                            >
                              {usedAgo(c.usedDate)}
                            </span>
                          )}
                          {/* 置顶：钉在最前（用户新增功能）。已置顶时按钮变粉底粉边，
                              文案项左侧也加一条粉色竖条作为长期标识 */}
                          <button
                            className={`pcv-btn pcv-btn-ghost${c.pinned ? ' pcv-pin-btn--on' : ''}`}
                            style={{ padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title={c.pinned ? '取消置顶' : '置顶这条文案'}
                            onClick={() => togglePinCopy(c)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                            </svg>
                            {c.pinned ? '已置顶' : '置顶'}
                          </button>
                          {/* 编辑 / 删除：次要操作，保持描边样式，紧跟标记与用过时间之后 */}
                          <button className="pcv-btn pcv-btn-ghost" style={{ padding: '5px 10px' }} onClick={() => setCopyDialog(c)}>编辑</button>
                          <button
                            className="pcv-btn pcv-btn-ghost pcv-btn-ghost--danger"
                            style={{ padding: '5px 10px' }}
                            onClick={() => setDelTarget(c)}
                          >删除</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 删除产品二次确认：会连同该产品下的全部文案一起删掉 */}
      <ConfirmModal
        open={!!delProduct}
        onClose={() => setDelProduct(null)}
        onConfirm={confirmDeleteProduct}
        title="删除产品"
        message={`确定删除产品「${delProduct ? displayTitle(delProduct) : ''}」吗？该产品下的 ${delProduct?.copies?.length || 0} 条文案会一起删除，此操作不可撤销。`}
        confirmText="删除"
        danger
      />

      {/* 删除文案二次确认（与手机版一致，删除不可撤销） */}
      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={confirmDeleteCopy}
        title="删除文案"
        message="确定删除这条文案吗？此操作不可撤销。"
      />

      {/* 产品新增/编辑：弹窗，不跳页面 */}
      <ProductDialog
        key={editing === 'new' ? 'new' : (editing?.id || 'none')}
        editing={editing}
        onClose={() => setEditing(null)}
      />

      {/* 编辑文案：弹窗，不跳页面 */}
      {copyDialog !== undefined && (
        <CopyDialog product={active} copy={copyDialog} onClose={() => setCopyDialog(undefined)} />
      )}

      {/* 相似文案弹窗 */}
      {simOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSimOpen(null)}>
          <div style={{ background: '#fff', borderRadius: 14, width: 560, maxWidth: '92vw', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 16 }}>生成相似文案</strong>
              <button onClick={() => setSimOpen(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 28, height: 28, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>原文案</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{simOpen.copy.content}</div>
              </div>
              {simLoading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>生成中…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {simResults.map((r) => (
                    <div key={r.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{r.content}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => writeClipboard(r.content)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #c4b5fd', background: '#fff', color: '#6d28d9', fontWeight: 600, cursor: 'pointer' }}>复制</button>
                        <button onClick={() => collectSimilar(r)} disabled={r.collected} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: r.collected ? '#10b981' : '#8b5cf6', color: '#fff', fontWeight: 600, cursor: r.collected ? 'default' : 'pointer' }}>{r.collected ? '已收藏' : '收藏'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 批量导入文案：弹窗（手机版是 /batch-import 整页，PC 不跳页面） */}
      {importOpen && active && (
        <CopyImportDialog
          product={active}
          initialText={importText}
          onClose={() => { setImportOpen(false); setImportText('') }}
        />
      )}

      {/* 话题管理：弹窗 */}
      {topicOpen && active && <TopicDialog product={active} onClose={() => setTopicOpen(false)} />}
    </>
  )
}
