import { useEffect } from 'react'

// 全局键盘遮挡修复：
// iOS 软键盘弹起时，聚焦的 input/textarea/select 若落在键盘覆盖区内会被挡住，
// 页面滚动容器不会自动把它滚到键盘上方。
// 键盘收起时，iOS 视口可能不复位，导致底部出现大段空白。
// 本组件在根部常驻，全局监听 focusin + focusout + visualViewport.resize。

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
  const availH = kb > 0 && window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight
  const rect = el.getBoundingClientRect()

  const topLimit = pad
  const bottomLimit = availH - pad
  if (rect.top >= topLimit && rect.bottom <= bottomLimit) return

  const scroller = findScrollable(el)
  if (scroller === window) {
    const dy = rect.bottom > bottomLimit ? (rect.bottom - bottomLimit) : (rect.top - topLimit)
    if (Math.abs(dy) < 1) return
    window.scrollBy(0, dy)
  } else {
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

// 键盘收起后强制复位：重置所有滚动容器 + 触发重排消除底部空白
function resetAfterKeyboardDismiss() {
  // 1. 重置 window 滚动
  window.scrollTo(0, 0)
  // 2. 重置所有 .app-container 和内部滚动容器
  document.querySelectorAll('.app-container, .scroll-lock-page, [style*="overflowY:auto"], [style*="overflow-y:auto"], [style*="overflowY:scroll"], [style*="overflow-y:scroll"]').forEach(el => {
    if (el.scrollTop) el.scrollTop = 0
  })
  // 3. 强制重排：临时改 body height 触发 iOS 视口复位
  const body = document.body
  const prevHeight = body.style.height
  body.style.height = '100vh'
  // 强制 reflow
  void body.offsetHeight
  setTimeout(() => { body.style.height = prevHeight }, 50)
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
      bringIntoView(t)
      timers.forEach(clearTimeout)
      timers = []
      fire(80)
      fire(320)
      fire(620)
    }

    // 输入框失焦 = 键盘收起（比 visualViewport 更可靠）
    const onFocusOut = (e) => {
      const t = e.target
      if (!isEditable(t) || insideModal(t)) return
      // 延迟等键盘收起动画
      timers.forEach(clearTimeout)
      timers = []
      timers.push(setTimeout(resetAfterKeyboardDismiss, 200))
      timers.push(setTimeout(resetAfterKeyboardDismiss, 400))
    }

    let prevKb = 0
    const onViewportChange = () => {
      const a = document.activeElement
      const kb = kbOccupied()
      // 键盘从有到无（收起）：重置滚动避免空白
      if (prevKb > 0 && kb === 0) {
        timers.forEach(clearTimeout)
        timers = []
        timers.push(setTimeout(resetAfterKeyboardDismiss, 150))
        timers.push(setTimeout(resetAfterKeyboardDismiss, 400))
      }
      prevKb = kb
      if (!isEditable(a) || insideModal(a)) return
      if (kb > 0) {
        timers.forEach(clearTimeout)
        timers = []
        fire(60)
      }
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', onViewportChange)
      vv.addEventListener('scroll', onViewportChange)
    }
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
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
