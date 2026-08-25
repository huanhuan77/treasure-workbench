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
// ⚠️ 重要：只【拉取】云端较新的数据到本地，绝不自动【上传】本地数据。
// 旧逻辑会自动把本地数据覆盖到云端，一旦本地为空/旧，就会把云端已写好的文案冲掉。
// 需要把本地改动推到云端时，请到「数据备份」页手动点「上传到云端」。
function AutoBackup() {
  const { show } = useToast()
  useEffect(() => {
    const KEYS = ['blogger_workbench_data_v1', 'blogger_investments_v1', 'blogger_calendar_v1', 'daily_plan_v1']
    const GIST_ID_KEY = 'backup_gist_id'
    const LAST_SYNC_KEY = 'backup_last_sync_at'
    const doPull = async () => {
      const token = localStorage.getItem('backup_github_token')
      if (!token) return
      const gistId = localStorage.getItem(GIST_ID_KEY)
      if (!gistId) return
      const lastSync = localStorage.getItem(LAST_SYNC_KEY)
      try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (!res.ok) return
        const gist = await res.json()
        const remoteUpdated = gist.updated_at ? new Date(gist.updated_at).getTime() : 0
        const localUpdated = lastSync ? new Date(lastSync).getTime() : 0
        // 仅当云端比本地最近一次同步更新时才拉取，避免覆盖本地未上传的改动
        if (remoteUpdated <= localUpdated) return
        const content = gist.files?.['treasure-workbench-backup.json']?.content
        if (!content) return
        const backup = JSON.parse(content)
        for (const [key, value] of Object.entries(backup)) {
          localStorage.setItem(key, JSON.stringify(value))
        }
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
        show('☁️ 已自动同步最新云端数据', 'success')
      } catch (e) {}
    }
    // iOS PWA 切后台会冻结定时器，改为：首屏延迟、回到前台、网络恢复时检查
    const first = setTimeout(doPull, 8000)
    const onVisibility = () => { if (document.visibilityState === 'visible') doPull() }
    const onOnline = () => doPull()
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
