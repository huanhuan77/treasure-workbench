import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ConfirmModal, glassStyle } from '../components/Modal'
import { CATEGORY_STYLE, getIconInfo, displayTitle } from '../utils/productDisplay'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 产品分类（供添加时选择）
const CATEGORIES = ['保健品', '美妆', '护肤', '洗护', '日用', '饮品', '食品', '其他']

// 分类配色 / 分类图标 / 产品显示名 的实现已抽到 utils/productDisplay.js，
// 手机版与 PC 版共用同一份（这里保留本页自己的 CATEGORIES 顺序，不动筛选条排列）

// 产品卡片视觉层：左滑编辑/删除
function ProductCard({ p, openEdit, onDelete, onTogglePin, navigate, outerRef, outerStyle, handle }) {
  const iconInfo = getIconInfo(p.name, p.category)
  const copies = p.copies?.length || 0
  const orders = (p.copies || []).filter((c) => c.hasOrder).length

  return (
    <div ref={outerRef} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', ...outerStyle }}>
      <div
        onClick={() => navigate(`/product/${p.id}`)}
        className="pc-card"
        style={{
          ...glassStyle, position: 'relative', padding: '11px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '9px', zIndex: 1,
        }}
      >
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
          }}>{displayTitle(p)}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>📋{copies}</span>
            <span style={{ fontSize: '13px', color: '#e11d48', fontWeight: 500 }}>🔥{orders}</span>
          </div>
        </div>

        {/* 右侧：置顶按钮 */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(p) }}
          aria-label="置顶"
          style={{
            flexShrink: 0, width: '32px', height: '32px', border: 'none', borderRadius: '8px',
            background: p.pinned ? '#fef3c7' : 'transparent', cursor: 'pointer',
            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: p.pinned ? 1 : 0.35,
          }}
        >📌</button>

        {/* 右侧：拖动排序手柄 */}
        {handle}
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
        flexShrink: 0, width: '24px', height: '40px', alignSelf: 'center',
        border: 'none', background: 'transparent', color: 'var(--gray-400)',
        fontSize: '18px', lineHeight: 1, cursor: 'grab', touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >⇕</button>
  )
  return <ProductCard {...props} outerRef={setNodeRef} outerStyle={outerStyle} handle={handle} />
}

export function HomePage() {
  const { products, deleteProduct, reorderProducts, updateProduct } = useStore()
  const { show } = useToast()
  const navigate = useNavigate()
  const [categoryFilter, setCategoryFilter] = useState('')
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

  const togglePin = (p) => {
    updateProduct(p.id, { pinned: !p.pinned })
    show(p.pinned ? '已取消置顶' : '已置顶', 'success')
  }


  // 搜索过滤：匹配产品名 / 品牌；分类由独立下拉框筛选
  const keyword = search.trim().toLowerCase()
  const filtered = products.filter((p) => {
    const matchKw = !keyword || [p.name, p.brand].filter(Boolean).some((f) => f.toLowerCase().includes(keyword))
    const matchCat = !categoryFilter || p.category === categoryFilter
    return matchKw && matchCat
  })
  const active = keyword || categoryFilter

  // 置顶产品：按 p.pinned 字段排序（PC端与手机端共用）
  const pinFirst = (list) => {
    const pinned = []
    const rest = []
    list.forEach((p) => {
      if (p.pinned) pinned.push(p)
      else rest.push(p)
    })
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
    <div className="app-container scroll-lock-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <header className="pc-header" style={{
        padding: 'calc(16px + var(--safe-top)) 16px 6px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
        flexShrink: 0,
      }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>宝藏工作台</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>{products.length}个产品 · {(products || []).reduce((s, p) => s + (p.copies?.length || 0), 0)}条文案</p>
        </div>
        {/* 搜索框：与标题同行，靠右 */}
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px',
          background: '#fff', borderRadius: '999px', padding: '8px 10px 8px 12px',
          boxShadow: '0 2px 10px rgba(244, 114, 182, 0.06)',
        }}>
          <span style={{ fontSize: '14px', opacity: 0.6, flexShrink: 0 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索产品 / 品牌"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-main)', background: 'transparent' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ border: 'none', background: 'rgba(0,0,0,0.06)', color: 'var(--text-sub)', width: '18px', height: '18px', borderRadius: '50%', fontSize: '11px', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
            >×</button>
          )}
        </div>
      </header>

      {/* 分类筛选：固定不滚动 */}
      <div style={{ padding: '0 16px 4px', flexShrink: 0 }}>
        {/* 分类筛选：横向 chip 条，直接可见、可滑动 */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingTop: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => setCategoryFilter('')} style={{
            flex: '0 0 auto', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            border: categoryFilter === '' ? 'none' : '1px solid rgba(244,114,182,0.35)',
            background: categoryFilter === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
            color: categoryFilter === '' ? '#fff' : 'var(--text-main)', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>全部</button>
          {CATEGORIES.map((c) => {
            const st = CATEGORY_STYLE[c] || CATEGORY_STYLE['其他']
            const sel = categoryFilter === c
            return (
              <button key={c} onClick={() => setCategoryFilter(c)} style={{
                flex: '0 0 auto', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                border: sel ? 'none' : `1px solid ${st.bg}`,
                background: sel ? st.color : '#fff',
                color: sel ? '#fff' : st.color, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>{c}</button>
            )
          })}
        </div>
      </div>

      {/* 列表：独立滚动 */}
      <div className="pc-list" style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(88px + var(--safe-bottom, 0px))', WebkitOverflowScrolling: 'touch' }}>
        {!active ? (
          products.length === 0 ? (
            emptyGlass('📭', '还没有产品', '点击下方 + 添加你的第一个产品')
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayedList.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="pc-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayedList.map((p) => (
                    <SortableProductCard key={p.id} p={p} openEdit={openEdit} onDelete={setDelId} onTogglePin={togglePin} navigate={navigate} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : displayedList.length === 0 ? (
          emptyGlass('🔍', keyword ? `没有找到「${search.trim()}」` : `「${categoryFilter}」分类下暂无产品`, '换个筛选条件试试')
        ) : (
          <div className="product-grid pc-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayedList.map((p) => (
              <ProductCard key={p.id} p={p} openEdit={openEdit} onDelete={setDelId} onTogglePin={togglePin} navigate={navigate} />
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
