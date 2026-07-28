import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Field, inputStyle, btnPrimary, btnGhost, glassStyle } from '../components/Modal'

const CATEGORIES = ['保健品', '护肤', '美妆', '饮品', '食品', '洗护', '日用', '其他']

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

export function NewProductPage() {
  const navigate = useNavigate()
  const { addProduct } = useStore()
  const { show } = useToast()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')

  const handleSave = () => {
    if (!name.trim()) { show('请输入产品名称', 'error'); return }
    addProduct({ name: name.trim(), brand: brand.trim(), category })
    show('产品已添加', 'success')
    navigate('/')
  }

  return (
    <div className="app-container">
      <PageHeader title="添加产品" onBack={() => navigate('/')} />
      <div style={{ padding: '16px' }}>
        <div style={{ ...glassStyle, padding: '16px' }}>
        <Field label="产品名称" required>
          <input style={inputStyle} placeholder="例如：补水喷雾" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="品牌名（选填）">
          <input style={inputStyle} placeholder="例如：珀芙研 / 洁比兔" value={brand} onChange={e => setBrand(e.target.value)} />
        </Field>
        <Field label="分类（选填）">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '10px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: '2px solid',
                borderColor: category === c ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                background: category === c ? 'rgba(244,114,182,0.08)' : '#fff',
                color: category === c ? 'var(--primary)' : 'var(--text-sub)',
                boxShadow: category === c ? '0 4px 12px rgba(244,114,182,0.2)' : 'none',
                transition: 'all 0.15s',
              }}>{c}</button>
            ))}
          </div>
        </Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={() => navigate('/')}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}

export function EditProductPage() {
  const navigate = useNavigate()
  const { products, updateProduct, deleteProduct } = useStore()
  const { show } = useToast()
  // 从 URL 拿 id: /product/:id/edit
  const id = window.location.hash.match(/\/product\/([^/]+)\/edit/)?.[1]
  const product = id ? products.find(p => p.id === id) : null
  const [name, setName] = useState(product?.name || '')
  const [brand, setBrand] = useState(product?.brand || '')
  const [category, setCategory] = useState(product?.category || '')

  if (!product) {
    return (
      <div className="app-container">
        <PageHeader title="编辑产品" onBack={() => navigate('/')} />
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-sub)' }}>产品不存在</div>
      </div>
    )
  }

  const handleSave = () => {
    if (!name.trim()) { show('请输入产品名称', 'error'); return }
    updateProduct(id, { name: name.trim(), brand: brand.trim(), category })
    show('产品信息已更新', 'success')
    navigate(-1)
  }

  const handleDelete = () => {
    if (confirm('确定删除该产品及其所有文案吗？')) {
      deleteProduct(id)
      show('已删除', 'success')
      navigate('/')
    }
  }

  return (
    <div className="app-container">
      <PageHeader title="编辑产品" onBack={() => navigate(-1)} />
      <div style={{ padding: '16px' }}>
        <div style={{ ...glassStyle, padding: '16px' }}>
        <Field label="产品名称" required>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="品牌名（选填）">
          <input style={inputStyle} value={brand} onChange={e => setBrand(e.target.value)} />
        </Field>
        <Field label="分类（选填）">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '10px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: '2px solid',
                borderColor: category === c ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                background: category === c ? 'rgba(244,114,182,0.08)' : '#fff',
                color: category === c ? 'var(--primary)' : 'var(--text-sub)',
                boxShadow: category === c ? '0 4px 12px rgba(244,114,182,0.2)' : 'none',
                transition: 'all 0.15s',
              }}>{c}</button>
            ))}
          </div>
        </Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={{ ...btnGhost, color: '#fb7185' }} onClick={handleDelete}>删除</button>
          <button style={{ ...btnGhost, border: "1.5px solid rgba(0,0,0,0.1)", background: "#f9fafb" }} onClick={() => navigate(-1)}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
