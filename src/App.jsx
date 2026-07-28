import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './store'
import { ToastProvider } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import { HomePage } from './pages/HomePage'
import { SamplesPage } from './pages/SamplesPage'
import { FinancePage } from './pages/FinancePage'
import { SavingsPage } from './pages/SavingsPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SensitiveWordsPage } from './pages/SensitiveWordsPage'
import { SensitiveCheckPage } from './pages/SensitiveCheckPage'
import { WatermarkRemovePage } from './pages/WatermarkRemovePage'
import { CalendarPage } from './pages/CalendarPage'
import { VideoDownloadPage } from './pages/VideoDownloadPage'

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/sensitive" element={<SensitiveWordsPage />} />
            <Route path="/sensitive-check" element={<SensitiveCheckPage />} />
            <Route path="/watermark" element={<WatermarkRemovePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/download" element={<VideoDownloadPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
          </Routes>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App