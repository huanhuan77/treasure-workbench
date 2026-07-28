import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider } from './store'
import { ToastProvider } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SensitiveWordsPage } from './pages/SensitiveWordsPage'
import { CopyExtractorPage } from './pages/CopyExtractorPage'
import { HomeShell } from './pages/HomeShell'
import { FinanceShell } from './pages/FinanceShell'

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            {/* 首页（产品 + 样品） */}
            <Route path="/" element={<HomeShell />} />

            {/* 财务（攒钱 + 收支） */}
            <Route path="/finance" element={<FinanceShell />} />

            {/* 其他独立 tab */}
            <Route path="/sensitive" element={<SensitiveWordsPage />} />
            <Route path="/extract" element={<CopyExtractorPage />} />

            {/* 产品详情 */}
            <Route path="/product/:id" element={<ProductDetailPage />} />

            {/* 旧路由兼容：单独访问时跳到对应的 shell + tab */}
            <Route path="/samples" element={<Navigate to="/?tab=samples" replace />} />
            <Route path="/savings" element={<Navigate to="/finance?tab=savings" replace />} />
          </Routes>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App