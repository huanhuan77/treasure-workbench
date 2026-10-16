import { useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { CATEGORIES } from '../../utils/categories'
import { getTopStatus } from '../../utils/sampleStatus'

// PC 版「新增/编辑产品」对话框。
// 用户要求：点编辑直接弹窗，不要跳页面（列表上下文不丢）。
// 字段与校验口径照抄手机版 NewProductPage：
//   名称必填、分类选填、新增时可「从样品库选名称」（只列非放弃样品）；
//   编辑时底部多一个「删除该产品」（复用 ConfirmModal，会连带删除全部文案）。
// editing 传 'new' 表示新增，传产品对象表示编辑，null/false 表示关闭。
export function ProductDialog({ editing, onClose }) {
  const { products, samples, addProduct, updateProduct, deleteProduct } = useStore()
  const { show } = useToast()

  const isNew = editing === 'new'
  const product = isNew ? null : editing
  const open = !!editing

  // 用 key 在打开时重建组件，避免残留上一个产品的输入
  const [name, setName] = useState(product?.name || '')
  const [category, setCategory] = useState(product?.category || '')
  const [showPicker, setShowPicker] = useState(false)
  const [delOpen, setDelOpen] = useState(false)

  const sampleOptions = (() => {
    const set = new Set()
    for (const s of samples || []) {
      if (getTopStatus(s) !== 'abandoned' && s.name) set.add(s.name)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
  })()

  if (!open) return null

  const save = () => {
    if (!name.trim()) { show('请输入产品名称', 'error'); return }
    if (isNew) {
      addProduct({ name: name.trim(), brand: '', category })
      show('产品已添加', 'success')
    } else {
      updateProduct(product.id, { name: name.trim(), brand: product.brand || '', category })
      show('产品信息已更新', 'success')
    }
    onClose()
  }

  const doDelete = () => {
    deleteProduct(product.id)
    setDelOpen(false)
    onClose()
    show('已删除', 'success')
  }

  return (
    <>
      <div className="pcv-overlay" onClick={onClose}>
        <div className="pcv-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="pcv-dialog-h">
            <span>{isNew ? '添加产品' : '编辑产品'}</span>
            <div className="pcv-spacer" />
            <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
          </div>

          <div className="pcv-dialog-b">
            <div className="pcv-field-label">产品名称 <span style={{ color: '#b96a66' }}>*</span></div>
            <input
              className="pcv-input"
              style={{ width: '100%' }}
              placeholder="例如：补水喷雾"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            />

            {isNew && (
              <>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="pcv-btn pcv-btn-ghost" onClick={() => setShowPicker((v) => !v)}>
                    {showPicker ? '收起样品库' : '从样品库选名称'}
                  </button>
                  <span style={{ fontSize: 12, color: '#9aa0a9' }}>或直接手动输入</span>
                </div>
                {showPicker && (
                  <div className="pcv-picker">
                    {sampleOptions.length === 0 ? (
                      <span style={{ fontSize: 12, color: '#9aa0a9' }}>样品库暂无非放弃产品</span>
                    ) : sampleOptions.map((n) => (
                      <button key={n} className="pcv-flag" onClick={() => { setName(n); setShowPicker(false) }}>{n}</button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="pcv-field-label" style={{ marginTop: 18 }}>分类（选填）</div>
            <div className="pcv-catpick">
              {CATEGORIES.map((c) => (
                <button key={c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>

          <div className="pcv-dialog-f">
            {!isNew && (
              // 用真按钮（带描边）而不是纯文字，和右侧「取消」同一视觉层级
              <button
                className="pcv-btn pcv-btn-ghost"
                style={{ color: '#b96a66', borderColor: 'rgba(185, 106, 102, 0.35)' }}
                onClick={() => setDelOpen(true)}
              >删除该产品</button>
            )}
            <div className="pcv-spacer" />
            <button className="pcv-btn pcv-btn-ghost" onClick={onClose}>取消</button>
            <button className="pcv-btn" onClick={save}>保存</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={doDelete}
        title="删除产品"
        message="确定删除该产品及其所有文案吗？此操作不可撤销。"
        confirmText="删除"
      />
    </>
  )
}
