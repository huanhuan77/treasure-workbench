import { useEffect, useCallback } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { ToastProvider, useToast } from './components/Toast'
import { syncAll, GIST_ID_KEY, LAST_SYNC_KEY } from './utils/sync'
import { BottomNav } from './components/BottomNav'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'
import { SamplesPage } from './pages/SamplesPage'
import { OrdersPage } from './pages/OrdersPage'
import { FinancePage } from './pages/FinancePage'
import { SavingsPage } from './pages/SavingsPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SensitiveCenterPage } from './pages/SensitiveCenterPage'
import { DramaPage } from './pages/DramaPage'
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
import { NewPublishRecordPage } from './pages/NewPublishRecordPage'
import { PublishRecordsPage } from './pages/PublishRecordsPage'
import { PublishRemindersPage } from './pages/PublishRemindersPage'

// 自动云同步组件：双向同步（拉取云端 → 智能合并 → 写本地 → 推回云端）
function AutoBackup() {
  const { show } = useToast()
  const { applySyncResult } = useStore()
  const doSync = useCallback(async () => {
    const token = localStorage.getItem('backup_github_token')
    if (!token) return
    try {
      const gistId = localStorage.getItem(GIST_ID_KEY)
      const result = await syncAll(token, gistId)
      applySyncResult(result.merged['blogger_workbench_data_v1'])
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
      if (result.hasChanges) show('🔄 已自动同步云端数据')
    } catch (e) {}
  }, [show, applySyncResult])
  useEffect(() => {
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
    const first = setTimeout(() => { if (shouldSync()) doSync() }, 60000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && shouldSync()) doSync()
    }
    const onOnline = () => {
      if (shouldSync()) doSync()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      clearTimeout(first)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [doSync])
  return null
}

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AutoBackup />
        <HashRouter>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<HomePage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/sensitive" element={<SensitiveCenterPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/calendar/:date" element={<CalendarDetailPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/investment" element={<InvestmentPage />} />
            <Route path="/reading" element={<ReadingPage />} />
            <Route path="/reading/:id/notes" element={<NotePage />} />
            <Route path="/brands" element={<BrandContactsPage />} />
            <Route path="/daily" element={<DailyPlanPage />} />
            <Route path="/publish-records" element={<PublishRecordsPage />} />
            <Route path="/publish-reminders" element={<PublishRemindersPage />} />
            <Route path="/publish-record/new" element={<NewPublishRecordPage />} />
            <Route path="/product/new" element={<NewProductPage />} />
            <Route path="/product/:id/edit" element={<EditProductPage />} />
            <Route path="/batch-import/:id" element={<BatchImportPage />} />
            <Route path="/copy-edit/:productId/:copyId" element={<EditCopyPage />} />
            <Route path="/dramas" element={<DramaPage />} />
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
