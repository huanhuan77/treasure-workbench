import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'

const PUBLISH_KEY = 'daily_publish_plan_v1'
const PUB_CATEGORIES = ['全部', '保健品', '护肤', '美妆', '饮品', '食品', '洗护', '日用', '其他']

function getTomorrow() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
}
function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function getDateLabel(dateStr) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function NewPublishPlanPage() {
  const navigate = useNavigate()
  const { products } = useStore()
  const { show } = useToast()
  const [pubAccount, setPubAccount] = useState('')
  const [pubCategory, setPubCategory] = useState('全部')
  const [pubProductId, setPubProductId] = useState('')

  const publishDate = fmtDate(getTomorrow())
  const accountOptions = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']  // 固定三个账号
  const catProducts = products.filter((p) => pubCategory === '全部' || p.category === pubCategory)

  const handleAdd = () => {
    if (!pubAccount) { show('请选择账号', 'error'); return }
    if (!pubProductId) { show('请选择产品', 'error'); return }
    const p = products.find((x) => x.id === pubProductId)
    if (!p) return
    let data = {}
    try { data = JSON.parse(localStorage.getItem(PUBLISH_KEY) || '{}') } catch { data = {} }
    const item = { id: uid(), account: pubAccount, productId: p.id, productName: p.name, category: p.category, createdAt: Date.now() }
    const arr = data[publishDate] || []
    arr.push(item)
    data[publishDate] = arr
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(data))
    // 通知 DailyPlanPage 刷新
    window.dispatchEvent(new Event('publishPlanUpdated'))
    show(`已记录：${p.name} → ${pubAccount}`, 'success')
    navigate(-1)
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          添加发布计划（{getDateLabel(publishDate)}）
        </h1>
      </header>

      <div style={{ padding: '16px 20px', flex: 1 }}>
        {/* 发布账号 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>发布账号</div>
          <select value={pubAccount} onChange={(e) => setPubAccount(e.target.value)} style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            border: pubAccount ? '1.5px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.08)',
            fontSize: '15px', outline: 'none', background: '#fff', color: 'var(--text-main)',
            boxSizing: 'border-box',
          }}>
            <option value="" disabled>请选择账号</option>
            {accountOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {accountOptions.length === 0 && (
            <div style={{ fontSize: '12px', color: '#92400e', marginTop: '6px', padding: '8px 12px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px' }}>
              暂无账号，请先在「样品」里给样品填写账号名称
            </div>
          )}
        </div>

        {/* 产品分类（可选） */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>产品分类（可选）</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PUB_CATEGORIES.map((c) => (
              <button key={c} onClick={() => { setPubCategory(c); setPubProductId('') }} style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, border: '1.5px solid',
                borderColor: pubCategory === c ? 'var(--primary)' : 'rgba(0,0,0,0.08)',
                background: pubCategory === c ? 'rgba(244,114,182,0.1)' : '#fff',
                color: pubCategory === c ? 'var(--primary)' : 'var(--text-sub)',
                cursor: 'pointer',
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* 选择产品 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>
            选择产品 {pubCategory !== '全部' ? `（${pubCategory} · ${catProducts.length} 个）` : `（共 ${products.length} 个）`}
          </div>
          <select value={pubProductId} onChange={(e) => setPubProductId(e.target.value)} multiple style={{
            width: '100%', padding: '12px 14px', borderRadius: '12px',
            border: '1.5px solid rgba(0,0,0,0.08)',
            fontSize: '15px', outline: 'none', background: '#fff', color: 'var(--text-main)',
            boxSizing: 'border-box', height: '220px',
          }}>
            {catProducts.length === 0 && <option value="" disabled>该分类暂无产品</option>}
            {catProducts.map((p) => <option key={p.id} value={p.id}>{p.name}{p.brand ? `（${p.brand}）` : ''}</option>)}
          </select>
        </div>
      </div>

      {/* 底部按钮 */}
      <div style={{ padding: '12px 20px 24px', display: 'flex', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{
          flex: 1, padding: '14px 0', borderRadius: '12px',
          border: '1.5px solid rgba(0,0,0,0.1)', background: '#f9fafb',
          color: 'var(--text-sub)', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
        }}>取消</button>
        <button onClick={handleAdd} style={{
          flex: 2, padding: '14px 0', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
        }}>添加</button>
      </div>
    </div>
  )
}
