import { useEffect, useRef, useState } from 'react'

const storeKey = (k) => `fab_pos_${k}`

/**
 * 可拖动的悬浮按钮：默认贴右侧，按住可拖到任意位置，松手自动吸附到左/右边缘，位置存 localStorage。
 * 拖动时不触发点击，只有「没移动」才算点击。
 */
export function DraggableFab({ storageKey = 'default', onClick, children, round, hidden }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null) // {x, y} 视口坐标（fixed 定位）
  const posRef = useRef({ x: 0, y: 0 })
  const st = useRef({ sx: 0, sy: 0, ox: 0, oy: 0, moved: false, active: false })

  const clamp = (x, y, w, h) => ({
    x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8)),
    y: Math.min(Math.max(76, y), Math.max(76, window.innerHeight - h - 100)),
  })

  // 初始化：有存档用存档，否则默认靠右、纵向 72%（避开底部导航）
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth || 96
    const h = el.offsetHeight || 40
    let p = null
    try {
      p = JSON.parse(localStorage.getItem(storeKey(storageKey)) || 'null')
    } catch {
      p = null
    }
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') {
      p = { x: window.innerWidth - w - 14, y: Math.round(window.innerHeight * 0.72) }
    }
    p = clamp(p.x, p.y, w, h)
    posRef.current = p
    setPos(p)
  }, [storageKey])

  const down = (e) => {
    if (!pos) return
    st.current = { sx: e.clientX, sy: e.clientY, ox: posRef.current.x, oy: posRef.current.y, moved: false, active: true }
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* 忽略 */
    }
  }

  const move = (e) => {
    const s = st.current
    if (!s.active) return
    const dx = e.clientX - s.sx
    const dy = e.clientY - s.sy
    if (!s.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    s.moved = true
    const el = ref.current
    const p = clamp(s.ox + dx, s.oy + dy, el?.offsetWidth || 96, el?.offsetHeight || 40)
    posRef.current = p
    setPos(p)
  }

  const up = () => {
    const s = st.current
    if (!s.active) return
    s.active = false
    if (!s.moved) {
      onClick?.() // 未移动 → 视为点击
      return
    }
    // 松手吸附到最近的横向边缘，纵向保持
    const el = ref.current
    const w = el?.offsetWidth || 96
    const cur = posRef.current
    const nx = cur.x + w / 2 < window.innerWidth / 2 ? 8 : window.innerWidth - w - 8
    const np = { x: nx, y: cur.y }
    posRef.current = np
    setPos(np)
    try {
      localStorage.setItem(storeKey(storageKey), JSON.stringify(np))
    } catch {
      /* 忽略 */
    }
  }

  return (
    <button
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{
        display: hidden ? 'none' : 'flex',
        position: 'fixed',
        left: pos ? pos.x : -9999,
        top: pos ? pos.y : -9999,
        zIndex: 50,
        boxSizing: 'border-box',
        touchAction: 'none',
        cursor: 'grab',
        border: 'none',
        borderRadius: round ? '50%' : '999px',
        padding: round ? 0 : '11px 18px',
        width: round ? '54px' : undefined,
        height: round ? '54px' : undefined,
        justifyContent: 'center',
        background: 'linear-gradient(135deg,#f472b6,#ec4899)',
        color: '#fff',
        fontSize: round ? '28px' : '14px',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 22px rgba(236,72,153,0.42)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {children}
    </button>
  )
}
