import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './store'
import { ToastProvider } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import { MoodDrawer } from './components/MoodDrawer'
import { HomePage } from './pages/HomePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SamplesPage } from './pages/SamplesPage'
import { FinancePage } from './pages/FinancePage'
import { SensitiveWordsPage } from './pages/SensitiveWordsPage'

function App() {
  const [showMood, setShowMood] = useState(false)
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
          <MoodDrawer open={showMood} onClose={() => setShowMood(false)} />
          <button onClick={() => setShowMood(true)} style={{
            position: 'fixed', bottom: 'calc(72px + var(--safe-bottom, 0px))', left: '16px',
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #f472b6, #ec4899)',
            color: '#fff', fontSize: '22px', cursor: 'pointer', zIndex: 150,
            boxShadow: '0 2px 12px rgba(236,72,153,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>😊</button>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
