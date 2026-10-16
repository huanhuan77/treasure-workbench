import { useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { copyText } from '../../utils/clipboard'

// PC 版「话题管理」弹窗。
// 逻辑照抄手机版 ProductDetailPage 的话题管理（openTopics / applyTopics / addTopic /
// removeTopic / startEdit / saveEdit），只把外壳换成 pcv- 风格。
//
// 口径要点（别改）：
//   - 话题池 = 产品级 product.topics ∪ 所有文案自带 topics，按 # 拆分、去重
//   - 存的时候带 # 前缀（'#话题'），展示时去掉 #
//   - **改动即时写回**：每加/删/改一次就 updateProduct，不是等「完成」才写
//     （手机版注释写明：原来是点「完成」才写回，用户加完直接关弹窗就以为没生效）
//   - 写回时把话题池**同步到每一条文案**的 topics
const splitT = (t) => (t || '').split('#').map((x) => x.trim()).filter(Boolean).map((x) => '#' + x)
const norm = (arr) => [...new Set((arr || []).flatMap(splitT))]

// 产品全部话题（展示用，去掉 # 前缀）
export function allTopicTags(product) {
  const set = new Set()
  const add = (list) => (list || []).forEach((t) =>
    (t || '').split('#').map((x) => x.trim()).filter(Boolean).forEach((x) => set.add(x))
  )
  add(product?.topics)
  ;(product?.copies || []).forEach((c) => add(c.topics))
  return [...set]
}

export function TopicDialog({ product, onClose }) {
  const { updateProduct } = useStore()
  const { show } = useToast()

  // 打开时就把话题池灌进 draft（话题池 = 产品级 ∪ 文案自带）
  const [draft, setDraft] = useState(() => norm([
    ...(product?.topics || []),
    ...(product?.copies || []).flatMap((c) => c.topics || []),
  ]))
  const [input, setInput] = useState('')
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')

  if (!product) return null

  const apply = (next) => {
    const pool = norm(next)
    const updatedCopies = (product.copies || []).map((c) => ({ ...c, topics: [...pool] }))
    updateProduct(product.id, { copies: updatedCopies, topics: pool })
  }

  const add = () => {
    const raw = input.trim()
    if (!raw) return
    // 支持一次粘贴多个（#a #b / #a#b / a b）：按 # 前插空格再按空白切
    const tokens = raw.replace(/#/g, ' #').split(/\s+/).map((s) => s.trim()).filter(Boolean)
    const normalized = tokens.map((t) => (t.startsWith('#') ? t : '#' + t))
    const next = [...draft]
    let added = 0
    for (const t of normalized) {
      if (!next.includes(t)) { next.push(t); added++ }
    }
    if (added === 0) { show('这些话题已存在', 'error'); return }
    setDraft(next); setInput(''); apply(next)
    show(`已添加 ${added} 个话题`, 'success')
  }

  const remove = (t) => {
    const next = draft.filter((x) => x !== t)
    setDraft(next); apply(next)
  }

  const saveEdit = () => {
    let t = editVal.trim()
    if (!t) { setEditIdx(null); return }
    if (!t.startsWith('#')) t = '#' + t
    const next = [...draft]; next[editIdx] = t
    setDraft(next); setEditIdx(null); apply(next)
  }

  const done = () => {
    onClose()
    show(`话题已更新，${(product.copies || []).length} 条文案已同步`, 'success')
  }

  const copyOne = async (t) => {
    const ok = await copyText(`${t}#`)
    show(ok ? `已复制 ${t}#` : '复制失败', ok ? 'success' : 'error')
  }

  const copyAll = async () => {
    const text = draft.map((t) => `${t}#`).join(' ')
    const ok = await copyText(text)
    show(ok ? `已复制 ${draft.length} 个话题` : '复制失败', ok ? 'success' : 'error')
  }

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span>话题管理</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>{product.name}</span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="pcv-input"
              style={{ flex: 1 }}
              placeholder="输入话题，回车添加（可不带 #，可一次粘贴多个）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              autoFocus
            />
            <button className="pcv-btn" onClick={add}>添加</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <span className="pcv-field-label" style={{ margin: 0 }}>全部话题（{draft.length}）</span>
            <div className="pcv-spacer" />
            {draft.length > 0 && (
              <button className="pcv-btn-text" onClick={copyAll} style={{ color: '#6d4bc4' }}>复制全部到剪贴板</button>
            )}
          </div>

          <div style={{
            padding: 10, minHeight: 76, borderRadius: 10,
            background: '#fafbfc', border: '0.5px solid rgba(15, 23, 42, 0.08)',
            display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start',
          }}>
            {draft.length === 0 ? (
              <span style={{ fontSize: 12, color: '#9aa0a9' }}>暂无话题</span>
            ) : draft.map((t, i) => (
              <span key={i} className="pcv-topic">
                {editIdx === i ? (
                  <>
                    <input
                      className="pcv-topic-edit"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } }}
                      autoFocus
                    />
                    <button className="ok" title="保存" onClick={saveEdit}>✓</button>
                  </>
                ) : (
                  <>
                    {t}
                    <button title="复制该话题" onClick={() => copyOne(t)}>⧉</button>
                    <button title="改名" onClick={() => { setEditIdx(i); setEditVal(t) }}>✎</button>
                    <button className="danger" title="删除" onClick={() => remove(t)}>×</button>
                  </>
                )}
              </span>
            ))}
          </div>

          <p style={{ fontSize: 12, color: '#9aa0a9', margin: '10px 0 0', lineHeight: 1.6 }}>
            💡 列表来自所有文案的自带话题；新增 = 全部加上，删除 = 全部移除，改名 = 在原条目上替换。<b>改动即时生效</b>，点「完成」只是关闭。
          </p>
        </div>

        <div className="pcv-dialog-f">
          <div className="pcv-spacer" />
          <button className="pcv-btn" onClick={done}>完成</button>
        </div>
      </div>
    </div>
  )
}
