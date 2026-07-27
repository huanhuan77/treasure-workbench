import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

// 每次构建生成 dist/version.json，前端据此检测是否需要更新
function versionPlugin() {
  return {
    name: 'version-json',
    closeBundle() {
      const buildId = String(Date.now())
      writeFileSync('dist/version.json', JSON.stringify({ buildId }))
    },
  }
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), versionPlugin()],
})
