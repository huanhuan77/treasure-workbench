import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { glassStyle, inputStyle } from '../components/Modal'

const STORAGE_KEY = 'blogger_inspiration_v1'

export function InspirationPage() {
  const { show } = useToast()
  const [keyword, setKeyword] = useState('')
  const [copies, setCopies] = useState([])
  const [newCopy, setNewCopy] = useState('')
  const [product, setProduct] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCopies(JSON.parse(raw))
    } catch (e) {}
  }, [])

  const save = (data) => {
    setCopies(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const openDouyinSearch = () => {
    if (!keyword.trim()) { show('输入搜索词', 'error'); return }
    window.open(`https://www.douyin.com/search/${encodeURIComponent(keyword.trim())}`, '_blank')
  }

  const addCopy = () => {
    if (!newCopy.trim()) { show('粘贴文案内容', 'error'); return }
    const item = {
      id: Date.now(),
      content: newCopy.trim(),
      product: product.trim() || '未分类',
      createdAt: new Date().toISOString(),
    }
    save([item, ...copies])
    setNewCopy('')
    show('已保存', 'success')
  }

  const delCopy = (id) => {
    save(copies.filter(c => c.id !== id))
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => show('已复制', 'success'))
  }

  return (
    <div className="app-container" style={{ padding: '16px 16px 100px' }}>
      <h2 style={{ margin: '8px 0 16px', fontSize: 22 }}>灵感搜索</h2>

      {/* 搜索区 */}
      <div style={{ ...glassStyle, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>搜抖音爆款</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="输入产品词，如：湿轻饮"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && openDouyinSearch()}
          />
          <button
            onClick={openDouyinSearch}
            style={{
              padding: '10px 16px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff',
              fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            去搜索
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#8b6f7a', marginTop: 8 }}>
          会在新标签页打开抖音搜索，登录后按"最多点赞"筛选
        </div>
      </div>

      {/* 快速收藏 */}
      <div style={{ ...glassStyle, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>看到好文案，存进来</div>
        <input
          style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="关联产品（选填），如：维特健灵湿轻饮"
          value={product}
          onChange={e => setProduct(e.target.value)}
        />
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical', marginBottom: 8 }}
          placeholder="粘贴竞品文案..."
          value={newCopy}
          onChange={e => setNewCopy(e.target.value)}
        />
        <button
          onClick={addCopy}
          style={{
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: '#34d399', color: '#fff', fontWeight: 600, cursor: 'pointer',
          }}
        >
          保存文案
        </button>
      </div>

      {/* 已收藏列表 */}
      <div style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>
        已收藏 {copies.length} 条
      </div>
      {copies.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#a97b8c', padding: 40, fontSize: 14 }}>
          还没收藏文案，去抖音搜搜看
        </div>
      ) : (
        copies.map(c => (
          <div key={c.id} style={{ ...glassStyle, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#f472b6', marginBottom: 6, fontWeight: 600 }}>
              {c.product}
            </div>
            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 8 }}>
              {c.content}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => copyText(c.content)}
                style={{
                  padding: '4px 12px', borderRadius: 8, border: '1px solid #fbcfe8',
                  background: '#fff', color: '#ec4899', fontSize: 12, cursor: 'pointer',
                }}
              >
                复制
              </button>
              <button
                onClick={() => delCopy(c.id)}
                style={{
                  padding: '4px 12px', borderRadius: 8, border: '1px solid #fecdd3',
                  background: '#fff', color: '#fb7185', fontSize: 12, cursor: 'pointer',
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
