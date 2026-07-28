import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HomePage } from './HomePage'
import { SamplesPage } from './SamplesPage'

// 首页 shell：内部子 tab 切换 产品 / 样品
// URL 同步: ?tab=products | ?tab=samples

export function HomeShell() {
  const [params, setParams] = useSearchParams()
  const initialTab = params.get('tab') === 'samples' ? 'samples' : 'products'
  const [tab, setTab] = useState(initialTab)

  // 子 tab 切换时同步到 URL (便于分享/刷新保持状态)
  useEffect(() => {
    const current = params.get('tab') === 'samples' ? 'samples' : 'products'
    if (current !== tab) {
      const next = new URLSearchParams(params)
      if (tab === 'samples') next.set('tab', 'samples')
      else next.delete('tab')
      setParams(next, { replace: true })
    }
  }, [tab])  // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = [
    { id: 'products', label: '产品' },
    { id: 'samples', label: '样品' },
  ]

  return (
    <div className="app-container">
      {/* 子 tab 栏 */}
      <div style={{
        position: 'sticky',
        top: 'calc(var(--safe-top) - 4px)',
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        padding: 'calc(8px + var(--safe-top)) 16px 8px',
        marginBottom: '4px',
        borderBottom: '1px solid rgba(244, 114, 182, 0.10)',
      }}>
        <div style={{
          display: 'flex',
          background: 'rgba(244, 114, 182, 0.06)',
          borderRadius: '12px',
          padding: '3px',
        }}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  border: 'none',
                  borderRadius: '9px',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#fff' : 'var(--text-sub)',
                  background: active
                    ? 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)'
                    : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: active ? '0 2px 8px rgba(236, 72, 182, 0.25)' : 'none',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 内容 */}
      <div style={{ paddingTop: '4px' }}>
        {tab === 'products' ? <HomePage /> : <SamplesPage />}
      </div>
    </div>
  )
}