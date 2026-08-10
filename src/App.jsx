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
import { BatchImportPage } from './pages/BatchImportPage'
import { EditCopyPage } from './pages/EditCopyPage'
import { ReadingPage } from './pages/ReadingPage'
import { NotePage } from './pages/NotePage'
import { BrandContactsPage } from './pages/BrandContactsPage'
import { InvestmentPage } from './pages/InvestmentPage'
import { NewTransactionPage } from './pages/NewTransactionPage'
import { EditTransactionPage } from './pages/EditTransactionPage'
import { NewSamplePage } from './pages/NewSamplePage'
import { EditSamplePage } from './pages/EditSamplePage'
import { NewProductPage, EditProductPage } from './pages/NewProductPage'
import { DailyPlanPage } from './pages/DailyPlanPage'
import { NewPublishPlanPage } from './pages/NewPublishPlanPage'

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
    // 距上次同步超过 3 小时才算"需要同步"（首次无记录也视为需要）
    const SYNC_INTERVAL = 3 * 60 * 60 * 1000
    const shouldSync = () => {
      const last = localStorage.getItem(LAST_SYNC_KEY)
      if (!last) return true
      const lastTime = new Date(last).getTime()
      if (Number.isNaN(lastTime)) return true
      return Date.now() - lastTime >= SYNC_INTERVAL
    }
    // iOS PWA 切后台会冻结 setInterval，改为：
    //  1) 首次延迟 60 秒做一次初始同步
    //  2) 回到前台 / 网络恢复时检查是否超过间隔，超过则补同步
    const first = setTimeout(doBackup, 60000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && shouldSync()) doBackup()
    }
    const onOnline = () => {
      if (shouldSync()) doBackup()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      clearTimeout(first)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
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
            <Route path="/investment" element={<InvestmentPage />} />
            <Route path="/reading" element={<ReadingPage />} />
            <Route path="/reading/:id/notes" element={<NotePage />} />
            <Route path="/brands" element={<BrandContactsPage />} />
            <Route path="/daily" element={<DailyPlanPage />} />
            <Route path="/publish-plan/new" element={<NewPublishPlanPage />} />
            <Route path="/product/new" element={<NewProductPage />} />
            <Route path="/product/:id/edit" element={<EditProductPage />} />
            <Route path="/batch-import/:id" element={<BatchImportPage />} />
            <Route path="/copy-edit/:productId/:copyId" element={<EditCopyPage />} />
            <Route path="/samples/new" element={<NewSamplePage />} />
            <Route path="/samples/:id/edit" element={<EditSamplePage />} />
            <Route path="/finance/new" element={<NewTransactionPage />} />
            <Route path="/finance/edit/:id" element={<EditTransactionPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
          </Routes>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
