import { useEffect, useState } from 'react'

// 毛玻璃样式常量（核心复用）
export const glassStyle = {
  background: '#fff',
  borderRadius: '20px',
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

export function Modal({ open, onClose, title, children, footer, center }) {
  const [kbHeight, setKbHeight] = useState(0)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      // 监听 iOS 虚拟键盘，动态调整弹窗位置避免被遮挡
      const vv = window.visualViewport
      const onResize = () => {
        if (vv) {
          const diff = window.innerHeight - vv.height
          setKbHeight(diff > 100 ? diff : 0)
        }
      }
      if (vv) {
        vv.addEventListener('resize', onResize)
        onResize()
      }
      return () => {
        document.body.style.overflow = ''
        if (vv) vv.removeEventListener('resize', onResize)
        setKbHeight(0)
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(74, 44, 58, 0.25)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: center ? 'center' : 'flex-end',
        justifyContent: 'center',
        padding: center ? '24px 16px' : undefined,
        paddingBottom: kbHeight ? `${kbHeight}px` : undefined,
        animation: 'fadeIn 0.2s ease',
        transition: kbHeight ? 'padding-bottom 0.15s ease' : undefined,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: kbHeight ? `calc(${window.visualViewport?.height || window.innerHeight}px - 40px)` : '85vh',
          borderRadius: center ? '24px' : '28px 28px 0 0',
          display: 'flex',
          flexDirection: 'column',
          animation: center ? 'fadeIn 0.2s ease' : 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: center ? '0 12px 40px rgba(244, 114, 182, 0.20)' : '0 -8px 40px rgba(244, 114, 182, 0.15)',
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
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
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
  padding: '11px 14px',
  border: '1px solid rgba(244, 114, 182, 0.2)',
  borderRadius: '12px',
  fontSize: '15px',
  outline: 'none',
  background: 'rgba(255, 255, 255, 0.6)',
  color: 'var(--text-main)',
  transition: 'border-color 0.2s, background 0.2s',
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
