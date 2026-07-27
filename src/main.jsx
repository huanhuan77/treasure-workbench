import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const BUILD_ID_KEY = 'app_build_id'

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
      location.reload(true)
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
    <App />
  </StrictMode>,
)
