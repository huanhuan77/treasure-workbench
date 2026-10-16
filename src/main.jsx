import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 全局错误边界：页面渲染出错时显示错误信息而不是白屏
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('渲染错误:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'system-ui' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '16px', margin: '0 0 8px', color: '#333' }}>页面出错了</h2>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px', wordBreak: 'break-all' }}>{String(this.state.error?.message || this.state.error)}</p>
          <button onClick={() => { this.setState({ error: null }); window.location.reload() }} style={{
            padding: '10px 24px', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>重新加载</button>
        </div>
      )
    }
    return this.props.children
  }
}

const BUILD_ID_KEY = 'app_build_id'

// 一次性清理：灵感搜索功能已下线，把它的本地数据一并删掉（用户确认「连本地数据一起清」）。
// 必须用标记位保证只执行一次 —— 否则以后若重新上线该功能，每次启动都会把新数据抹掉。
// 云端那份由 utils/sync.js 的 SYNC_KEYS 摘掉该键后，下次同步即随之覆盖。
const INSPIRATION_CLEAN_FLAG = 'cleanup_inspiration_removed_v1'
try {
  if (!localStorage.getItem(INSPIRATION_CLEAN_FLAG)) {
    localStorage.removeItem('blogger_inspiration_v1')
    localStorage.setItem(INSPIRATION_CLEAN_FLAG, '1')
  }
} catch (e) { /* 隐私模式等场景忽略 */ }

// 检测构建版本，若与本地不一致则强制硬刷新以加载最新资源
// force=true 时即使版本一致也提示用户结果（供「检查更新」按钮调用）
export async function checkForUpdate(force = false) {
  try {
    // 主路径：跟随 Vite BASE_URL（构建时替换为 './' 等相对路径）
    const base = import.meta.env.BASE_URL || ''
    // fallback：从当前页面路径推断基础目录（兼容各种部署场景）
    const fallbackBase = location.pathname.replace(/[^/]*$/, '')
    const ts = '_=' + Date.now()

    let data
    for (const prefix of [base, fallbackBase]) {
      try {
        const res = await fetch(prefix + 'version.json?' + ts)
        if (res.ok) { data = await res.json(); break }
      } catch (_) { /* 继续试下一个 */ }
    }
    if (!data) return 'error'
    const saved = localStorage.getItem(BUILD_ID_KEY)
    if (saved && saved !== data.buildId) {
      localStorage.setItem(BUILD_ID_KEY, data.buildId)
      // 清空所有缓存 + 注销旧 Service Worker，强制拿最新代码
      try {
        if ('caches' in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
        }
      } catch (_) {}
      setTimeout(() => location.reload(true), 300)
      return 'reloading'
    }
    localStorage.setItem(BUILD_ID_KEY, data.buildId)
    return force ? 'latest' : 'ok'
  } catch (e) {
    return 'error'
  }
}

checkForUpdate()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)