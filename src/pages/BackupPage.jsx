import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'

const KEYS = [
  'blogger_workbench_data_v1',
  'blogger_investments_v1',
  'blogger_calendar_v1',
]

export function BackupPage() {
  const { show } = useToast()
  const [importing, setImporting] = useState(false)
  const importRef = useRef(null)

  const handleExport = () => {
    const backup = {}
    for (const key of KEYS) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) backup[key] = JSON.parse(raw)
      } catch {}
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `全站备份_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    show(`已导出 ${Object.keys(backup).length} 个数据模块`, 'success')
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result)
        if (typeof backup !== 'object') throw new Error()
        let count = 0
        for (const [key, value] of Object.entries(backup)) {
          localStorage.setItem(key, JSON.stringify(value))
          count++
        }
        show(`已恢复 ${count} 个数据模块，刷新后生效`, 'success')
        setImporting(false)
      } catch {
        show('文件格式错误', 'error')
        setImporting(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const stats = {}
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const d = JSON.parse(raw)
        if (key === 'blogger_workbench_data_v1') {
          stats['产品'] = d.products?.length || 0
          stats['样品'] = d.samples?.length || 0
          stats['收支'] = d.transactions?.length || 0
        } else if (key === 'blogger_calendar_v1') {
          stats['日历'] = Object.keys(d).length
        } else if (key === 'blogger_investments_v1') {
          stats['投资'] = Array.isArray(d) ? d.length : 0
        }
      }
    } catch {}
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>💾 数据备份</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>导出全部数据到文件，导入后刷新页面</p>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 当前数据概览 */}
        <div style={{ ...glassStyle, padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>📊 当前数据</h3>
          {Object.keys(stats).length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', margin: 0 }}>暂无数据</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.entries(stats).map(([label, count]) => (
                <div key={label} style={{
                  padding: '10px', borderRadius: '8px', background: 'rgba(244,114,182,0.06)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>{count}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作 */}
        <button onClick={handleExport} style={{
          width: '100%', padding: '16px 0', borderRadius: '10px', border: 'none',
          background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
          fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px',
          boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
        }}>⬇️ 导出全部数据</button>

        <button onClick={() => importRef.current?.click()} disabled={importing} style={{
          width: '100%', padding: '16px 0', borderRadius: '10px', border: '1.5px dashed #6366f1',
          background: importing ? '#f3f4f6' : 'transparent',
          color: importing ? '#9ca3af' : '#4f46e5',
          fontSize: '15px', fontWeight: 700, cursor: importing ? 'not-allowed' : 'pointer',
        }}>
          {importing ? '导入中...' : '⬆️ 导入恢复'}
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} hidden />

        {/* 提示 */}
        <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', fontSize: '12px', color: '#92400e', lineHeight: 1.7 }}>
          💡 <b>建议定期导出</b>：数据存在浏览器本地，清除缓存或删除 PWA 会丢失。<br />
          🔄 <b>导入后</b>：需要刷新页面才能生效。<br />
          📦 备份文件包含：产品、样品、收支、攒钱、投资、日历等全部数据。
        </div>
      </div>
    </div>
  )
}
