import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { getStoredToken } from '../../utils/cloudBackup'
import { syncAll } from '../../utils/sync'
import { useStore } from '../../store'

// PC 全站的云备份条（数据备份 / 同步 / 恢复）
//
// 关于「数据怎么没同步」：本机数据在 localStorage，手机在另一台设备的 localStorage，
// 两者之间没有实时通道 —— 只有点「同步」才会跟 GitHub Gist 做一次
// 读 → 按 id 合并 → 写回。所以「手机刚记完，PC 刷新看不到」是符合预期的。
// 这里加了**自动同步**兜底：进入 PC 版、以及切回这个标签页时，只要有 Token 且
// 距上次自动同步超过 AUTO_SYNC_GAP，就静默同步一次（合并逻辑不会覆盖任一端数据）。
const AUTO_SYNC_GAP = 5 * 60 * 1000
const LAST_AUTO_KEY = 'pc_auto_sync_at'

export function CloudActions() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { applySyncResult } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  // 上次同步时间（用于按钮 tooltip，让「有没有同步过」可见）
  const [lastSyncAt, setLastSyncAt] = useState(() => {
    const t = Number(localStorage.getItem(LAST_AUTO_KEY) || 0)
    return t > 0 ? new Date(t) : null
  })
  const syncingRef = useRef(false)

  const requireToken = () => {
    const tk = getStoredToken()
    if (!tk) {
      show('请先在「数据备份」页填写 GitHub Token', 'error')
      navigate('/backup')
      return ''
    }
    return tk
  }

  // silent=true 时不弹成功 toast（自动同步不该每次都打断视线），失败也只在控制台记一笔
  const runSync = useCallback(async ({ silent }) => {
    const tk = getStoredToken()
    if (!tk || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const gistId = localStorage.getItem('backup_gist_id')
      const result = await syncAll(tk, gistId)
      if (result.gistId) localStorage.setItem('backup_gist_id', result.gistId)
      applySyncResult(result.merged['blogger_workbench_data_v1'])
      const now = Date.now()
      localStorage.setItem(LAST_AUTO_KEY, String(now))
      setLastSyncAt(new Date(now))
      if (!silent) {
        show(result.hasChanges ? '✅ 同步完成：本机与云端已合并' : '✅ 已是最新', 'success')
      }
    } catch (e) {
      if (!silent) show('同步失败：' + e.message, 'error')
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [applySyncResult, show])

  const handleSync = () => runSync({ silent: false })

  // 自动同步：首次进入 + 切回标签页（浏览器最小化/切走再回来）时，间隔超过 5 分钟才真正跑
  useEffect(() => {
    const maybeAutoSync = () => {
      if (!getStoredToken()) return
      const last = Number(localStorage.getItem(LAST_AUTO_KEY) || 0)
      if (Date.now() - last < AUTO_SYNC_GAP) return
      runSync({ silent: true })
    }
    maybeAutoSync()
    const onVisible = () => { if (document.visibilityState === 'visible') maybeAutoSync() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [runSync])

  const handleRestore = async () => {
    const tk = getStoredToken()
    setConfirmRestore(false)
    if (!tk) {
      show('请先在「数据备份」页填写 GitHub Token', 'error')
      navigate('/backup')
      return
    }
    setRestoring(true)
    try {
      const { restoreBackup } = await import('../../utils/cloudBackup')
      const { count } = await restoreBackup(tk)
      show(`已恢复 ${count} 个模块，正在刷新…`, 'success')
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      show('恢复失败：' + e.message, 'error')
    } finally {
      setRestoring(false)
    }
  }

  const syncTitle = lastSyncAt
    ? `上次同步：${lastSyncAt.toLocaleString('zh-CN', { hour12: false })}（切回本页或超过 5 分钟会自动同步）`
    : '本机还没同步过，点一下把手机端的数据合并过来'

  return (
    <>
      <div className="pcv-globalactions">
        <button className="pcv-btn pcv-btn-ghost" onClick={() => navigate('/backup')}>数据备份</button>
        <button className="pcv-btn pcv-btn-ghost" disabled={syncing} onClick={handleSync} title={syncTitle}>
          {syncing ? '同步中…' : '🔄 同步'}
        </button>
        <button className="pcv-btn pcv-btn-ghost" disabled={restoring} onClick={() => setConfirmRestore(true)}>
          {restoring ? '恢复中…' : '📥 恢复'}
        </button>
      </div>

      <ConfirmModal
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={handleRestore}
        title="从云端恢复"
        message="会用云端备份覆盖本机全部数据（产品、样品、收支、投资、日历等），本机未上传的内容会丢失。恢复后页面会自动刷新，确定继续？"
        confirmText="覆盖并恢复"
        danger
      />
    </>
  )
}
