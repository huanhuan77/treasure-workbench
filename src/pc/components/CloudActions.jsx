import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { getStoredToken, uploadBackup, restoreBackup } from '../../utils/cloudBackup'

// PC 全站右上角的云备份三件套（数据备份 / 上传到云端 / 从云端恢复）。
//
// 原来这三个按钮只在「总览」页的顶栏里，其余 13 个页面要备份得先回总览。
// 现在由 PcShell 统一渲染一次（绝对定位在内容区右上角）——因为各页顶栏的
// 控件都靠左，右侧天然是空的，不会和页面自己的按钮打架。
//
// 逻辑与之前总览页里的实现完全一致：
//   · Token 存在「数据备份」页的 localStorage 里，没配就引导过去；
//   · 上传 = 本机覆盖云端（直接执行）；
//   · 恢复 = 云端覆盖本机（必须二次确认，成功后刷新页面）。
export function CloudActions() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [backingUp, setBackingUp] = useState(false)
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

  const handleUpload = async () => {
    const tk = requireToken()
    if (!tk || backingUp) return
    setBackingUp(true)
    try {
      await uploadBackup(tk)
      show('☁️ 已上传到云端', 'success')
    } catch (e) {
      show('上传失败：' + e.message, 'error')
    } finally {
      setBackingUp(false)
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
        <button className="pcv-btn pcv-btn-ghost" disabled={backingUp} onClick={handleUpload}>
          {backingUp ? '上传中…' : '☁️ 上传到云端'}
        </button>
        <button className="pcv-btn pcv-btn-ghost" disabled={restoring} onClick={() => setConfirmRestore(true)}>
          {restoring ? '恢复中…' : '📥 从云端恢复'}
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
