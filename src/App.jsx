import { useEffect, useRef } from 'react'
import { HashRouter, useLocation, useNavigate } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { ToastProvider, useToast } from './components/Toast'
import { GlobalKeyboardFix } from './components/GlobalKeyboardFix'
import { BottomNav } from './components/BottomNav'
import { DashboardPage } from './pages/DashboardPage'
import SummaryPage from './pages/SummaryPage'
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
import { UncategorizedSamplesPage } from './pages/UncategorizedSamplesPage'
import { ExpiringSamplesPage } from './pages/ExpiringSamplesPage'
import { LowPublishSamplesPage } from './pages/LowPublishSamplesPage'
import { EditSamplePage } from './pages/EditSamplePage'
import { NewProductPage, EditProductPage } from './pages/NewProductPage'
import { DailyPlanPage } from './pages/DailyPlanPage'
import { TodoPage } from './pages/TodoPage'
import { NewPublishRecordPage } from './pages/NewPublishRecordPage'
import { PublishRecordsPage } from './pages/PublishRecordsPage'
import { PublishRemindersPage } from './pages/PublishRemindersPage'
import { NewOrderPage } from './pages/NewOrderPage'
import { KeepAliveRoutes } from './components/KeepAliveRoutes'
import { useIsDesktop } from './utils/useIsDesktop'
import { PcShell } from './pc/PcShell'
import { PcDashboard } from './pc/pages/PcDashboard'
import { PcProducts } from './pc/pages/PcProducts'
import { PcSamples } from './pc/pages/PcSamples'
import { PcPublishRecords } from './pc/pages/PcPublishRecords'
import { PcOrders } from './pc/pages/PcOrders'
import { PcSensitive } from './pc/pages/PcSensitive'
import { PcTodos } from './pc/pages/PcTodos'
import { PcSavings } from './pc/pages/PcSavings'
import { PcCalendar } from './pc/pages/PcCalendar'
import { PcBackup } from './pc/pages/PcBackup'
import { PcBrands } from './pc/pages/PcBrands'
import { PcDramas } from './pc/pages/PcDramas'
import { PcReading } from './pc/pages/PcReading'
import { PcFinance } from './pc/pages/PcFinance'
import { PcDaily } from './pc/pages/PcDaily'
import { PcInvestment } from './pc/pages/PcInvestment'
import { PcSummary } from './pc/pages/PcSummary'

// 路由表（data 形式，供 KeepAliveRoutes 内的 useRoutes 使用）
const routes = [
  // PC 版（/pc）：与手机版同源、同 store、同 localStorage，只换一套展示层。
  // 未迁移的分区先跳回手机版页面（见 PcShell 的 NAV 配置）。
  {
    path: '/pc',
    element: <PcShell />,
    children: [
      { index: true, element: <PcDashboard /> },
      { path: 'products', element: <PcProducts /> },
      { path: 'samples', element: <PcSamples /> },
      { path: 'publish-records', element: <PcPublishRecords /> },
      { path: 'orders', element: <PcOrders /> },
      { path: 'sensitive', element: <PcSensitive /> },
      { path: 'todos', element: <PcTodos /> },
      { path: 'savings', element: <PcSavings /> },
      { path: 'calendar', element: <PcCalendar /> },
      { path: 'brands', element: <PcBrands /> },
      { path: 'dramas', element: <PcDramas /> },
      { path: 'reading', element: <PcReading /> },
      { path: 'finance', element: <PcFinance /> },
      { path: 'daily', element: <PcDaily /> },
      { path: 'investment', element: <PcInvestment /> },
      { path: 'summary', element: <PcSummary /> },
      { path: 'backup', element: <PcBackup /> },
    ],
  },
  { path: '/', element: <DashboardPage /> },
  { path: '/summary', element: <SummaryPage /> },
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
  { path: '/samples/uncategorized', element: <UncategorizedSamplesPage /> },
  { path: '/samples/expiring', element: <ExpiringSamplesPage /> },
  { path: '/samples/low-publish', element: <LowPublishSamplesPage /> },
  { path: '/samples/new', element: <NewSamplePage /> },
  { path: '/samples/:id/edit', element: <EditSamplePage /> },
  { path: '/finance/new', element: <NewTransactionPage /> },
  { path: '/finance/edit/:id', element: <EditTransactionPage /> },
  { path: '/product/:id', element: <ProductDetailPage /> },
]

// 本次会话是否明确选择了手机版（点过 PC 版里的「切回手机版」）
function mobileForced() {
  try { return sessionStorage.getItem('pc_force_mobile') === '1' } catch (e) { return false }
}

// 启动落地：桌面宽度首次访问直接进 PC 版；手机版则强制落地「总览」，
// 忽略 URL 里的 hash（#/reading 等）。仅首次挂载执行一次，不干扰应用内导航。
function LaunchRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  const done = useRef(false)
  const isDesktop = useIsDesktop()
  useEffect(() => {
    if (done.current) return
    done.current = true
    // PC 版有自己的落地逻辑（窄屏会送回手机版），这里不插手
    if (location.pathname.startsWith('/pc')) return
    // 桌面宽度进 PC 版。本次会话点过「切回手机版」就不再跳，避免被反复弹回去
    if (isDesktop && !mobileForced()) {
      navigate('/pc', { replace: true })
      return
    }
    if (location.pathname !== '/') {
      navigate('/', { replace: true })
    }
  }, [])
  return null
}

// /pc 自带侧边栏，不要再叠一层手机版的底部导航 / 侧边栏
function MobileOnly({ children }) {
  const { pathname } = useLocation()
  return pathname.startsWith('/pc') ? null : children
}

function App() {
  return (
    <StoreProvider>
        <ToastProvider>
          <GlobalKeyboardFix />
        <HashRouter>
          <LaunchRedirect />
          <KeepAliveRoutes routes={routes} />
          <MobileOnly>
            <BottomNav />
          </MobileOnly>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
