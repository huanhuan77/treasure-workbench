import { useEffect, useCallback, useRef } from 'react'
import { HashRouter, useLocation, useNavigate } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { ToastProvider, useToast } from './components/Toast'
import { GlobalKeyboardFix } from './components/GlobalKeyboardFix'
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
import { NewDramaPage } from './pages/NewDramaPage'
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
import { TodoPage } from './pages/TodoPage'
import { NewPublishRecordPage } from './pages/NewPublishRecordPage'
import { PublishRecordsPage } from './pages/PublishRecordsPage'
import { PublishRemindersPage } from './pages/PublishRemindersPage'
import { NewOrderPage } from './pages/NewOrderPage'
import { KeepAliveRoutes } from './components/KeepAliveRoutes'

// 路由表（data 形式，供 KeepAliveRoutes 内的 useRoutes 使用）
const routes = [
  { path: '/', element: <DashboardPage /> },
  { path: '/products', element: <HomePage /> },
  { path: '/samples', element: <SamplesPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/orders/new', element: <NewOrderPage /> },
  { path: '/savings', element: <SavingsPage /> },
  { path: '/finance', element: <FinancePage /> },
  { path: '/sensitive', element: <SensitiveCenterPage /> },
  { path: '/calendar', element: <CalendarPage /> },
  { path: '/calendar/:date', element: <CalendarDetailPage /> },
  { path: '/backup', element: <BackupPage /> },
  { path: '/investment', element: <InvestmentPage /> },
  { path: '/reading', element: <ReadingPage /> },
  { path: '/reading/:id/notes', element: <NotePage /> },
  { path: '/brands', element: <BrandContactsPage /> },
  { path: '/daily', element: <DailyPlanPage /> },
  { path: '/todos', element: <TodoPage /> },
  { path: '/publish-records', element: <PublishRecordsPage /> },
  { path: '/publish-reminders', element: <PublishRemindersPage /> },
  { path: '/publish-record/new', element: <NewPublishRecordPage /> },
  { path: '/product/new', element: <NewProductPage /> },
  { path: '/product/:id/edit', element: <EditProductPage /> },
  { path: '/batch-import/:id', element: <BatchImportPage /> },
  { path: '/copy-edit/:productId/:copyId', element: <EditCopyPage /> },
  { path: '/dramas', element: <DramaPage /> },
  { path: '/dramas/new', element: <NewDramaPage /> },
  { path: '/samples/new', element: <NewSamplePage /> },
  { path: '/samples/:id/edit', element: <EditSamplePage /> },
  { path: '/finance/new', element: <NewTransactionPage /> },
  { path: '/finance/edit/:id', element: <EditTransactionPage /> },
  { path: '/product/:id', element: <ProductDetailPage /> },
]

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

// 启动强制落地「总览」：忽略 URL 里的 hash（#/reading 等），每次进来都从 / 开始。
// 仅首次挂载时执行一次，不干扰应用内正常导航。
function LaunchRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    if (location.pathname !== '/') {
      navigate('/', { replace: true })
    }
  }, [])
  return null
}

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AutoBackup />
        <GlobalKeyboardFix />
        <HashRouter>
          <LaunchRedirect />
          <KeepAliveRoutes routes={routes} />
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
