import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

export function CloudActions({ vertical = false }) {
  const navigate = useNavigate()
  const { show } = useToast()
  // 取几个高频模块的本机条数：同步后用于提示「哪一块变了 / 什么都没变」，
  // 便于一眼分辨「没拉到」和「拉到了但页面被筛选挡住」
  const { applySyncResult, todos, publishRecords, samples, orders, transactions } = useStore()
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
    // 原来没 Token 时静默 return —— 用户点了「同步」什么都不发生，很容易误判成
    // 「同步了但数据没过来」。手动点的时候必须明确说清楚。
    if (!tk) {
      if (!silent) {
        show('还没填 GitHub Token，无法同步（去「备份与同步」页填写）', 'error')
        navigate('/pc/backup')
      }
      return
    }
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const gistId = localStorage.getItem('backup_gist_id')
      const before = {
        todos: (todos || []).length,
        publishRecords: (publishRecords || []).length,
        samples: (samples || []).length,
        orders: (orders || []).length,
        transactions: (transactions || []).length,
      }
      const result = await syncAll(tk, gistId)
      if (result.gistId) localStorage.setItem('backup_gist_id', result.gistId)
      const merged = result.merged?.['blogger_workbench_data_v1'] || {}
      applySyncResult(merged)
      const now = Date.now()
      localStorage.setItem(LAST_AUTO_KEY, String(now))
      setLastSyncAt(new Date(now))

      if (!silent) {
        // 摘要：哪几块条数变了（手机刚记的待办、发布记录等会体现在这里）
        const names = { todos: '待办', publishRecords: '发布记录', samples: '样品', orders: '出单', transactions: '收支' }
        const diffs = Object.keys(names)
          .filter((k) => (merged[k] || []).length !== before[k])
          .map((k) => `${names[k]} ${before[k]}→${(merged[k] || []).length}`)
        if (diffs.length) show(`✅ 同步完成：${diffs.join('、')}`, 'success')
        else if (result.hasChanges) show('✅ 同步完成：云端有更新，但待办/发布记录等条数未变', 'success')
        else show('✅ 已是最新：云端与本机条数一致（若手机刚记的没过来，说明手机那次同步没上传成功）', 'error')
      }
    } catch (e) {
      if (!silent) show('同步失败：' + e.message, 'error')
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [applySyncResult, show, navigate, todos, publishRecords, samples, orders, transactions])

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
      {/* vertical：放在左侧边栏底部，三个按钮竖排、等宽（用户要求「放侧边栏」）。
          默认横排（用于顶栏场景）。 */}
      <div className={`pcv-globalactions${vertical ? ' pcv-globalactions--side' : ''}`}>
        {/* 「备份与同步」= 跳 PC 版备份页（用户要求：不再弹诊断弹窗，
            也不再跳手机版 /backup）。诊断弹窗挪到那个页面上的「查看同步诊断」按钮。 */}
        <button
          className="pcv-btn pcv-btn-ghost"
          style={vertical ? { width: '100%', justifyContent: 'center' } : undefined}
          onClick={() => navigate('/pc/backup')}
          title="打开数据备份页"
        >
          备份与同步
        </button>
        <button
          className="pcv-btn pcv-btn-ghost"
          style={vertical ? { width: '100%', justifyContent: 'center' } : undefined}
          disabled={syncing}
          onClick={handleSync}
          title={syncTitle}
        >
          {syncing ? '同步中…' : '🔄 同步'}
        </button>
        <button
          className="pcv-btn pcv-btn-ghost"
          style={vertical ? { width: '100%', justifyContent: 'center' } : undefined}
          disabled={restoring}
          onClick={() => setConfirmRestore(true)}
        >
          {restoring ? '恢复中…' : '📥 恢复'}
        </button>
      </div>

      {/* ⚠️ 必须 portal 到 body：这组按钮现在渲染在**侧边栏**里，
          .pcv-side 是 sticky、.pcv-root 又是 overflow:hidden，
          直接挂弹窗会被裁在侧栏内、且被主内容盖住（点「备份与同步」只看到页面变灰、弹窗不见）。 */}
      {createPortal(
        <>
          <ConfirmModal
            open={confirmRestore}
            onClose={() => setConfirmRestore(false)}
            onConfirm={handleRestore}
            title="从云端恢复"
            message="会用云端备份覆盖本机全部数据（产品、样品、收支、投资、日历等），本机未上传的内容会丢失。恢复后页面会自动刷新，确定继续？"
            confirmText="覆盖并恢复"
            danger
          />
        </>,
        document.body,
      )}
    </>
  )
}
