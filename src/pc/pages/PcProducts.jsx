import { useMemo, useRef, useState } from 'react'
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

// 每条文案的状态标记，与手机版 ProductDetailPage 的 CopyCard 一一对应：
// 出单 / 爆单 / 用过三个可切换标记（手机版是三颗按钮，PC 版做成可切换的小标签）。
// bar 是卡片左侧那条 3px 竖条的颜色，优先级同手机版：出单 > 爆单 > 用过。
const COPY_FLAGS = [
  { key: 'hasOrder', label: '出单', bg: '#faf1e3', fg: '#a97c46', bar: '#e3c07e' },
  { key: 'hasHot', label: '爆单', bg: '#fbeaea', fg: '#b96a66', bar: '#dd9a95' },
  { key: 'used', label: '用过', bg: '#eef2f5', fg: '#6b7d87', bar: '#9dbecb' },
]

// PC 版文案库：左表右详情。
// 数据全部来自同一个 store（与手机版完全一致），这里只重排展示。
export function PcProducts() {
  const { show } = useToast()
  const { products, updateCopy, deleteCopy, deleteProduct } = useStore()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [activeId, setActiveId] = useState('')
  const [delTarget, setDelTarget] = useState(null)
  // 产品新增/编辑走弹窗（editing: 'new' | 产品对象 | null），不跳页面
  const [editing, setEditing] = useState(null)
  // 文案编辑弹窗：undefined=关闭、文案对象=打开
  const [copyDialog, setCopyDialog] = useState(undefined)
  // 批量导入文案弹窗 / 话题管理弹窗（用户要求：PC 端都要有，且都不跳页面）
  const [importOpen, setImportOpen] = useState(false)
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
    return (products || []).filter((p) => {
      if (category && p.category !== category) return false
      if (!kw) return true
      return `${p.brand || ''} ${p.name || ''}`.toLowerCase().includes(kw)
    })
  }, [products, keyword, category])

  // 选中的产品：默认取第一行；筛选后若选中项被过滤掉，自动回落到第一行
  const active = list.find((p) => p.id === activeId) || list[0] || null

  const totalCopies = (products || []).reduce((n, p) => n + (p.copies?.length || 0), 0)

  // 话题（产品级 ∪ 所有文案自带，去重、按 # 拆分），与手机版 ProductDetailPage 同口径
  const topics = active ? allTopicTags(active) : []

  // 复制全部话题：单个 # 前缀 + 空格分隔，与手机版一致
  const copyAllTopics = () => {
    if (topics.length === 0) { show('这个产品还没有话题', 'error'); return }
    writeClipboard(topics.map((t) => '#' + t).join(' ')).then((ok) => {
      show(ok ? `已复制 ${topics.length} 个话题` : '复制失败', ok ? 'success' : 'error')
    })
  }

  // 复制：与手机版一致 —— 复制成功即视为「用过」，顺带写 usedDate
  const copyOne = (c) => {
    writeClipboard(c.content).then((ok) => {
      show(ok ? '文案已复制' : '复制失败', ok ? 'success' : 'error')
      if (ok && active) updateCopy(active.id, c.id, { used: true, usedDate: todayStr() })
    })
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
                  {/* 这张表**每一列都按百分比分配**，故意不留「吃余量」的列。
                      原因：本页左栏可拖动改宽，如果几列定死 px、只让最后一列吃余量，
                      拖动时就只有那一列在涨（用户反馈的原话：「拖动的时候整体都要
                      改变，不是只改操作」）。全给百分比，余量才会按比例摊到每一列。
                      其他 PC 表格没有拖动条、不会出现这个现象，仍是「最后一列吃余量」。
                      「出单」列按用户要求去掉，腾出的份额主要给了产品列。 */}
                  <th style={{ width: '55%' }}>产品</th>
                  <th style={{ width: '22%' }}>分类</th>
                  <th style={{ width: '23%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="pcv-empty">没有匹配的产品</td>
                  </tr>
                ) : list.map((p) => {
                  const st = CATEGORY_STYLE[p.category] || CATEGORY_STYLE['其他']
                  // 与手机版 ProductCard 同一个图标来源（浅底 + 分类色 + 两字缩写）
                  const icon = getIconInfo(p.name, p.category)
                  return (
                    <tr
                      key={p.id}
                      className={active && p.id === active.id ? 'on' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActiveId(p.id)}
                    >
                      <td>
                        {/* 分类图标 + 名称，跟手机版 ProductCard 一致 */}
                        <span className="pcv-namecell">
                          <span className="pcv-caticon" style={{ background: icon.bg, color: icon.color }}>{icon.text}</span>
                          <span className="pcv-nametext" title={displayTitle(p)}>{displayTitle(p)}</span>
                        </span>
                      </td>
                      <td>
                        {/* 分类：浅灰底 + 中性文字，只靠一个 6px 分类色圆点保留识别度 ——
                            既不铺彩色底（用户要求少颜色），又能扫一眼认出分类 */}
                        {p.category && (
                          <span className="pcv-chip" style={{ background: '#f3f4f6', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, opacity: 0.7, background: st.color }} />
                            {p.category}
                          </span>
                        )}
                      </td>
                      {/* 「出单」列已按用户要求去掉 */}
                      <td>
                        {/* 编辑开 ProductDialog、删除走二次确认（PC 端不跳页面）。
                            stopPropagation 是为了不触发整行的「选中该产品」。 */}
                        <button
                          className="pcv-btn-text"
                          onClick={(e) => { e.stopPropagation(); setEditing(p) }}
                        >编辑</button>
                        <button
                          className="pcv-btn-text"
                          style={{ marginLeft: 8, color: '#b96a66' }}
                          onClick={(e) => { e.stopPropagation(); setDelProduct(p) }}
                        >删除</button>
                      </td>
                    </tr>
                  )
                })}
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
                  <button className="pcv-btn pcv-btn-ghost" onClick={() => setImportOpen(true)}>＋ 新增文案</button>
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
                {(active.copies || []).length === 0 ? (
                  <div className="pcv-empty">这个产品还没有文案，点右上角「＋ 新增文案」粘贴一批</div>
                ) : (
                  (active.copies || []).map((c) => {
                    const bar = c.hasOrder ? '#e3c07e' : c.hasHot ? '#dd9a95' : c.used ? '#9dbecb' : null
                    return (
                      <div
                        key={c.id}
                        className="pcv-copyitem"
                        // 左侧 3px 竖条标状态，与手机版 CopyCard 的 cardAccent 同口径（出单 > 爆单 > 用过）
                        style={bar ? { boxShadow: `inset 3px 0 0 ${bar}` } : undefined}
                      >
                        <div className="pcv-copytext">{c.content}</div>
                        <div className="pcv-copyfoot">
                          {COPY_FLAGS.map((f) => (
                            <button
                              key={f.key}
                              className="pcv-flag"
                              style={c[f.key] ? { background: f.bg, color: f.fg, borderColor: 'transparent' } : undefined}
                              onClick={() => toggleFlag(c, f.key)}
                            >
                              {f.label}
                            </button>
                          ))}
                          {/* 三组标记与右侧操作靠拢排成一排（原来中间有个 spacer 把两边顶到最左最右） */}
                          <button className="pcv-btn pcv-btn-ghost" onClick={() => copyOne(c)}>复制</button>
                          <button className="pcv-btn-text" onClick={() => setCopyDialog(c)}>编辑</button>
                          <button className="pcv-btn-text" style={{ color: '#b96a66' }} onClick={() => setDelTarget(c)}>删除</button>
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

      {/* 批量导入文案：弹窗（手机版是 /batch-import 整页，PC 不跳页面） */}
      {importOpen && active && <CopyImportDialog product={active} onClose={() => setImportOpen(false)} />}

      {/* 话题管理：弹窗 */}
      {topicOpen && active && <TopicDialog product={active} onClose={() => setTopicOpen(false)} />}
    </>
  )
}
