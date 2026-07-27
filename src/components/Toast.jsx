import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((msg, type = 'default') => {
    setToast({ msg, type, id: Date.now() })
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000)
      return () => clearTimeout(t)
    }
  }, [toast])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: 'calc(20px + var(--safe-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'error' ? 'linear-gradient(135deg, #fb7185, #f43f5e)' : toast.type === 'success' ? 'linear-gradient(135deg, #34d399, #10b981)' : 'rgba(74, 44, 58, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#fff',
            padding: '11px 22px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 9999,
            animation: 'toastIn 0.25s ease',
            boxShadow: '0 8px 24px rgba(244, 114, 182, 0.2)',
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
