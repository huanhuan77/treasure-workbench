import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle } from '../components/Modal'

const KEYS = [
  'blogger_workbench_data_v1',
  'blogger_investments_v1',
  'blogger_calendar_v1',
]

const GIST_ID_KEY = 'backup_gist_id'

export function BackupPage() {
  const { show } = useToast()
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem('backup_github_token') || '')
  const [showToken, setShowToken] = useState(false)
  const importRef = useRef(null)

  // 获取所有数据
  const getAllData = () => {
    const backup = {}
    for (const key of KEYS) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) backup[key] = JSON.parse(raw)
      } catch (e){}
    }
    return backup
  }

  const handleExport = () => {
    const backup = getAllData()
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

  // 上传到 GitHub Gist
  const uploadToGist = async () => {
    if (!token.trim()) { show('请先填写 GitHub Token', 'error'); return }
    setSyncing(true)
    try {
      const data = getAllData()
      const gistId = localStorage.getItem(GIST_ID_KEY)
      const url = gistId
        ? `https://api.github.com/gists/${gistId}`
        : 'https://api.github.com/gists'
      const method = gistId ? 'PATCH' : 'POST'
      const body = gistId ? {
        files: { 'treasure-workbench-backup.json': { content: JSON.stringify(data, null, 2) } },
      } : {
        description: '博主工作台数据备份',
        public: false,
        files: { 'treasure-workbench-backup.json': { content: JSON.stringify(data, null, 2) } },
      }
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      if (!gistId) localStorage.setItem(GIST_ID_KEY, result.id)
      show('☁️ 已上传到 GitHub', 'success')
    } catch (e) {
      show('上传失败: ' + e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  // 从 GitHub Gist 下载
  const downloadFromGist = async () => {
    if (!token.trim()) { show('请先填写 GitHub Token', 'error'); return }
    const gistId = localStorage.getItem(GIST_ID_KEY)
    if (!gistId) { show('还没有云端备份，请先上传', 'error'); return }
    setSyncing(true)
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { 'Authorization': `Bearer ${token.trim()}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const gist = await res.json()
      const content = gist.files?.['treasure-workbench-backup.json']?.content
      if (!content) throw new Error('备份文件不存在')
      const backup = JSON.parse(content)
      let count = 0
      for (const [key, value] of Object.entries(backup)) {
        localStorage.setItem(key, JSON.stringify(value))
        count++
      }
      show(`已恢复 ${count} 个模块，刷新后生效`, 'success')
    } catch (e) {
      show('下载失败: ' + e.message, 'error')
    } finally {
      setSyncing(false)
    }
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
    } catch (e) {}
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
        <div style={{ margin: '20px 0 12px', height: '1px', background: 'rgba(0,0,0,0.06)' }} />
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 10px' }}>☁️ 云备份（GitHub Gist）</h3>

        <div style={{ ...glassStyle, padding: '14px', marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '4px' }}>GitHub Token</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input value={token} onChange={e => { setToken(e.target.value); localStorage.setItem('backup_github_token', e.target.value) }}
              type={showToken ? 'text' : 'password'} placeholder="ghp_xxxxxxxxxxxx"
              style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1.5px solid rgba(0,0,0,0.06)', fontSize: '14px', outline: 'none' }} />
            <button onClick={() => setShowToken(!showToken)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>
              {showToken ? '隐藏' : '显示'}
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--gray-400)' }}>
            需要 repo 权限的 token，数据存储在私密 Gist 中
          </p>
        </div>

        <button onClick={uploadToGist} disabled={syncing || !token} style={{
          width: '100%', padding: '14px 0', borderRadius: '10px', border: 'none',
          background: syncing ? '#9ca3af' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
          color: '#fff', fontSize: '14px', fontWeight: 700, cursor: syncing ? 'not-allowed' : 'pointer',
          marginBottom: '8px',
          boxShadow: syncing ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
        }}>
          {syncing ? '同步中...' : '☁️ 上传到云备份'}
        </button>

        <button onClick={downloadFromGist} disabled={syncing || !token} style={{
          width: '100%', padding: '14px 0', borderRadius: '10px', border: '1.5px dashed #6366f1',
          background: 'transparent', color: '#4f46e5', fontSize: '14px', fontWeight: 700,
          cursor: syncing ? 'not-allowed' : 'pointer', marginBottom: '8px',
        }}>
          {syncing ? '同步中...' : '☁️ 从云备份恢复'}
        </button>

        {/* 提示 */}
        <div style={{ marginTop: '8px', padding: '12px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', fontSize: '12px', color: '#92400e', lineHeight: 1.7 }}>
          💡 <b>云备份不会丢失</b>：数据存在 GitHub 私密 Gist，即使删掉 PWA 重装，点「从云备份恢复」即可。<br />
          🔄 <b>恢复后</b>：需要刷新页面才能生效。<br />
          📦 备份包含：产品、样品、收支、攒钱、投资、日历等全部数据。
        </div>
      </div>
    </div>
  )
}
