import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { SavingsButton } from '../components/SavingsButton'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, ConfirmModal, glassStyle } from '../components/Modal'
import { checkForUpdate } from '../main'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 产品分类（供添加时选择）
const CATEGORIES = ['保健品', '护肤', '美妆', '饮品', '食品', '洗护', '日用', '其他']

// 每个分类一个固定颜色 + 第一字作为图标文字
const CATEGORY_STYLE = {
  '保健品': { bg: '#d1fae5', color: '#059669' },  // 绿
  '护肤':   { bg: '#fce7f3', color: '#ec4899' },  // 粉
  '美妆':   { bg: '#fee2e2', color: '#dc2626' },  // 红
  '饮品':   { bg: '#ffedd5', color: '#c2410c' },  // 橙
  '食品':   { bg: '#fef3c7', color: '#d97706' },  // 黄
  '洗护':   { bg: '#dbeafe', color: '#3b82f6' },  // 蓝
  '日用':   { bg: '#ede9fe', color: '#7c3aed' },  // 紫
  '其他':   { bg: '#f3f4f6', color: '#6b7280' },  // 灰
}

// 根据产品分类返回图标（显示分类缩写 + 配色）
const CAT_SHORT = {
  '保健品': '保健',
  '护肤':   '护肤',
  '美妆':   '美妆',
  '饮品':   '饮品',
  '食品':   '食品',
  '洗护':   '洗护',
  '日用':   '日用',
  '其他':   '其他',
}
function getIconInfo(name, category) {
  const style = CATEGORY_STYLE[category] || CATEGORY_STYLE['其他']
  return { text: CAT_SHORT[category] || (category || '?').slice(0, 2), ...style }
}

// 品牌名 + 产品名 拼接显示（避免品牌重复，如「珀芙研冷膜」）
// 产品列表显示名：固定「品牌名 产品名」（前面品牌，后面产品）
function displayTitle(p) {
  const brand = (p.brand || '').trim()
  const name = (p.name || '').trim()
  if (!brand) return name
  let core = name
  if (name.toLowerCase().startsWith(brand.toLowerCase())) {
    core = name.slice(brand.length).trim()
  }
  if (!core) core = name
  return `${brand} ${core}`
}

// 产品卡片视觉层：左滑编辑/删除
function ProductCard({ p, openEdit, onDelete, navigate, outerRef, outerStyle, handle, swipedId, setSwipedId }) {
  const iconInfo = getIconInfo(p.name, p.category)
  const copies = p.copies?.length || 0
  const orders = (p.copies || []).filter((c) => c.hasOrder).length
  const posted = Number(p.postedCount) || 0
  const isSwiped = swipedId === p.id

  return (
    <div ref={outerRef} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', ...outerStyle }}>
      {/* 左滑操作按钮 */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '4px' }}>
        <button onClick={(e) => { e.stopPropagation(); setSwipedId(null); openEdit(p) }} style={{ width: '72px', height: '80%', border: 'none', background: '#6366f1', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '10px' }}>编辑</button>
        <button onClick={(e) => { e.stopPropagation(); setSwipedId(null); onDelete(p.id) }} style={{ width: '72px', height: '80%', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '10px' }}>删除</button>
      </div>
      <div
        onTouchStart={(e) => { const t = e.touches[0]; e.currentTarget.dataset.swipeStart = `${t.clientX},${t.clientY}`; e.currentTarget.dataset.swiping = 'false' }}
        onTouchMove={(e) => { const t = e.touches[0]; const start = (e.currentTarget.dataset.swipeStart || '').split(',').map(Number); if (!start[0]) return; const dx = t.clientX - start[0]; const dy = t.clientY - start[1]; if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) e.currentTarget.dataset.swiping = 'true' }}
        onTouchEnd={(e) => { if (e.currentTarget.dataset.swiping === 'true') { setSwipedId(prev => prev === p.id ? null : p.id) } }}
        onClick={() => { if (!isSwiped) navigate(`/product/${p.id}`) }}
        style={{
          ...glassStyle, position: 'relative', padding: '11px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '9px',
          transition: 'transform 0.2s ease', transform: isSwiped ? 'translateX(-148px)' : 'translateX(0)',
          zIndex: 1,
        }}
      >
        {/* 拖拽手柄 */}
        {handle}

        {/* 左侧图标：显示分类名 */}
        <div style={{
          width: '44px', height: '36px', borderRadius: '10px', background: iconInfo.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: iconInfo.color, letterSpacing: '-0.5px' }}>{iconInfo.text}</span>
        </div>

        {/* 中间内容：品牌 + 产品名 + 统计 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '17px', fontWeight: 600, color: 'var(--text-main)',
            lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            paddingRight: '4px',
          }}>{displayTitle(p)}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>📋{copies}</span>
            <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 500 }}>已发 {posted}</span>
            <span style={{ fontSize: '13px', color: '#e11d48', fontWeight: 500 }}>🔥{orders}</span>
          </div>
        </div>

        </div>
      </div>
  )
}

// 可拖拽排序的卡片
function SortableProductCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.p.id })
  const outerStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? '0 12px 30px rgba(244, 114, 182, 0.28)' : undefined,
  }
  const handle = (
    <button
      {...attributes}
      {...listeners}
      onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e) }}
      onTouchStart={(e) => { e.stopPropagation(); listeners?.onTouchStart?.(e) }}
      aria-label="拖动排序"
      style={{
        flexShrink: 0, width: '20px', height: '40px', alignSelf: 'center',
        border: 'none', background: 'transparent', color: 'var(--gray-400)',
        fontSize: '22px', lineHeight: 1, letterSpacing: '1px', cursor: 'grab', touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >⇕</button>
  )
  return <ProductCard {...props} onDelete={props.onDelete} outerRef={setNodeRef} outerStyle={outerStyle} handle={handle} />
}

export function HomePage() {
  const { products, addProduct, deleteProduct, updateProduct, reorderProducts } = useStore()
  const { show } = useToast()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [editId, setEditId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [swipedId, setSwipedId] = useState(null)
  const [delId, setDelId] = useState(null)

  // 恢复滚动位置（从产品详情返回时）
  useEffect(() => {
    const saved = sessionStorage.getItem('home_scroll')
    if (saved) {
      sessionStorage.removeItem('home_scroll')
      requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)))
    }
  }, [])

  const saveScroll = () => sessionStorage.setItem('home_scroll', String(window.scrollY))
  const [search, setSearch] = useState('')

  const openEdit = (p) => {
    saveScroll()
    navigate(`/product/${p.id}/edit`)
  }


  // 搜索过滤：匹配产品名 / 品牌；分类由独立下拉框筛选
  const keyword = search.trim().toLowerCase()
  const filtered = products.filter((p) => {
    const matchKw = !keyword || [p.name, p.brand].filter(Boolean).some((f) => f.toLowerCase().includes(keyword))
    const matchCat = !categoryFilter || p.category === categoryFilter
    return matchKw && matchCat
  })
  const active = keyword || categoryFilter

  // 置顶产品：洁比兔湿巾(湿厕纸) / 洁比兔洗护液(洗液) 永远在最前
  const isPinWet = (p) => /洁比兔/.test(p.name) && /湿巾|湿厕纸/.test(p.name)
  const isPinWash = (p) => /洁比兔/.test(p.name) && /洗液|洗护液/.test(p.name)
  const pinFirst = (list) => {
    const pinned = []
    const rest = []
    list.forEach((p) => {
      if (isPinWet(p) || isPinWash(p)) pinned.push(p)
      else rest.push(p)
    })
    // 保持置顶产品内部的相对顺序（湿巾在洗液前面）
    pinned.sort((a, b) => (isPinWet(a) ? 0 : 1) - (isPinWet(b) ? 0 : 1))
    return [...pinned, ...rest]
  }
  const displayedList = pinFirst(active ? filtered : products)

  // 拖拽排序
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )
  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = products.findIndex((p) => p.id === active.id)
    const newIndex = products.findIndex((p) => p.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    reorderProducts(arrayMove(products.map((p) => p.id), oldIndex, newIndex))
  }

  // 是否以「添加到主屏幕」的独立应用方式打开（无地址栏、无刷新入口）
  const isStandalone = () =>
    window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)

  const handleCheckUpdate = async () => {
    setChecking(true)
    const result = await checkForUpdate(true)
    setChecking(false)
    if (result === 'latest') {
      show('已是最新版本', 'success')
      // 主屏幕应用无刷新入口：已是最新也顺手硬刷新一次，确保资源最新
      if (isStandalone()) setTimeout(() => location.reload(true), 800)
    } else if (result === 'error') show('检查更新失败，请重试', 'error')
  }


  // 悬浮 + 按钮可拖动
  const [fabPos, setFabPos] = useState(() => {
    try {
      const s = localStorage.getItem('fabPos')
      if (s) return JSON.parse(s)
    } catch (e) {}
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth - 20 - 56, y: window.innerHeight - 92 - 56 }
    }
    return { x: 320, y: 400 }
  })
  const fabPosRef = useRef(fabPos)
  const fabRef = useRef(null)
  const dragInfo = useRef(null)
  const justDraggedRef = useRef(false)
  const [fabDragging, setFabDragging] = useState(false)

  const onFabPointerDown = (e) => {
    e.stopPropagation()
    justDraggedRef.current = false
    const rect = fabRef.current.getBoundingClientRect()
    dragInfo.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top, moved: false }
    try { fabRef.current.setPointerCapture(e.pointerId) } catch (e2) {}
    setFabDragging(true)
  }
  const onFabPointerMove = (e) => {
    if (!dragInfo.current) return
    const dx = e.clientX - dragInfo.current.startX
    const dy = e.clientY - dragInfo.current.startY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragInfo.current.moved = true
    const size = 56
    let x = Math.max(8, Math.min(window.innerWidth - size - 8, dragInfo.current.origX + dx))
    let y = Math.max(8, Math.min(window.innerHeight - size - 8, dragInfo.current.origY + dy))
    fabPosRef.current = { x, y }
    setFabPos({ x, y })
  }
  const endFabDrag = (openIfTap) => {
    if (!dragInfo.current) return
    const moved = dragInfo.current.moved
    dragInfo.current = null
    setFabDragging(false)
    if (moved) {
      justDraggedRef.current = true
      try { localStorage.setItem('fabPos', JSON.stringify(fabPosRef.current)) } catch (e) {}
    } else if (openIfTap) {
      saveScroll()
      navigate('/product/new')
    }
  }

  const emptyGlass = (icon, title, sub) => (
    <div style={{ ...glassStyle, textAlign: 'center', padding: '60px 24px', color: 'var(--text-sub)' }}>
      <div style={{ fontSize: '44px', marginBottom: '12px' }}>{icon}</div>
      <p style={{ fontSize: '15px', margin: 0, color: 'var(--text-main)' }}>{title}</p>
      <p style={{ fontSize: '13px', margin: '6px 0 0' }}>{sub}</p>
    </div>
  )

  return (
    <div className="app-container">
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>宝藏工作台</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>{products.length}个产品 · {(products || []).reduce((s, p) => s + (p.copies?.length || 0), 0)}条文案</p>
        </div>
        <button
          onClick={handleCheckUpdate}
          disabled={checking}
          style={{
            flexShrink: 0, marginLeft: '12px', padding: '8px 12px', border: 'none',
            borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: '#ec4899',
            background: 'rgba(236, 72, 182, 0.10)', cursor: 'pointer',
          }}
        >
          {checking ? '检查中…' : '↻ 检查更新'}
        </button>
      </header>

      <div style={{ padding: '8px 16px 4px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: '#fff',
          borderRadius: '8px', padding: '6px 8px 6px 14px', boxShadow: '0 2px 10px rgba(244, 114, 182, 0.06)',
        }}>
          <span style={{ fontSize: '16px', opacity: 0.6 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索产品 / 品牌"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '15px', color: 'var(--text-main)', background: 'transparent' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ border: 'none', background: 'rgba(0,0,0,0.06)', color: 'var(--text-sub)', width: '20px', height: '20px', borderRadius: '50%', fontSize: '12px', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
            >×</button>
          )}
          <span style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                background: 'transparent', border: 'none', outline: 'none',
                padding: '8px 22px 8px 8px', fontSize: '14px', fontWeight: 500,
                color: categoryFilter ? 'var(--text-main)' : 'var(--text-sub)',
                maxWidth: '108px',
              }}
            >
              <option value="">全部分类</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-sub)', fontSize: '11px' }}>▾</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 16px' }}>
        {!active ? (
          products.length === 0 ? (
            emptyGlass('📭', '还没有产品', '点击下方 + 添加你的第一个产品')
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayedList.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayedList.map((p) => (
                    <SortableProductCard key={p.id} p={p} openEdit={openEdit} onDelete={setDelId} navigate={navigate} swipedId={swipedId} setSwipedId={setSwipedId} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : displayedList.length === 0 ? (
          emptyGlass('🔍', keyword ? `没有找到「${search.trim()}」` : `「${categoryFilter}」分类下暂无产品`, '换个筛选条件试试')
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayedList.map((p) => (
              <ProductCard key={p.id} p={p} openEdit={openEdit} onDelete={setDelId} navigate={navigate} swipedId={swipedId} setSwipedId={setSwipedId} />
            ))}
          </div>
        )}
      </div>

      {/* 拖拽时铺透明遮罩：挡住松手瞬间落在产品卡片上的 click */}
      {fabDragging && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
        />
      )}

      {/* 可拖动悬浮 + 按钮 */}
      <button
        ref={fabRef}
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={() => endFabDrag(true)}
        onPointerCancel={() => endFabDrag(false)}
        onClick={(e) => {
          if (justDraggedRef.current) {
            e.preventDefault()
            e.stopPropagation()
            justDraggedRef.current = false
          }
        }}
        style={{
          position: 'fixed',
          left: fabPos.x, top: fabPos.y, right: 'auto', bottom: 'auto',
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
          color: '#fff', fontSize: '30px', fontWeight: 300, lineHeight: 1,
          boxShadow: fabDragging ? '0 14px 34px rgba(244, 114, 182, 0.5)' : '0 8px 24px rgba(244, 114, 182, 0.4)',
          transform: fabDragging ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          zIndex: 50, touchAction: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { deleteProduct(delId); show('已删除', 'success') }}
        title="删除产品"
        message="确定删除该产品及其所有文案吗？此操作不可撤销。"
        confirmText="删除"
        danger
      />

    </div>
  )
}
