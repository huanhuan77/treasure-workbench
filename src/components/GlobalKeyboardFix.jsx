import { useEffect } from 'react'

// 全局键盘遮挡修复：
// iOS 软键盘弹起时，聚焦的 input/textarea/select 若落在键盘覆盖区内会被挡住，
// 页面滚动容器不会自动把它滚到键盘上方。
// 本组件在根部常驻，全局监听 focusin + visualViewport.resize，
// 凡原生输入框聚焦即把它滚到"键盘上方可见区"内。
// Modal 内部的输入已由 Modal 自身处理，这里通过 data-modal 标记跳过，避免双重滚动。

function isEditable(el) {
  if (!el || !el.tagName) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

function insideModal(el) {
  while (el) {
    if (el.getAttribute && el.getAttribute('data-modal')) return true
    el = el.parentElement
  }
  return false
}

// iOS 键盘占用像素（弹起时 visualViewport.height 明显小于 innerHeight）
function kbOccupied() {
  const vv = window.visualViewport
  if (!vv) return 0
  const gap = window.innerHeight - vv.height
  return gap > 100 ? gap : 0
}

// 向上找第一个可滚动的滚动容器；找不到则返回 window
function findScrollable(el) {
  let node = el.parentElement
  while (node) {
    if (node === document.body || node === document.documentElement) break
    const st = window.getComputedStyle(node)
    const oy = st.overflowY === 'visible' ? st.overflow : st.overflowY
    const canOverflow = (st.overflowY === 'auto' || st.overflowY === 'scroll' || st.overflowY === 'overlay')
      || (st.overflow === 'auto' || st.overflow === 'scroll' || st.overflow === 'overlay')
    if (canOverflow && node.scrollHeight > node.clientHeight + 2) {
      return node
    }
    node = node.parentElement
  }
  return window
}

// 把 el 滚到可见区，底部给键盘留 pad 间距
function bringIntoView(el) {
  const pad = 16
  const kb = kbOccupied()
  // 可用的底边高度（相对视觉视口顶部）
  const availH = kb > 0 && window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight
  const rect = el.getBoundingClientRect()

  // 顶部已足够靠下（不被键盘顶住的上缘遮挡）且底部在可用区内：不用动
  const topLimit = pad
  const bottomLimit = availH - pad
  if (rect.top >= topLimit && rect.bottom <= bottomLimit) return

  const scroller = findScrollable(el)
  if (scroller === window) {
    // 整页(body)滚动：把输入框底边压到 bottomLimit
    const dy = rect.bottom > bottomLimit ? (rect.bottom - bottomLimit) : (rect.top - topLimit)
    if (Math.abs(dy) < 1) return
    window.scrollBy(0, dy)
  } else {
    // 内部滚动容器：用容器坐标计算净位移
    const sTop = scroller.getBoundingClientRect().top
    const contentBottomLimit = bottomLimit - sTop
    const elInScrollerBottom = rect.bottom - sTop
    let dy = 0
    if (elInScrollerBottom > contentBottomLimit) dy = elInScrollerBottom - contentBottomLimit
    else if (rect.top - sTop < pad) dy = rect.top - sTop - pad
    if (Math.abs(dy) < 1) return
    scroller.scrollTop += dy
  }
}

export function GlobalKeyboardFix() {
  useEffect(() => {
    let timers = []
    const fire = (delay) => timers.push(setTimeout(() => {
      const a = document.activeElement
      if (isEditable(a) && !insideModal(a)) bringIntoView(a)
    }, delay))

    const onFocusIn = (e) => {
      const t = e.target
      if (!isEditable(t) || insideModal(t)) return
      // 聚焦即滚一次（先处理顶部/轻微偏移）；再等键盘弹出动画(约300ms)补滚到键盘上方
      bringIntoView(t)
      timers.forEach(clearTimeout)
      timers = []
      fire(80)
      fire(320)
      fire(620)
    }
    const onViewportChange = () => {
      const a = document.activeElement
      if (!isEditable(a) || insideModal(a)) return
      if (kbOccupied() > 0) {
        timers.forEach(clearTimeout)
        timers = []
        fire(60)
      }
    }
    document.addEventListener('focusin', onFocusIn)
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', onViewportChange)
      vv.addEventListener('scroll', onViewportChange)
    }
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      timers.forEach(clearTimeout)
      if (vv) {
        vv.removeEventListener('resize', onViewportChange)
        vv.removeEventListener('scroll', onViewportChange)
      }
    }
  }, [])

  return null
}

export default GlobalKeyboardFix
