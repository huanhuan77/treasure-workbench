import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './store'
import { ToastProvider, useToast } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import { HomePage } from './pages/HomePage'
import { SamplesPage } from './pages/SamplesPage'
import { FinancePage } from './pages/FinancePage'
import { SavingsPage } from './pages/SavingsPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SensitiveWordsPage } from './pages/SensitiveWordsPage'
import { SensitiveCheckPage } from './pages/SensitiveCheckPage'
import { CalendarPage } from './pages/CalendarPage'
import { CalendarDetailPage } from './pages/CalendarDetailPage'
import { BackupPage } from './pages/BackupPage'
import { NewTransactionPage } from './pages/NewTransactionPage'
import { NewSamplePage } from './pages/NewSamplePage'
import { EditSamplePage } from './pages/EditSamplePage'
import { NewProductPage, EditProductPage } from './pages/NewProductPage'
import { DailyPlanPage } from './pages/DailyPlanPage'

// 自动云同步组件（放在 ToastProvider 内，可弹出通知）
function AutoBackup() {
  const { show } = useToast()
  useEffect(() => {
    const KEYS = ['blogger_workbench_data_v1', 'blogger_investments_v1', 'blogger_calendar_v1', 'daily_plan_v1']
    const GIST_ID_KEY = 'backup_gist_id'
    const LAST_SYNC_KEY = 'backup_last_sync_at'
    const doBackup = async () => {
      const token = localStorage.getItem('backup_github_token')
      if (!token) return
      const data = {}
      for (const key of KEYS) {
        try { const r = localStorage.getItem(key); if (r) data[key] = JSON.parse(r) } catch (e){}
      }
      if (Object.keys(data).length === 0) return
      const gistId = localStorage.getItem(GIST_ID_KEY)
      const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists'
      try {
        const res = await fetch(url, {
          method: gistId ? 'PATCH' : 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gistId ? {
            files: { 'treasure-workbench-backup.json': { content: JSON.stringify(data, null, 2) } },
          } : {
            description: '博主工作台数据备份', public: false,
            files: { 'treasure-workbench-backup.json': { content: JSON.stringify(data, null, 2) } },
          }),
        })
        if (res.ok) {
          const result = await res.json()
          if (!gistId) localStorage.setItem(GIST_ID_KEY, result.id)
          localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
        }
      } catch (e){}
    }
    // 首次延迟 60 秒避免影响首屏加载，之后每 3 小时自动同步
    const first = setTimeout(doBackup, 60000)
    const interval = setInterval(doBackup, 3 * 60 * 60 * 1000)
    return () => { clearTimeout(first); clearInterval(interval) }
  }, [show])
  return null
}

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AutoBackup />
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/sensitive" element={<SensitiveWordsPage />} />
            <Route path="/sensitive-check" element={<SensitiveCheckPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/calendar/:date" element={<CalendarDetailPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/daily" element={<DailyPlanPage />} />
            <Route path="/product/new" element={<NewProductPage />} />
            <Route path="/product/:id/edit" element={<EditProductPage />} />
            <Route path="/samples/new" element={<NewSamplePage />} />
            <Route path="/samples/:id/edit" element={<EditSamplePage />} />
            <Route path="/finance/new" element={<NewTransactionPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
          </Routes>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
