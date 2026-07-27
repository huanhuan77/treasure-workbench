import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const BUILD_ID_KEY = 'app_build_id'

// 检测构建版本，若与本地不一致则强制硬刷新以加载最新资源
// force=true 时即使版本一致也提示用户结果（供「检查更新」按钮调用）
export async function checkForUpdate(force = false) {
  try {
    // 用相对路径，兼容 GitHub Pages 子路径部署（BASE_URL 随 vite base 配置）
    const url = import.meta.env.BASE_URL + 'version.json?_=' + Date.now()
    const res = await fetch(url)
    const data = await res.json()
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
