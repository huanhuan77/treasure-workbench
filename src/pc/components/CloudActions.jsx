import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { getStoredToken } from '../../utils/cloudBackup'
import { syncAll } from '../../utils/sync'
import { useStore } from '../../store'

// PC 全站右上角的云备份（数据备份 / 同步 / 恢复）
export function CloudActions() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { applySyncResult } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)

  const requireToken = () => {
    const tk = getStoredToken()
    if (!tk) {
      show('请先在「数据备份」页填写 GitHub Token', 'error')
      navigate('/backup')
      return ''
    }
    return tk
  }

  const handleSync = async () => {
    const tk = requireToken()
    if (!tk || syncing) return
    setSyncing(true)
    try {
      const gistId = localStorage.getItem('backup_gist_id')
      const result = await syncAll(tk, gistId)
      if (result.gistId) localStorage.setItem('backup_gist_id', result.gistId)
      applySyncResult(result.merged['blogger_workbench_data_v1'])
      show(result.hasChanges ? '✅ 同步完成：本机与云端已合并' : '✅ 已是最新', 'success')
    } catch (e) {
      show('同步失败：' + e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

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

  return (
    <>
      <div className="pcv-globalactions">
        <button className="pcv-btn pcv-btn-ghost" onClick={() => navigate('/backup')}>数据备份</button>
        <button className="pcv-btn pcv-btn-ghost" disabled={syncing} onClick={handleSync}>
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
