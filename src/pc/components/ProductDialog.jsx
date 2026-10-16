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
  // 样品库候选的关键字。原来这里是个「从样品库选名称」的折叠开关 ——
  // 展开后三十多个名字平铺、只能靠眼睛扫，用户反馈「一点都不方便」。
  // 改成候选常驻 + 一个独立搜索框：搜到就能点，不用先展开再肉眼找。
  const [pickKw, setPickKw] = useState('')
  const [delOpen, setDelOpen] = useState(false)

  const sampleOptions = (() => {
    const set = new Set()
    for (const s of samples || []) {
      if (getTopStatus(s) !== 'abandoned' && s.name) set.add(s.name)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
  })()

  // 候选按关键字过滤（不分大小写，按中文名匹配）
  const pickKwTrim = pickKw.trim().toLowerCase()
  const pickedOptions = pickKwTrim
    ? sampleOptions.filter((n) => n.toLowerCase().includes(pickKwTrim))
    : sampleOptions

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
                <div className="pcv-field-label" style={{ marginTop: 16 }}>
                  从样品库选名称
                  <span style={{ fontWeight: 400, color: '#9aa0a9', marginLeft: 6 }}>
                    （共 {sampleOptions.length} 个 · 也可以直接在上面手动输入）
                  </span>
                </div>
                <input
                  className="pcv-input"
                  style={{ width: '100%' }}
                  placeholder="输入几个字筛一下，例如「湿巾」"
                  value={pickKw}
                  onChange={(e) => setPickKw(e.target.value)}
                />
                <div className="pcv-picker">
                  {sampleOptions.length === 0 ? (
                    <span style={{ fontSize: 12, color: '#9aa0a9' }}>样品库暂无非放弃产品</span>
                  ) : pickedOptions.length === 0 ? (
                    <span style={{ fontSize: 12, color: '#9aa0a9' }}>
                      没有匹配「{pickKw.trim()}」的样品 —— 上面直接手动输入这个名字即可
                    </span>
                  ) : (
                    pickedOptions.map((n) => (
                      <button
                        key={n}
                        // 选中当前名称时上色，省得点了哪条自己还要对一遍
                        className={`pcv-flag${n === name.trim() ? ' on' : ''}`}
                        // 不再关闭候选区：连选几次改名字时免得反复展开
                        onClick={() => setName(n)}
                      >{n}</button>
                    ))
                  )}
                </div>
                {pickKwTrim && pickedOptions.length > 0 && (
                  <div style={{ fontSize: 11, color: '#9aa0a9', marginTop: 6 }}>
                    匹配 {pickedOptions.length} / {sampleOptions.length} 个
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
