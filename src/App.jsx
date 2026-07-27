import { HashRouter, Routes, Route } from 'react-router-dom'
import { MoodPage } from './pages/MoodPage'
import { StoreProvider } from './store'
import { ToastProvider } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import { HomePage } from './pages/HomePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SamplesPage } from './pages/SamplesPage'
import { FinancePage } from './pages/FinancePage'
import { SensitiveWordsPage } from './pages/SensitiveWordsPage'

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/mood" element={<MoodPage />} />
            <Route path="/sensitive" element={<SensitiveWordsPage />} />
          </Routes>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
