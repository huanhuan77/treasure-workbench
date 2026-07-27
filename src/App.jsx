import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './store'
import { ToastProvider } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import { SavingsDrawer } from './components/SavingsDrawer'
import { HomePage } from './pages/HomePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SamplesPage } from './pages/SamplesPage'
import { FinancePage } from './pages/FinancePage'
import { SensitiveWordsPage } from './pages/SensitiveWordsPage'

function App() {
  const [showSavings, setShowSavings] = useState(false)
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/sensitive" element={<SensitiveWordsPage />} />
          </Routes>
          <SavingsDrawer open={showSavings} onClose={() => setShowSavings(false)} />
          <button onClick={() => setShowSavings(true)} style={{
            position: 'fixed', top: '16px', left: '16px',
            width: '40px', height: '40px', borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
            color: '#fff', fontSize: '18px', cursor: 'pointer', zIndex: 100,
            boxShadow: '0 2px 10px rgba(245,158,11,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>💰</button>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
