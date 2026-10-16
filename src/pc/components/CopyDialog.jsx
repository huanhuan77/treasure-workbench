import { useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'

// PC 版「编辑文案」弹窗。
// 用户要求：PC 端按钮操作都走弹窗、不跳页面（手机版仍跳 EditCopyPage）。
// 逻辑照抄 EditCopyPage：内容不能为空、updateCopy 保存、deleteCopy 删除（二次确认）。
export function CopyDialog({ product, copy, onClose }) {
  const { updateCopy, deleteCopy } = useStore()
  const { show } = useToast()
  const [content, setContent] = useState(copy?.content || '')
  const [delOpen, setDelOpen] = useState(false)

  if (!product || !copy) return null

  const save = () => {
    if (!content.trim()) { show('文案内容不能为空', 'error'); return }
    updateCopy(product.id, copy.id, { content: content.trim() })
    show('文案已更新', 'success')
    onClose()
  }

  const doDelete = () => {
    deleteCopy(product.id, copy.id)
    setDelOpen(false)
    onClose()
    show('已删除', 'success')
  }

  return (
    <>
      <div className="pcv-overlay" onClick={onClose}>
        <div className="pcv-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
          <div className="pcv-dialog-h">
            <span>编辑文案</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>{product.name}</span>
            <div className="pcv-spacer" />
            <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
          </div>

          <div className="pcv-dialog-b">
            <textarea
              className="pcv-input"
              style={{ width: '100%', minHeight: 240, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
              placeholder="文案内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </div>

          <div className="pcv-dialog-f">
            <button
              className="pcv-btn pcv-btn-ghost"
              style={{ color: '#b96a66', borderColor: 'rgba(185, 106, 102, 0.35)' }}
              onClick={() => setDelOpen(true)}
            >删除</button>
            <div className="pcv-spacer" />
            <button className="pcv-btn pcv-btn-ghost" onClick={onClose}>取消</button>
            <button className="pcv-btn" onClick={save} disabled={!content.trim()}>保存</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={doDelete}
        title="删除文案"
        message="确定删除这条文案吗？"
        confirmText="删除"
        danger
      />
    </>
  )
}
