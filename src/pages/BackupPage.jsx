import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle, ConfirmModal } from '../components/Modal'

const KEYS = [
  'blogger_workbench_data_v1',
  'blogger_investments_v1',
  'blogger_calendar_v1',
  'daily_plan_v1',
]

const GIST_ID_KEY = 'backup_gist_id'
const LAST_SYNC_KEY = 'backup_last_sync_at'

export function BackupPage() {
  const { show } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem('backup_github_token') || '')
  const [showToken, setShowToken] = useState(false)
  const [lastSync, setLastSync] = useState(() => localStorage.getItem(LAST_SYNC_KEY) || '')
  const [gistId, setGistId] = useState(() => localStorage.getItem(GIST_ID_KEY) || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const handle = setInterval(() => {
      setLastSync(localStorage.getItem(LAST_SYNC_KEY) || '')
    }, 10000)
    return () => clearInterval(handle)
  }, [])

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

  // 保存同步时间
  const markSynced = () => {
    const now = new Date().toISOString()
    localStorage.setItem(LAST_SYNC_KEY, now)
    setLastSync(now)
  }

  const formatSyncTime = (iso) => {
    if (!iso) return '从未同步'
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin} 分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} 小时前`
    return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
      if (!gistId) {
        localStorage.setItem(GIST_ID_KEY, result.id)
        setGistId(result.id)
      }
      markSynced()
      show('☁️ 已上传到 GitHub Gist', 'success')
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
      const updatedAt = gist.updated_at
      const backup = JSON.parse(content)
      let count = 0
      for (const [key, value] of Object.entries(backup)) {
        localStorage.setItem(key, JSON.stringify(value))
        count++
      }
      if (updatedAt) markSynced()
      show(`已恢复 ${count} 个模块，刷新后生效`, 'success')
    } catch (e) {
      show('下载失败: ' + e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  // 删除云备份
  const deleteCloudBackup = async () => {
    const gistId = localStorage.getItem(GIST_ID_KEY)
    if (!gistId) { show('没有云备份可删除', 'error'); return }
    setSyncing(true)
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token.trim()}` },
      })
      if (!res.ok && res.status !== 204 && res.status !== 404) throw new Error(`HTTP ${res.status}`)
      localStorage.removeItem(GIST_ID_KEY)
      localStorage.removeItem(LAST_SYNC_KEY)
      setGistId('')
      setLastSync('')
      setShowDeleteConfirm(false)
      show('☁️ 云备份已删除', 'success')
    } catch (e) {
      show('删除失败: ' + e.message, 'error')
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
        } else if (key === 'daily_plan_v1') {
          stats['每日计划'] = d.tasks?.length || 0
        }
      }
    } catch (e) {}
  }

  return (
    <div className="app-container">
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>💾 数据备份</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>云同步到 GitHub Gist，数据永不丢失</p>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 当前数据概览 */}
        <div style={{ ...glassStyle, padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>📊 当前数据</h3>
          {Object.keys(stats).length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', margin: 0 }}>暂无数据</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
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

        {/* 云同步状态 */}
        <div style={{ ...glassStyle, padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>☁️ 云同步状态</h3>
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
              background: lastSync ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
              color: lastSync ? '#16a34a' : '#92400e',
            }}>
              {lastSync ? '已同步' : '未同步'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
            上次同步：<span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{formatSyncTime(lastSync)}</span>
          </div>
          {gistId && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', wordBreak: 'break-all' }}>
              Gist ID: {gistId}
            </div>
          )}
        </div>

        {/* 云备份操作 */}
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

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button onClick={uploadToGist} disabled={syncing || !token} style={{
              flex: 1, padding: '14px 0', borderRadius: '10px', border: 'none',
              background: syncing ? '#9ca3af' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              color: '#fff', fontSize: '14px', fontWeight: 700, cursor: syncing ? 'not-allowed' : 'pointer',
              boxShadow: syncing ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
            }}>
              {syncing ? '同步中...' : '☁️ 上传到云端'}
            </button>
            <button onClick={downloadFromGist} disabled={syncing || !token} style={{
              flex: 1, padding: '14px 0', borderRadius: '10px', border: '1.5px dashed #6366f1',
              background: 'transparent', color: '#4f46e5', fontSize: '14px', fontWeight: 700,
              cursor: syncing ? 'not-allowed' : 'pointer',
            }}>
              {syncing ? '同步中...' : '☁️ 从云端恢复'}
            </button>
          </div>

          {gistId && (
            <button onClick={() => setShowDeleteConfirm(true)} disabled={syncing} style={{
              width: '100%', marginTop: '8px', padding: '10px 0', borderRadius: '10px',
              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)',
              color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
            }}>
              🗑️ 删除云备份
            </button>
          )}
        </div>

        {/* 自动同步提示 */}
        <div style={{ marginTop: '4px', padding: '12px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', fontSize: '12px', color: '#92400e', lineHeight: 1.7 }}>
          💡 <b>云备份不会丢失</b>：数据存在 GitHub 私密 Gist，即使删掉 PWA 重装，点「从云端恢复」即可。<br />
          🔄 <b>自动同步</b>：每 3 小时自动备份一次，也可在此手动同步。<br />
          🔄 <b>恢复后</b>：需要刷新页面才能生效。<br />
          📦 备份包含：产品、样品、收支、攒钱、投资、日历、每日计划等全部数据。
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={deleteCloudBackup}
          title="删除云备份"
          message="确定删除 GitHub Gist 中的云备份？删除后无法恢复。本地数据不会受影响。"
          confirmText="确认删除"
          danger
        />
      )}
    </div>
  )
}
