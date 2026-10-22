import { useMemo, useRef, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { parseBulkCopies } from '../../utils/helpers'
import { readTextFiles } from '../../utils/readTextFile'

// PC 版「批量导入文案」弹窗。
// 逻辑照抄手机版 BatchImportPage：同一套 parseBulkCopies 解析、同一个话题优先级、
// 同一个 addCopies 写入（store 里自带 dedupeCopies，重复内容会自动合并）。
// 手机版是个整页，PC 按既定规矩做成弹窗、不跳页面。
//
// 话题优先级：文本自带话题 > 产品默认话题(product.topics) > 兜底（手机版这里是空数组，
// 即「未填话题不会默认填充，留空白」，保持一致）。
const DEFAULT_IMPORT_TOPICS = []

export function CopyImportDialog({ product, onClose }) {
  const { addCopies } = useStore()
  const { show } = useToast()
  const [text, setText] = useState('')
  const fileRef = useRef(null)


  // 导入 .txt / .md：内容追加到输入框，走同一套 parseBulkCopies 解析 + 预览，确认后再入库
  const onPickFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''   // 允许连续导入同一个文件
    if (!files.length) return
    try {
      const merged = await readTextFiles(files)
      if (!merged) { show('文件是空的', 'error'); return }
      setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${merged}` : merged))
      show(`已读取 ${files.length} 个文件，可检查下方预览后导入`, 'success')
    } catch (err) {
      show('读取文件失败，请确认是文本文件', 'error')
    }
  }

  const list = useMemo(() => parseBulkCopies(text), [text])
  const ordered = list.filter((i) => i.hasOrder).length
  const used = list.filter((i) => i.used).length
  const baseTopics = product?.topics && product.topics.length ? product.topics : DEFAULT_IMPORT_TOPICS

  if (!product) return null

  const doImport = () => {
    if (list.length === 0) { show('没有解析到文案', 'error'); return }
    // 文本自带话题优先，没有才套产品默认话题
    const enriched = list.map((item) => ({
      content: item.content,
      topics: item.topics && item.topics.length ? item.topics : baseTopics,
      hasOrder: item.hasOrder,
      used: item.used,
    }))
    addCopies(product.id, enriched)
    show(`已导入 ${enriched.length} 条文案`, 'success')
    onClose()
  }

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span>批量导入文案</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>{product.name}</span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          {/* 支持直接导入 txt 文档（用户要求「支持导入txt文档识别」）：读完走同一套解析 + 预览 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#8a8f98' }}>粘贴文案，或导入 txt / md 文件（支持多选）</span>
            <div className="pcv-spacer" />
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,text/plain"
              multiple
              style={{ display: 'none' }}
              onChange={onPickFiles}
            />
            <button className="pcv-btn pcv-btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}>
              📄 导入 txt 文件
            </button>
          </div>

          <textarea
            className="pcv-input"
            style={{ width: '100%', minHeight: 150, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            placeholder={'多条文案之间用空行分隔；👍=出单、✅=用过（标记会被自动去掉）\n末尾单独一行 #话题1 #话题2 可套用到全部'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />

          {list.length === 0 ? (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.7,
              background: '#fafbfc', border: '0.5px solid rgba(15, 23, 42, 0.08)', color: '#6b7280',
            }}>
              💡 多条文案之间用<b>空行</b>分隔；末尾单独一行 <code style={{ background: '#eef0f3', padding: '0 4px', borderRadius: 3 }}>#话题1 #话题2</code> 套用全部。
              <br />
              🏷️ 文案未自带话题时，将自动套用产品默认话题：
              {baseTopics.length > 0 ? baseTopics.map((t) => t.replace(/^#/, '')).join(' ') : '（该产品未设置，留空白）'}
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>解析预览</span>
                <span style={{ fontSize: 12, color: '#9aa0a9' }}>共 <b style={{ color: '#b8517f' }}>{list.length}</b> 条</span>
                {ordered > 0 && <span className="pcv-chip" style={{ background: '#fbeaea', color: '#b96a66' }}>出单 {ordered}</span>}
                {used > 0 && <span className="pcv-chip" style={{ background: '#eef4ef', color: '#5f8a74' }}>用过 {used}</span>}
                {ordered === 0 && used === 0 && <span style={{ fontSize: 12, color: '#9aa0a9' }}>未标记状态</span>}
                <div className="pcv-spacer" />
                <span style={{ fontSize: 12, color: '#9aa0a9' }}>
                  🏷️ {baseTopics.length > 0 ? `未带话题的将套用：${baseTopics.map((t) => t.replace(/^#/, '')).join(' ')}` : '未填话题不会默认填充'}
                </span>
              </div>

              <div style={{
                maxHeight: 220, overflowY: 'auto', padding: 8, borderRadius: 10,
                background: '#fafbfc', border: '0.5px solid rgba(15, 23, 42, 0.08)',
              }}>
                {list.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', marginBottom: 4,
                      borderRadius: 6, background: '#fff', fontSize: 12,
                      borderLeft: `3px solid ${item.hasOrder ? '#dd9a95' : item.used ? '#9dbfa9' : '#e5e7eb'}`,
                    }}
                  >
                    <span style={{ color: '#c9cdd4', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                      {item.content}
                    </span>
                    {item.hasOrder && <span className="pcv-chip" style={{ background: '#fbeaea', color: '#b96a66' }}>出单</span>}
                    {item.used && <span className="pcv-chip" style={{ background: '#eef4ef', color: '#5f8a74' }}>用过</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pcv-dialog-f">
          <div className="pcv-spacer" />
          <button className="pcv-btn pcv-btn-ghost" onClick={onClose}>取消</button>
          <button className="pcv-btn" onClick={doImport} disabled={list.length === 0}>
            导入{list.length > 0 ? ` ${list.length} 条` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
