import { useRef, useState } from 'react'

/**
 * 右滑删除行：向右拖动行内容 → 露出左侧红色删除区；滑过阈值松手即触发删除。
 * 纵向滚动不受影响（touch-action: pan-y，纵向手势交还页面）。
 */
export function SwipeRow({ onDelete, children, radius = 12 }) {
  const MAX = 140 // 最大可滑距离
  const st = useRef({ x: 0, y: 0, active: false, lock: false })
  const dxRef = useRef(0)
  const [dx, setDx] = useState(0)
  const [anim, setAnim] = useState(false)
  const swipedRef = useRef(false) // 本次手势是否为横向滑动（用于抑制误触点击）

  const set = (v) => {
    dxRef.current = v
    setDx(v)
  }

  const down = (e) => {
    st.current = { x: e.clientX, y: e.clientY, active: true, lock: false }
    swipedRef.current = false
    setAnim(false)
  }

  const move = (e) => {
    const s = st.current
    if (!s.active) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (!s.lock) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return
      s.lock = true
      // 判定为纵向滚动 → 放弃本次手势，让页面正常滚动
      if (Math.abs(my) > Math.abs(mx)) {
        s.active = false
        return
      }
    }
    set(Math.min(MAX, Math.max(0, mx)))
  }

  const end = () => {
    const s = st.current
    if (s.active && s.lock) swipedRef.current = true
    if (s.active && s.lock && dxRef.current > MAX * 0.6) onDelete?.()
    s.active = false
    s.lock = false
    setAnim(true)
    set(0)
  }

  // 滑动后抑制紧随的 click，避免误触行本身的点击（如出单行「点开编辑」）
  const clickCapture = (e) => {
    if (!swipedRef.current) return
    swipedRef.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: radius }}>
      {/* 背后的删除区（贴在左侧，卡片右滑时露出） */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg,#ef4444,#f43f5e)',
          display: 'flex', alignItems: 'center', paddingLeft: 18,
          color: '#fff', fontSize: 13, fontWeight: 700,
        }}
      >
        🗑 删除
      </div>
      {/* 可滑动的行内容 */}
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={clickCapture}
        style={{
          position: 'relative',
          transform: `translateX(${dx}px)`,
          transition: anim ? 'transform .22s ease' : 'none',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
