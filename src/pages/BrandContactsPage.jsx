import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, glassStyle, ConfirmModal } from '../components/Modal'
import { copyText } from '../utils/helpers'

const STORAGE_KEY = 'brand_contacts_v1'

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function BrandContactsPage() {
  const { show } = useToast()
  const [list, setList] = useState(loadData)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [delId, setDelId] = useState(null)
  const [filter, setFilter] = useState('全部')  // 全部 / 已添加 / 未添加

  useEffect(() => { saveAll(list) }, [list])

  const copyAll = async (item) => {
    const text = `${item.name} ${item.wechat}`.trim()
    const ok = await copyText(text)
    show(ok ? `已复制：${text}` : '复制失败', ok ? 'success' : 'error')
  }
  const copyWechat = async (item) => {
    const ok = await copyText(item.wechat)
    show(ok ? `已复制微信号：${item.wechat}` : '复制失败', ok ? 'success' : 'error')
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>🤝 品牌方联系</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>{list.length} 个品牌方 · 点击复制「品牌方名称 微信」</p>
        </div>
      </div>

      {/* 状态筛选 */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 16px 12px' }}>
        {['全部', '已添加', '未添加'].map(f => {
          const cnt = f === '全部' ? list.length : list.filter(i => (f === '已添加') === !!i.added).length
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              background: filter === f ? (f === '已添加' ? 'linear-gradient(135deg,#34d399,#10b981)' : f === '未添加' ? 'linear-gradient(135deg,#9ca3af,#6b7280)' : 'linear-gradient(135deg,#8b5cf6,#ec4899)') : 'rgba(255,255,255,0.5)',
              color: filter === f ? '#fff' : 'var(--text-sub)',
              border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.6)',
            }}>{f} {cnt}</button>
          )
        })}
      </div>

      {/* 列表 */}
      <div style={{ padding: '4px 16px calc(90px + var(--safe-bottom))' }}>
        {list.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '50px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🤝</div>
            <p style={{ fontSize: '14px', margin: 0 }}>还没有品牌方联系方式</p>
            <p style={{ fontSize: '12px', margin: '6px 0 0' }}>点击右下角 + 添加</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {list.filter(item => filter === '全部' || (filter === '已添加') === !!item.added).map(item => (
              <BrandContactCard
                key={item.id}
                item={item}
                onCopyAll={() => copyAll(item)}
                onCopyWechat={() => copyWechat(item)}
                onEdit={() => setEditItem(item)}
                onDelete={() => setDelId(item.id)}
                onToggleAdded={() => { setList(list.map(i => i.id === item.id ? { ...i, added: !i.added } : i)); show(item.added ? '已改为「未添加」' : '已改为「已添加」', 'success') }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 添加按钮 */}
      <button onClick={() => setShowAdd(true)} style={{
        position: 'fixed', right: '20px', bottom: 'calc(100px + var(--safe-bottom))',
        width: '56px', height: '56px', borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff',
        fontSize: '28px', boxShadow: '0 8px 20px rgba(139,92,246,0.35)', cursor: 'pointer', zIndex: 20,
      }}>+</button>

      {/* 添加/编辑弹窗 */}
      <Modal
        open={showAdd || !!editItem}
        onClose={() => { setShowAdd(false); setEditItem(null) }}
        title={editItem ? '编辑品牌方' : '添加品牌方'}
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnGhost} onClick={() => { setShowAdd(false); setEditItem(null) }}>取消</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => {
              const nameEl = document.getElementById('bc-name')
              const wxEl = document.getElementById('bc-wechat')
              const statusEl = document.getElementById('bc-status')
              const name = (nameEl?.value || '').trim()
              const wechat = (wxEl?.value || '').trim()
              const added = statusEl?.value === 'added'
              if (!name) { show('请输入品牌方名称', 'error'); return }
              if (editItem) {
                setList(list.map(i => i.id === editItem.id ? { ...i, name, wechat, added } : i))
                show('已更新', 'success')
              } else {
                setList([{ id: uid(), name, wechat, added }, ...list])
                show('已添加', 'success')
              }
              setShowAdd(false); setEditItem(null)
            }}>{editItem ? '保存' : '添加'}</button>
          </div>
        }
      >
        <Field label="品牌方名称" required>
          <input id="bc-name" style={inputStyle} placeholder="例如：珀芙研 / 洁比兔" defaultValue={editItem?.name || ''} autoFocus />
        </Field>
        <Field label="微信">
          <input id="bc-wechat" style={inputStyle} placeholder="微信号" defaultValue={editItem?.wechat || ''} />
        </Field>
        <Field label="是否已添加">
          <select id="bc-status" style={inputStyle} defaultValue={editItem ? (editItem.added ? 'added' : 'not') : 'not'}>
            <option value="added">✓ 已添加</option>
            <option value="not">○ 未添加</option>
          </select>
        </Field>
      </Modal>

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { setList(list.filter(i => i.id !== delId)); show('已删除', 'success') }}
        title="删除"
        message="确定删除这个品牌方吗？"
        confirmText="删除"
        danger
      />
    </div>
  )
}

function BrandContactCard({ item, onCopyAll, onCopyWechat, onEdit, onDelete, onToggleAdded }) {
  const [swiped, setSwiped] = useState(false)
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px' }}>
      {/* 左滑操作按钮 */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '6px' }}>
        <button onClick={() => { setSwiped(false); onEdit() }} style={{
          width: '60px', height: '72%', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          background: '#6366f1', color: '#fff',
        }}>✎<br/>编辑</button>
        <button onClick={() => { setSwiped(false); onDelete() }} style={{
          width: '60px', height: '72%', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          background: '#ef4444', color: '#fff',
        }}>×<br/>删除</button>
      </div>

      {/* 卡片主体 */}
      <div
        onTouchStart={(e) => { const t = e.touches[0]; e.currentTarget.dataset.swipeStart = `${t.clientX},${t.clientY}`; e.currentTarget.dataset.swiping = 'false' }}
        onTouchMove={(e) => { const t = e.touches[0]; const s = (e.currentTarget.dataset.swipeStart || '').split(',').map(Number); if (!s[0]) return; const dx = t.clientX - s[0]; const dy = t.clientY - s[1]; if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) e.currentTarget.dataset.swiping = 'true' }}
        onTouchEnd={(e) => { if (e.currentTarget.dataset.swiping === 'true') { setSwiped(prev => !prev); e.currentTarget.dataset.swiping = 'false' } else if (!e.currentTarget.dataset.swiping) {} }}
        style={{
          ...glassStyle, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          transition: 'transform 0.2s ease',
          transform: swiped ? 'translateX(-140px)' : 'translateX(0)',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* 头像 */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '15px', fontWeight: 700,
        }}>{(item.name || '?').charAt(0)}</div>

        {/* 名称 + 微信 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {item.name}
            <button onClick={(e) => { e.stopPropagation(); onToggleAdded() }} style={{
              padding: '2px 8px', borderRadius: '999px', border: 'none', fontSize: '10px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              background: item.added ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.12)',
              color: item.added ? '#059669' : '#6b7280',
            }}>{item.added ? '✓ 已添加' : '○ 未添加'}</button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            💬 {item.wechat || '未填写'}
          </div>
        </div>

        {/* 复制按钮（唯一的可见操作） */}
        <button onClick={(e) => { e.stopPropagation(); onCopyAll() }} style={{
          padding: '6px 12px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
          boxShadow: '0 2px 8px rgba(236,72,153,0.25)',
        }}>📋 复制</button>
      </div>
    </div>
  )
}