import { useState } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { StoreProvider } from './store'
import { ToastProvider } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import { SavingsDrawer } from './components/SavingsDrawer'
import { HomePage } from './pages/HomePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SamplesPage } from './pages/SamplesPage'
import { FinancePage } from './pages/FinancePage'
import { SensitiveWordsPage } from './pages/SensitiveWordsPage'

const TITLES = { '/': '产品', '/samples': '样品', '/finance': '收支', '/sensitive': '词库' }
function App() {
  const [showSavings, setShowSavings] = useState(false)
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            padding: 'calc(12px + var(--safe-top)) 16px 8px',
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', gap: '6px',
            borderBottom: '1px solid rgba(255,255,255,0.5)',
          }}>
            <button onClick={() => setShowSavings(true)} style={{
              background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer',
              padding: 0, width: '32px', height: '32px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>💰</button>
            <span style={{ fontSize:'18px', fontWeight:700, color:'var(--text-main)' }}>{TITLES[window.location.hash.replace('#','')] || '宝藏工作台'}</span>
          </div>
          <div style={{ paddingTop: '60px' }}><Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/sensitive" element={<SensitiveWordsPage />} />
          </Routes></div>
          <SavingsDrawer open={showSavings} onClose={() => setShowSavings(false)} />
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
