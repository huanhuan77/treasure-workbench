import { useEffect } from 'react'

// PC 全站弹窗「按住标题栏拖动」。
//
// 为什么不用逐弹窗包组件：PC 里有 10+ 个弹窗（样品/产品/文案/话题/导入/出单/发布/
// 品牌方/追剧/读书/投资/记一笔…），每个都套一层 Draggable 改动量大且容易漏。
// 这里改成**文档级事件委托**：只在 PcShell 挂一次，谁弹出弹窗谁就能拖。
//
// 规则：
//   · 只能抓 .pcv-dialog-h（标题栏）拖；标题栏里的按钮（×）不触发；
//   · 拖动只改 transform，不改布局 —— 弹窗仍由 overlay 的 flex 居中，
//     松手后保留位移，关闭弹窗时节点销毁、下次打开回到居中原点；
//   · 位移做边界约束：至少留 80px 在视口内，避免拖丢。
const KEEP_VISIBLE = 80

function num(dialog, key) {
  return Number(dialog.dataset[key] || 0)
}

export function useDialogDrag() {
  useEffect(() => {
    let drag = null

    const onPointerDown = (e) => {
      if (e.button !== 0) return
      const head = e.target.closest && e.target.closest('.pcv-dialog-h')
      if (!head) return
      // 标题栏里的按钮 / 输入框（关闭 × 等）不当作拖动把手
      if (e.target.closest('button, a, input, select, textarea')) return
      const dialog = head.closest('.pcv-dialog')
      if (!dialog) return

      drag = {
        dialog,
        startX: e.clientX,
        startY: e.clientY,
        baseX: num(dialog, 'dragX'),
        baseY: num(dialog, 'dragY'),
        w: dialog.offsetWidth,
        h: dialog.offsetHeight,
        moved: false,
      }
      dialog.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
      e.preventDefault()
    }

    const onPointerMove = (e) => {
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return   // 忽略手抖
      drag.moved = true

      // 约束：弹窗至少保留 KEEP_VISIBLE 在视口内
      const maxX = window.innerWidth / 2 + drag.w / 2 - KEEP_VISIBLE
      const maxY = window.innerHeight / 2 + drag.h / 2 - KEEP_VISIBLE
      const nx = Math.max(-maxX, Math.min(maxX, drag.baseX + dx))
      const ny = Math.max(-maxY, Math.min(maxY, drag.baseY + dy))

      drag.dialog.dataset.dragX = String(nx)
      drag.dialog.dataset.dragY = String(ny)
      drag.dialog.style.transform = `translate(${nx}px, ${ny}px)`
    }

    const endDrag = () => {
      if (!drag) return
      drag.dialog.style.cursor = ''
      drag = null
      document.body.style.userSelect = ''
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', endDrag, true)
    document.addEventListener('pointercancel', endDrag, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', endDrag, true)
      document.removeEventListener('pointercancel', endDrag, true)
      document.body.style.userSelect = ''
    }
  }, [])
}
