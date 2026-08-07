import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, ConfirmModal, glassStyle } from '../components/Modal'
import { copyText, formatDate, todayStr, daysDiff } from '../utils/helpers'
import {
  generateTitle, generateTopics, generateSimilarCopy,
  getStyles, buildTitleWithTopics,
} from '../utils/copyGenerator'

// 风格选项（带 emoji 和颜色，参考图二）
const STYLE_OPTIONS = [
  { key: '全部', label: '全部风格', emoji: '🌈', color: '#8b5cf6' },
  { key: '种草', label: '对比反差', emoji: '😏', color: '#ec4899' },
  { key: '开箱', label: '故事引入', emoji: '📖', color: '#3b82f6' },
  { key: '避坑', label: '夸张崇拜', emoji: '👑', color: '#f59e0b' },
  { key: '清单', label: '圈层认同', emoji: '👯', color: '#10b981' },
  { key: '情绪', label: '情绪爆发', emoji: '💥', color: '#ef4444' },
  { key: '测评', label: '人群标签', emoji: '📋', color: '#f97316' },
]

// 品牌名 + 产品名 拼接显示（避免品牌重复，如「珀芙研冷膜」）
function displayTitle(p) {
  const brand = (p.brand || '').trim()
  const name = (p.name || '').trim()
  if (!brand) return name
  if (name && name.startsWith(brand)) return name
  return `${brand} ${name}`
}

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, addCopy, deleteCopy, updateCopy, addCopies, clearCopies, updateProduct, sensitiveWords } = useStore()
  const { show } = useToast()
  const product = products.find((p) => p.id === id)

  const [delCopyId, setDelCopyId] = useState(null)
  // 生成相似弹窗
  const [genModal, setGenModal] = useState({ open: false, copy: null })
  const [selectedStyles, setSelectedStyles] = useState(['全部'])
  const [genResults, setGenResults] = useState([])
  const [genLoading, setGenLoading] = useState(false)
  const [copyFilter, setCopyFilter] = useState('全部')

  const [showClear, setShowClear] = useState(false)

  // 话题管理（话题统一从所有文案自带话题聚合，编辑时同步到所有文案）
  const [showTopics, setShowTopics] = useState(false)
  const [topicDraft, setTopicDraft] = useState([])
  const [topicOriginals, setTopicOriginals] = useState([])  // 打开时的快照，用于计算 renames/added/removed
  const [newTopic, setNewTopic] = useState('')
  const [editTopicIdx, setEditTopicIdx] = useState(null)
  const [editTopicVal, setEditTopicVal] = useState('')

  const openTopics = () => {
    // 从产品级话题 + 所有文案自带话题聚合（去重 + 拆分 #a#b 双话题，避免重复观感）
    const allTopics = new Set()
    const splitT = (t) => (t || '').split('#').map((x) => x.trim()).filter(Boolean).map((x) => '#' + x)
    ;(product.topics || []).forEach((t) => splitT(t).forEach((x) => allTopics.add(x)))
    ;(product.copies || []).forEach((c) => (c.topics || []).forEach((t) => splitT(t).forEach((x) => allTopics.add(x))))
    const arr = [...allTopics]
    setTopicDraft(arr)
    setTopicOriginals(arr)
    setNewTopic('')
    setEditTopicIdx(null)
    setShowTopics(true)
  }
  const addTopic = () => {
    const raw = newTopic.trim()
    if (!raw) return
    // 支持粘贴整行多个话题（#a #b 或 #a#b 或 a b），按 # 前插空格再按空白切割
    const tokens = raw.replace(/#/g, ' #').split(/\s+/).map((s) => s.trim()).filter(Boolean)
    const normalized = tokens.map((t) => (t.startsWith('#') ? t : '#' + t))
    const next = [...topicDraft]
    let addedCount = 0
    for (const t of normalized) {
      if (!next.includes(t)) { next.push(t); addedCount++ }
    }
    if (addedCount === 0) { show('这些话题已存在', 'error'); return }
    setTopicDraft(next); setNewTopic('')
    show(`已添加 ${addedCount} 个话题`, 'success')
  }
  const removeTopic = (t) => setTopicDraft(topicDraft.filter((x) => x !== t))
  const startEditTopic = (i) => { setEditTopicIdx(i); setEditTopicVal(topicDraft[i]) }
  const saveEditTopic = () => {
    let t = editTopicVal.trim()
    if (!t) { setEditTopicIdx(null); return }
    if (!t.startsWith('#')) t = '#' + t
    const next = [...topicDraft]; next[editTopicIdx] = t; setTopicDraft(next); setEditTopicIdx(null)
  }
  const saveTopics = () => {
    // 计算 renames：按打开时的快照顺序，同位置改名
    const orig = topicOriginals
    const renames = []
    topicDraft.forEach((t, i) => {
      if (i < orig.length && orig[i] !== t) renames.push({ from: orig[i], to: t })
    })
    // 计算 added / removed：以"当前所有文案实际拥有的话题集合"为基准
    // 这样如果某些文案缺了池里的话题，保存时会自动补回（修复）
    const copiesOrig = new Set()
    ;(product.copies || []).forEach((c) => (c.topics || []).forEach((t) => copiesOrig.add(t)))
    const finalSet = new Set(topicDraft)
    const removed = [...copiesOrig].filter((t) => !finalSet.has(t))
    const added = topicDraft.filter((t) => !copiesOrig.has(t))

    // 把变更同步到所有文案（norm 同时拆分 #a#b 双话题）
    const norm = (arr) => [...new Set((arr || []).flatMap((t) => (t || '').split('#').map((x) => x.trim()).filter(Boolean).map((x) => '#' + x)))]
    const updatedCopies = (product.copies || []).map((c) => {
      let topics = norm(c.topics)
      topics = topics.filter((t) => !removed.includes(t))
      renames.forEach(({ from, to }) => {
        const idx = topics.indexOf(from)
        if (idx >= 0) topics[idx] = to
      })
      added.forEach((t) => { if (!topics.includes(t)) topics.push(t) })
      return { ...c, topics: norm(topics) }
    })

    // 写入 store：copies 同步 + product.topics 作为权威池（同样拆分）
    updateProduct(product.id, { copies: updatedCopies, topics: norm(topicDraft) })
    setShowTopics(false)
    const msg = `已同步到 ${updatedCopies.length} 条文案${added.length ? `（+${added.length}）` : ''}${removed.length ? `（-${removed.length}）` : ''}${renames.length ? `（${renames.length} 处改名）` : ''}`
    show(msg, 'success')
  }

  // 文案编辑
  const openEditCopy = (c) => navigate(`/copy-edit/${product.id}/${c.id}`)
  const saveEditCopy = () => {
    if (!editCopy) return
    if (!editCopy.content.trim()) { show('文案内容不能为空', 'error'); return }
    updateCopy(product.id, editCopy.id, { content: editCopy.content })
    setEditCopy(null); show('文案已更新', 'success')
  }


  if (!product) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p>产品不存在</p>
          <button onClick={() => navigate('/')} style={{ color: 'var(--primary)' }}>返回首页</button>
        </div>
      </div>
    )
  }

  // 文案筛选 + 爆单优先、同状态按创建时间倒序（标记出单后延时 1 秒再排序）
  const [sortPending, setSortPending] = useState(false)
  const displayedCopies = (() => {
    let list = product.copies
    if (copyFilter === '出单') list = list.filter((c) => c.hasOrder)
    else if (copyFilter === '未出单') list = list.filter((c) => !c.hasOrder)
    else if (copyFilter === '爆单') list = list.filter((c) => c.hasHot)
    else if (copyFilter === '未用过') list = list.filter((c) => !c.used)
    return [...list].sort((a, b) => {
      if (!sortPending) {
        if (a.hasHot !== b.hasHot) return b.hasHot ? 1 : -1  // 爆单优先
        if (a.hasOrder !== b.hasOrder) return b.hasOrder ? 1 : -1  // 其次出单
      }
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  })()

  // 打开生成相似弹窗（从某条文案触发）
  const openGenModal = (copy) => {
    setGenModal({ open: true, copy })
    setSelectedStyles(['全部'])
    setGenResults([])
  }

  // 执行生成（多风格，结果不入库）
  const handleGenerate = () => {
    if (!genModal.copy) return
    setGenLoading(true)
    // 模拟异步生成体验
    setTimeout(() => {
      const stylesToUse = selectedStyles.includes('全部')
        ? getStyles()
        : selectedStyles.filter((s) => s !== '全部')

      const results = stylesToUse.map((styleKey) => ({
        id: Date.now() + Math.random(),
        style: styleKey,
        content: generateSimilarCopy(genModal.copy.content, product.name, product.brand, styleKey, sensitiveWords),
        title: generateTitle(genModal.copy.content, product.name, product.brand, sensitiveWords),
        topics: generateTopics(genModal.copy.content, product.name, product.brand, sensitiveWords),
        collected: false,
      }))

      setGenResults(results)
      setGenLoading(false)
      show(`已生成 ${results.length} 条相似文案`, 'success')
    }, 600)
  }

  // 收藏单条结果到文案库
  const handleCollectResult = (result) => {
    addCopy(id, {
      content: result.content,
      title: result.title,
      topics: result.topics,
      style: result.style,
    })
    setGenResults(genResults.map((r) =>
      r.id === result.id ? { ...r, collected: true } : r
    ))
    show('已收藏到文案库', 'success')
  }

  const handleCopyContent = async (content, copyId) => {
    const ok = await copyText(content)
    show(ok ? '文案已复制' : '复制失败', ok ? 'success' : 'error')
    if (ok && copyId) updateCopy(id, copyId, { used: true, usedDate: todayStr() })
  }

  const handleGenerateSimilar = (copyId, style) => {
    const copy = product.copies.find((c) => c.id === copyId)
    if (!copy) return
    const newContent = generateSimilarCopy(copy.content, product.name, product.brand, style, sensitiveWords)
    const title = generateTitle(newContent, product.name, product.brand, sensitiveWords)
    const topics = generateTopics(newContent, product.name, product.brand, sensitiveWords)
    addCopy(id, { content: newContent, title, topics, style })
    show(`已生成「${style}」风格文案`, 'success')
  }

  // 复制话题：合并产品级话题和该文案的话题（不标记用过）
  const handleCopyTopics = async (topics, copyId) => {
    const merged = [...new Set([...(product.topics || []), ...(topics || [])])]
    const text = merged.join(' ')
    const ok = await copyText(text)
    show(ok ? '话题已复制' : '复制失败', ok ? 'success' : 'error')
  }

  const toggleOrder = (copyId, current, existingUsedDate, preview) => {
    updateCopy(id, copyId, {
      hasOrder: !current,
      used: true,
      usedDate: existingUsedDate || todayStr(),
    })
    // 标记出单后延时 1 秒再按爆单排序，让用户看清自己标记的是哪条
    if (!current) {
      setSortPending(true)
      setTimeout(() => setSortPending(false), 1000)
    }
    show(!current ? `已标记「出单」：${preview}` : `已取消出单：${preview}`, 'success')
  }

  // 标记/取消「爆单」（独立于出单）
  const toggleHot = (copyId, current) => {
    updateCopy(id, copyId, { hasHot: !current })
    // 标记爆单后延时 1 秒再按爆单排序，让用户看清自己标记的是哪条
    if (!current) {
      setSortPending(true)
      setTimeout(() => setSortPending(false), 1000)
    }
    show(!current ? '🔥 已标记「爆单」' : '已取消「爆单」', 'success')
  }

  // 标记/取消「用过」（不影响出单状态）
  const toggleUsed = (copyId, current) => {
    if (current) {
      updateCopy(id, copyId, { used: false, usedDate: null })
      show('已取消「用过」', 'success')
    } else {
      updateCopy(id, copyId, { used: true, usedDate: todayStr() })
      show('已标记「用过」', 'success')
    }
  }

  return (
    <div className="app-container">
      {/* 顶部 · 毛玻璃浅色 */}
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--text-main)',
            fontSize: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle(product)}</h1>
        </div>
      </header>

      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-sub)' }}>
            爆款文案 <span style={{ color: 'var(--gray-300)', fontWeight: 400 }}>({product.copies.length})</span>
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={openTopics}
              style={{
                background: '#fff',
                color: 'var(--text-sub)',
                border: '1px solid rgba(0,0,0,0.10)',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            ># 话题</button>
            <button
              onClick={() => navigate(`/batch-import/${product.id}`)}
              style={{
                background: '#fff',
                color: 'var(--primary)',
                border: '1px solid rgba(236, 72, 182, 0.35)',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >批量导入</button>
            <button
              onClick={() => setShowClear(true)}
              style={{
                background: '#fff',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >清空文案</button>
          </div>
        </div>

        {/* 文案筛选：全部 / 出单 / 未出单 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {[
            { key: '全部', label: '全部' },
            { key: '出单', label: '出单文案' },
            { key: '未出单', label: '未出单文案' },
            { key: '爆单', label: '🔥爆单文案' },
            { key: '未用过', label: '未用过文案' },
          ].map((f) => {
            const active = copyFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setCopyFilter(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: active ? 'none' : '1px solid rgba(0,0,0,0.10)',
                  background: active ? 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' : '#fff',
                  color: active ? '#fff' : 'var(--text-sub)',
                  cursor: 'pointer',
                }}
              >{f.label}</button>
            )
          })}
        </div>

        {product.copies.length === 0 ? (
          <div style={{
            ...glassStyle,
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-sub)',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
            <p style={{ fontSize: '14px', margin: 0 }}>还没有文案，<span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/batch-import/${product.id}`)}>点击批量导入</span>添加你的爆款文案</p>
          </div>
        ) : displayedCopies.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '30px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <p style={{ fontSize: '14px', margin: 0 }}>当前筛选下没有文案</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayedCopies.map((copy) => (
              <CopyCard
                key={copy.id}
                copy={copy}
                productName={product.name}
                brand={product.brand}
                productTopics={product.topics}
                onCopyContent={() => handleCopyContent(copy.content, copy.id)}
                onCopyTopics={() => handleCopyTopics(copy.topics, copy.id)}
                onEdit={() => openEditCopy(copy)}
                onToggleOrder={() => toggleOrder(copy.id, copy.hasOrder, copy.usedDate, (copy.content || '').replace(/\n/g, ' ').slice(0, 12))}
                onToggleHot={() => toggleHot(copy.id, copy.hasHot)}
                onToggleUsed={() => toggleUsed(copy.id, copy.used)}
                onDelete={() => setDelCopyId(copy.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 话题管理弹窗 */}
      <Modal
        open={showTopics}
        onClose={() => setShowTopics(false)}
        title="话题管理"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnGhost} onClick={() => setShowTopics(false)}>取消</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={saveTopics}>保存</button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="输入话题，回车添加（可不带 #）"
            value={newTopic}
            onChange={(ev) => setNewTopic(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addTopic() } }}
          />
          <button style={{ ...btnPrimary, padding: '0 16px' }} onClick={addTopic}>添加</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', minHeight: '40px' }}>
          {topicDraft.length === 0 ? (
            <span style={{ fontSize: '13px', color: 'var(--gray-400)' }}>暂无话题</span>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                <button onClick={async () => {
                  const text = topicDraft.map(t => `#${t}#`).join(' ')
                  const ok = await copyText(text)
                  show(ok ? `已复制 ${topicDraft.length} 个话题` : '复制失败', ok ? 'success' : 'error')
                }} style={{
                  padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)',
                  background: 'rgba(99,102,241,0.08)', color: '#4f46e5',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                }}>📋 复制全部到剪贴板</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', minHeight: '40px' }}>
                {topicDraft.map((t, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', color: 'var(--primary-dark)', background: 'rgba(252, 231, 243, 0.7)',
                    padding: '4px 8px 4px 10px', borderRadius: '8px', fontWeight: 500,
                  }}>
                    {editTopicIdx === i ? (
                      <>
                        <input
                          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: 'var(--primary-dark)', width: '90px', fontWeight: 600, padding: 0 }}
                          value={editTopicVal}
                          onChange={(ev) => setEditTopicVal(ev.target.value)}
                          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); saveEditTopic() } }}
                          autoFocus
                        />
                        <button onClick={saveEditTopic} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}>✓</button>
                      </>
                    ) : (
                      <>
                        {t}
                        <button onClick={async () => {
                          const ok = await copyText(`#${t}#`)
                          show(ok ? `已复制 #${t}#` : '复制失败', ok ? 'success' : 'error')
                        }} title="复制话题" style={{ border: 'none', background: 'transparent', color: '#6b7280', fontSize: '11px', cursor: 'pointer', padding: 0 }}>📋</button>
                        <button onClick={() => startEditTopic(i)} style={{ border: 'none', background: 'transparent', color: 'var(--text-sub)', fontSize: '11px', cursor: 'pointer', padding: 0 }}>✎</button>
                        <button onClick={() => removeTopic(t)} style={{ border: 'none', background: 'transparent', color: '#e11d48', fontSize: '13px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                      </>
                    )}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--gray-400)', margin: '10px 0 0' }}>
          💡 列表来自所有文案的自带话题；保存时新增=全部加上，删除=全部移除，改名=在原条目上替换
        </p>
      </Modal>

      <ConfirmModal
        open={!!delCopyId}
        onClose={() => setDelCopyId(null)}
        onConfirm={() => { deleteCopy(id, delCopyId); show('文案已删除', 'success') }}
        title="删除文案"
        message="确定删除这条文案吗？"
        confirmText="删除"
        danger
      />

      <ConfirmModal
        open={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={() => { clearCopies(id); setShowClear(false); show('已清空，可重新导入', 'success') }}
        title="清空文案"
        message="将删除该产品下的全部文案，导入前用于全量替换。确定继续吗？"
        confirmText="清空"
        danger
      />

      {/* 生成相似弹窗（参考图二） */}
      {genModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#f5f0f3',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* 顶部导航栏 */}
          <div style={{
            padding: 'calc(12px + var(--safe-top)) 16px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#fff',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setGenModal({ open: false, copy: null })}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: 'none', background: 'rgba(0,0,0,0.05)',
                fontSize: '18px', color: 'var(--text-main)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, flex: 1, color: 'var(--text-main)' }}>
              生成相似
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-sub)', background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '8px' }}>
              抖音文案生成器
            </span>
          </div>

          {/* 可滚动内容区 */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {/* 风格选择区 */}
            <div style={{
              ...glassStyle,
              padding: '16px',
              marginBottom: '14px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-main)' }}>
                文案风格 <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-sub)' }}>可多选</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {STYLE_OPTIONS.map((opt) => {
                  const selected = selectedStyles.includes(opt.key)
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (opt.key === '全部') {
                          setSelectedStyles(selectedStyles.includes('全部') ? [] : ['全部'])
                        } else {
                          const next = selectedStyles.filter((s) => s !== '全部')
                          if (selected) {
                            setSelectedStyles(next.filter((s) => s !== opt.key))
                          } else {
                            setSelectedStyles([...next, opt.key])
                          }
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '9px 14px',
                        borderRadius: '999px',
                        border: `1.5px solid ${selected ? opt.color : 'rgba(0,0,0,0.08)'}`,
                        background: selected ? `${opt.color}12` : '#fff',
                        color: selected ? opt.color : 'var(--text-sub)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{opt.emoji}</span> {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 一键生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={genLoading || !genModal.copy}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: genLoading
                  ? 'linear-gradient(135deg, #c4b5fd, #a78bfa)'
                  : 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6d28d9 100%)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(124, 58, 237, 0.35)',
                cursor: genLoading ? 'not-allowed' : 'pointer',
                opacity: genLoading ? 0.85 : 1,
                marginBottom: '16px',
              }}
            >
              {genLoading ? '⏳ 生成中...' : '✨ 一键生成文案'}
            </button>

            {/* 生成结果区 */}
            {genResults.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                  ✨ 生成结果
                  </h3>
                  <span style={{
                    fontSize: '12px', color: 'var(--primary)',
                    background: 'rgba(236, 72, 182, 0.08)',
                    padding: '3px 10px', borderRadius: '8px',
                  }}>{genResults.length} 条</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {genResults.map((result) => (
                    <div key={result.id} style={{
                      ...glassStyle,
                      padding: '14px',
                      borderLeft: `4px solid ${STYLE_OPTIONS.find(s => s.key === result.style)?.color || '#a78bfa'}`,
                    }}>
                      {/* 风格标签 */}
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: STYLE_OPTIONS.find(s => s.key === result.style)?.color || '#a78bfa',
                          background: `${(STYLE_OPTIONS.find(s => s.key === result.style)?.color || '#a78bfa')}12`,
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontWeight: 600,
                        }}>
                          {STYLE_OPTIONS.find(s => s.key === result.style)?.emoji || '📝'} {result.style}
                        </span>
                      </div>

                      {/* 标题 */}
                      <div style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-main)', marginBottom: '6px' }}>
                        {result.title}
                      </div>

                      {/* 热门话题 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                        {result.topics.map((t, i) => (
                          <span key={i} style={{
                            fontSize: '11px',
                            color: 'var(--primary-dark)',
                            background: 'rgba(252, 231, 243, 0.7)',
                            padding: '2px 8px',
                            borderRadius: '7px',
                            fontWeight: 500,
                          }}>{t}</span>
                        ))}
                      </div>

                      {/* 文案内容 */}
                      <div style={{
                        fontSize: '14px',
                        lineHeight: 1.75,
                        color: 'var(--text-main)',
                        whiteSpace: 'pre-wrap',
                        marginBottom: '12px',
                      }}>
                        {result.content}
                      </div>

                      {/* 操作按钮 */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleCopyContent(buildTitleWithTopics(result.title, result.topics) + '\n\n' + result.content)}
                          style={{
                            flex: 1,
                            padding: '9px',
                            borderRadius: '10px',
                            border: '1.5px solid rgba(167, 139, 250, 0.3)',
                            background: '#fff',
                            color: '#7c3aed',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >📋 复制文案</button>
                        <button
                          onClick={() => handleCollectResult(result)}
                          disabled={result.collected}
                          style={{
                            flex: 1,
                            padding: '9px',
                            borderRadius: '10px',
                            border: 'none',
                            background: result.collected
                              ? 'linear-gradient(135deg, #34d399, #10b981)'
                              : 'rgba(255,255,255,0.7)',
                            color: result.collected ? '#fff' : 'var(--text-main)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: result.collected ? 'default' : 'pointer',
                            opacity: result.collected ? 0.9 : 1,
                          }}
                        >{result.collected ? '✅ 已收藏' : '📥 收藏'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CopyCard({
  copy, productName, brand, productTopics,
  onCopyContent, onCopyTopics,
  onEdit, onToggleOrder, onToggleHot, onToggleUsed, onDelete,
}) {
  const cardAccent = copy.hasOrder
    ? { borderLeft: '4px solid #f59e0b', borderTop: '3px solid #fbbf24' }
    : copy.hasHot
      ? { borderLeft: '4px solid #ef4444', borderTop: '3px solid #f87171' }
      : copy.used
        ? { borderLeft: '4px solid #06b6d4' }
        : {}

  return (
    <div style={{
      ...glassStyle,
      padding: '14px 14px 12px',
      position: 'relative',
      ...cardAccent,
    }}>
      {/* 文案内容 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '12px',
        padding: '12px 14px',
        fontSize: '14px',
        lineHeight: 1.7,
        color: 'var(--text-main)',
        whiteSpace: 'pre-wrap',
        marginBottom: '8px',
        border: '1px solid rgba(255, 255, 255, 0.5)',
      }}>
        {copy.content}
      </div>

      {/* 话题：只显示文案自带话题（去重后） */}
      <div style={{ marginBottom: '8px' }}>
        {copy.topics && copy.topics.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '4px', fontWeight: 500 }}># 文案自带话题</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[...new Set((copy.topics || []).filter(Boolean))].map((t, i) => (
                <span key={i} style={{
                  fontSize: '12px',
                  color: '#7c3aed',
                  background: 'rgba(237, 233, 254, 0.8)',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontWeight: 500,
                  border: '1px solid rgba(124, 58, 237, 0.15)',
                }}># {t.replace(/^#/, '')}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 状态标签 */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {copy.used && (() => {
          const d = copy.usedDate ? daysDiff(copy.usedDate) : null
          const desc = d === null ? '' : d < 0 ? `${-d}天前用过` : d === 0 ? '今天用过' : `${d}天前用过`
          return (
            <span style={{
              fontSize: '11px', color: '#0891b2', background: 'rgba(207, 250, 254, 0.8)',
              padding: '3px 9px', borderRadius: '8px', fontWeight: 500,
            }}>✓ 用过{desc ? ` · ${desc}` : ''}</span>
          )
        })()}
        {copy.hasOrder && (() => {
          return (
            <span style={{
              fontSize: '13px', color: '#047857', background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
              padding: '4px 12px', borderRadius: '8px', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}>💰 出单</span>
          )
        })()}
        {copy.hasHot && (() => {
          return (
            <span style={{
              fontSize: '13px', color: '#fff', background: 'linear-gradient(135deg,#f43f5e,#dc2626)',
              padding: '4px 12px', borderRadius: '8px', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(244,63,94,0.4)',
            }}>🔥 爆单</span>
          )
        })()}
        {copy.style && (
          <span style={{
            fontSize: '11px', color: '#c2410c', background: 'rgba(255, 237, 213, 0.8)',
            padding: '3px 9px', borderRadius: '8px', fontWeight: 500,
          }}>风格：{copy.style}</span>
        )}
      </div>

      {/* 复制按钮区 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
        <button
          onClick={onCopyContent}
          style={{
            flex: 1,
            padding: '10px',
            background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(244, 114, 182, 0.25)',
          }}
        >📋 复制文案</button>
        <button
          onClick={onCopyTopics}
          style={{
            flex: 1,
            padding: '10px',
            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
          }}
        >📋 复制话题</button>
      </div>

      {/* 操作按钮区 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <ActionBtn active={copy.used} onClick={onToggleUsed} activeColor="info">
          {copy.used ? '✓ 用过' : '标记用过'}
        </ActionBtn>
        <ActionBtn active={copy.hasOrder} onClick={onToggleOrder} activeColor="success">
          {copy.hasOrder ? '💰 取消出单' : '💰 出单'}
        </ActionBtn>
        <ActionBtn active={copy.hasHot} onClick={onToggleHot} activeColor="hot">
          {copy.hasHot ? '🔥 取消爆单' : '🔥 爆单'}
        </ActionBtn>
        <ActionBtn onClick={onEdit} tone="neutral">
          ✎ 编辑
        </ActionBtn>
        <ActionBtn onClick={onDelete} tone="danger">
          删除
        </ActionBtn>
      </div>

    </div>
  )
}

function ActionBtn({ children, onClick, active, activeColor = 'primary', tone }) {
  const colorMap = {
    primary: { bg: 'linear-gradient(135deg, #f472b6, #ec4899)', text: '#fff' },
    success: { bg: 'linear-gradient(135deg, #34d399, #10b981)', text: '#fff' },
    info: { bg: 'linear-gradient(135deg, #22d3ee, #06b6d4)', text: '#fff' },
    danger: { bg: 'linear-gradient(135deg, #fb7185, #f43f5e)', text: '#fff' },
    hot: { bg: 'linear-gradient(135deg, #f43f5e, #dc2626)', text: '#fff' },
  }
  // tone：非激活时的静态样式（用于「编辑 / 删除」这类次要操作）
  const toneMap = {
    neutral: { bg: 'rgba(255, 255, 255, 0.45)', text: 'var(--text-sub)', border: '1px solid rgba(0, 0, 0, 0.08)' },
    danger: { bg: 'rgba(254, 226, 226, 0.6)', text: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.28)' },
  }
  const activeStyle = active ? colorMap[activeColor] : null
  const t = tone ? toneMap[tone] : null
  const base = activeStyle || t || { bg: 'rgba(255, 255, 255, 0.5)', text: 'var(--text-sub)', border: '1px solid rgba(255, 255, 255, 0.6)' }
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 12px',
        background: base.bg,
        color: base.text,
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: 600,
        border: base.border,
        cursor: 'pointer',
      }}
    >{children}</button>
  )
}
