import { useEffect, useState, useRef, useCallback } from 'react'

// 毛玻璃样式常量（核心复用）
export const glassStyle = {
  background: '#fff',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(244, 114, 182, 0.08), 0 1px 3px rgba(0,0,0,0.04)',
}

// 毛玻璃弱化版（用于次要卡片）
export const glassSoft = {
  background: 'rgba(255, 255, 255, 0.4)',
  backdropFilter: 'blur(16px) saturate(160%)',
  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  borderRadius: '16px',
}

export function Modal({ open, onClose, title, children, footer, center, inline }) {
  const contentRef = useRef(null)

  // inline 模式：直接渲染，不弹窗（避免键盘问题）
  if (inline) {
    return (
      <div style={{ padding: '0 16px 80px' }}>
        {/* 行内头部 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', marginBottom: '16px' }}>
          <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '18px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', flex: 1 }}>{title}</h2>
        </div>
        {children}
        {footer && <div style={{ marginTop: '16px' }}>{footer}</div>}
      </div>
    )
  }

  // 聚焦时滚动输入框到可见区（键盘弹出后、或切换输入框时）
  const scrollActiveIntoView = useCallback(() => {
    setTimeout(() => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
        try { active.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch {}
      }
    }, 350)  // 等待 iOS 键盘动画完成
  }, [])

  // 键盘弹起时真实可见区（iOS 上 window.innerHeight 不会缩，visualViewport 才是真相）
  // kbBox: { top, height }  弹窗要落在 [kbBox.top, kbBox.top+kbBox.height] 这块矩形内
  const [kbBox, setKbBox] = useState({ top: 0, height: 0 })

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      const vv = window.visualViewport
      const recompute = () => {
        if (!vv) {
          setKbBox({ top: 0, height: window.innerHeight })
          return
        }
        // visualViewport.offsetTop 在键盘弹起时变成负值（向上滚了），height 也变小
        // 不弹键盘时 offsetTop≈0、height≈innerHeight
        const top = Math.max(0, vv.offsetTop || 0)
        const height = vv.height || window.innerHeight
        setKbBox({ top, height })
        scrollActiveIntoView()
      }
      if (vv) {
        vv.addEventListener('resize', recompute)
        vv.addEventListener('scroll', recompute)
        recompute()
      }
      const el = contentRef.current
      if (el) el.addEventListener('focusin', scrollActiveIntoView)
      return () => {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        if (vv) { vv.removeEventListener('resize', recompute); vv.removeEventListener('scroll', recompute) }
        if (el) el.removeEventListener('focusin', scrollActiveIntoView)
        setKbBox({ top: 0, height: 0 })
      }
    }
  }, [open, scrollActiveIntoView])

  if (!open) return null

  // 键盘是否"真的弹起"：visualViewport 比 innerHeight 矮 >100px，就认为键盘弹起
  const kbActive = window.visualViewport ? (window.innerHeight - window.visualViewport.height > 100) : false
  // 顶部安全区：iOS 状态栏/灵动岛(env safe-area-inset-top)+ 一点呼吸(12px)
  // 用 24px 下限，保证无论 env 是否生效都不会被刘海/状态栏盖住
  const safeTopStr = typeof CSS !== 'undefined' && CSS.supports
    ? 'max(24px, calc(env(safe-area-inset-top, 0px) + 12px))'
    : '24px'
  // 键盘上方的可用区：弹窗要完整落在这块矩形内
  const usableTop = kbActive ? (kbBox.top + 0) : 0  // 0：让 paddingTop 自己处理安全区
  const usableHeight = kbActive ? (kbBox.height - 8) : window.innerHeight

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(74, 44, 58, 0.25)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: center ? (kbActive ? 'flex-start' : 'center') : 'flex-end',
        justifyContent: 'center',
        padding: 0,
        // 用 padding 让弹窗"内容区"也落在键盘上方
        paddingTop: center ? (kbActive ? safeTopStr : '24px') : 0,
        paddingLeft: center ? 16 : 0,
        paddingRight: center ? 16 : 0,
        paddingBottom: center && kbActive ? 8 : 0,
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          width: '100%',
          maxWidth: '480px',
          // 弹窗最大高度 = 可用区高度（弹窗在键盘上方，超出可滚动）
          maxHeight: kbActive ? `${usableHeight}px` : '85vh',
          transform: kbActive && !center ? `translateY(-${window.innerHeight - kbBox.height}px)` : 'none',
          borderRadius: center ? '24px' : '28px 28px 0 0',
          display: 'flex',
          flexDirection: 'column',
          animation: center ? 'fadeIn 0.2s ease' : 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: center ? '0 12px 40px rgba(244, 114, 182, 0.20)' : '0 -8px 40px rgba(244, 114, 182, 0.15)',
          transition: 'transform 0.2s ease, max-height 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid rgba(244, 114, 182, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-main)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px',
              borderRadius: '50%',
              background: 'rgba(252, 231, 243, 0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', color: 'var(--text-sub)',
            }}
          >✕</button>
        </div>
        <div ref={contentRef} style={{ flex: 1, overflow: 'auto', padding: '16px 22px', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: '12px 22px calc(14px + var(--safe-bottom))', borderTop: '1px solid rgba(244, 114, 182, 0.12)', flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: 'var(--primary)' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export const inputStyle = {
  width: '100%',
  minHeight: '44px',
  padding: '12px 14px',
  border: '1.5px solid rgba(0,0,0,0.1)',
  borderRadius: '12px',
  fontSize: '15px',
  lineHeight: '1.4',
  outline: 'none',
  background: '#fff',
  color: 'var(--text-main)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
  maxWidth: '100%',
  display: 'block',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  fontFamily: 'inherit',
}

export const btnPrimary = {
  flex: 1,
  minWidth: 0,
  padding: '12px',
  background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
  color: '#fff',
  borderRadius: '14px',
  fontSize: '15px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(244, 114, 182, 0.3)',
}

export const btnGhost = {
  flex: 1,
  minWidth: 0,
  padding: '12px',
  background: 'rgba(252, 231, 243, 0.6)',
  color: 'var(--text-sub)',
  borderRadius: '14px',
  fontSize: '15px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = '确认', danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} center>
      <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '14px', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button style={btnGhost} onClick={onClose}>取消</button>
        <button
          style={{
            ...btnPrimary,
            background: danger ? 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)' : btnPrimary.background,
            flex: 1,
          }}
          onClick={() => { onConfirm(); onClose() }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}
