import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, mkdirSync } from 'fs'

// 每次构建生成 dist/version.json，前端据此检测是否需要更新
function versionPlugin() {
  return {
    name: 'version-json',
    closeBundle() {
      mkdirSync('dist', { recursive: true })
      const buildId = String(Date.now())
      writeFileSync('dist/version.json', JSON.stringify({ buildId }))
    },
  }
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), versionPlugin()],
  // 拆分大 chunk 以便走 Contents API 部署（单文件 base64 限 1MB）
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 把 react / react-dom / react-router-dom 拆出来作为 vendor
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
            if (id.includes('antd') || id.includes('@ant-design') || id.includes('@rc-component')) return 'vendor-antd'
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
})
