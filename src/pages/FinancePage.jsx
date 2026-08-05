import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, ConfirmModal, glassStyle } from '../components/Modal'
import { formatDate } from '../utils/helpers'

const CATEGORIES = {
  // 收入类
  sample: { label: '样品收入', type: 'income', color: '#0d9488', bg: 'rgba(204, 251, 241, 0.8)' },
  haitao: { label: '海淘', type: 'income', color: '#0284c7', bg: 'rgba(224, 242, 254, 0.8)' },
  xingchuan: { label: '星川', type: 'income', color: '#c2410c', bg: 'rgba(255, 237, 213, 0.8)' },
  withdraw: { label: '钱包提现', type: 'income', color: '#7c3aed', bg: 'rgba(237, 233, 254, 0.8)' },
  // 支出类
  prop: { label: '拍摄道具', type: 'expense', color: '#e11d48', bg: 'rgba(254, 226, 226, 0.8)' },
  other_expense: { label: '其他支出', type: 'expense', color: '#c2410c', bg: 'rgba(255, 237, 213, 0.8)' },
  ad: { label: '投流推广', type: 'expense', color: '#be123c', bg: 'rgba(255, 228, 230, 0.8)' },
}

export function FinancePage() {
  const navigate = useNavigate()
  const { transactions, addTransaction, deleteTransaction } = useStore()
  const { show } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [delId, setDelId] = useState(null)
  const [swipedTxId, setSwipedTxId] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear())
  const [sortBy, setSortBy] = useState('date_desc')
  const [showMoreCat, setShowMoreCat] = useState(false)

  // 点击表头箭头切换排序（再次点击同一字段则反序）
  const toggleSort = (field) => {
    setSortBy((prev) => {
      if (!prev.startsWith(field)) return field + '_desc'
      return prev === field + '_desc' ? field + '_asc' : field + '_desc'
    })
  }

  // 提取所有账号
  const accounts = useMemo(() => {
    const set = new Set()
    transactions.forEach((t) => { if (t.account) set.add(t.account) })
    return [...set]
  }, [transactions])

  // 筛选+排序
  // 提取所有有数据的月份 + 当前年所有 12 个月（方便补录/查看）
  const months = useMemo(() => {
    const set = new Set()
    transactions.forEach((t) => { const m = (t.date || '').slice(0, 7); if (m) set.add(m) })
    const curY = new Date().getFullYear()
    for (let mm = 1; mm <= 12; mm++) set.add(`${curY}-${String(mm).padStart(2,'0')}`)
    return [...set].sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    let result = [...transactions]
    if (filterType !== 'all') result = result.filter((t) => t.type === filterType)
    if (filterCategory !== 'all') result = result.filter((t) => t.category === filterCategory)
    if (filterAccount !== 'all') result = result.filter((t) => t.account === filterAccount)
    if (filterMonth !== 'all') result = result.filter((t) => (t.date || '').slice(0, 7) === filterMonth)

    switch (sortBy) {
      case 'date_desc': result.sort((a, b) => b.date.localeCompare(a.date)); break
      case 'date_asc': result.sort((a, b) => a.date.localeCompare(b.date)); break
      case 'amount_desc': result.sort((a, b) => b.amount - a.amount); break
      case 'amount_asc': result.sort((a, b) => a.amount - b.amount); break
    }
    return result
  }, [transactions, filterType, filterCategory, filterAccount, filterMonth, sortBy])

  // 合计
  const totals = useMemo(() => {
    let income = 0, expense = 0
    filtered.forEach((t) => {
      const n = Number(t.amount) || 0
      if (t.type === 'income') income += n
      else expense += n
    })
    return { income, expense, net: income - expense, count: filtered.length }
  }, [filtered])

  return (
    <div className="app-container">
      <header style={{
        padding: 'calc(20px + var(--safe-top)) 20px 16px',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>收支明细</h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
          共 {totals.count} 笔记录
        </p>
      </header>

      {/* 合计卡片 — 毛玻璃 */}
      <div style={{ padding: '4px 16px 16px' }}>
        <div style={{
          ...glassStyle,
          padding: '18px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 500 }}>收入合计</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e11d48', marginTop: '4px', whiteSpace: 'nowrap' }}>
              +¥{totals.income.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 500 }}>支出合计</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '4px', whiteSpace: 'nowrap' }}>
              -¥{totals.expense.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 500 }}>净收支</div>
            <div style={{
              fontSize: '18px', fontWeight: 700, marginTop: '4px', whiteSpace: 'nowrap',
              color: totals.net >= 0 ? '#e11d48' : '#059669',
            }}>
              {totals.net >= 0 ? '+' : ''}¥{totals.net.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 筛选区 */}
      <div style={{ padding: '0 16px 12px' }}>
        {/* 分类筛选 */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px' }}>
          <FilterChip active={filterCategory === 'all'} onClick={() => setFilterCategory('all')}>全部</FilterChip>
          {Object.entries(CATEGORIES)
            .filter(([_, cat]) => filterType === 'all' || cat.type === filterType)
            .map(([key, cat]) => (
            <FilterChip
              key={key}
              active={filterCategory === key}
              onClick={() => setFilterCategory(key)}
            >{cat.label}</FilterChip>
          ))}
        </div>

        {/* 收/支 筛选 */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px' }}>
          <FilterChip active={filterType === 'all'} onClick={() => setFilterType('all')}>全部</FilterChip>
          <FilterChip active={filterType === 'income'} onClick={() => setFilterType('income')}>收入</FilterChip>
          <FilterChip active={filterType === 'expense'} onClick={() => setFilterType('expense')}>支出</FilterChip>
        </div>

        {/* 月份 + 账号 + 排序 同行对齐 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'stretch', overflowX: 'auto' }}>
          <button onClick={() => { setPickerYear(parseInt((filterMonth !== 'all' ? filterMonth : new Date().toISOString().slice(0,4)).slice(0,4)) || new Date().getFullYear()); setShowMonthPicker(true) }}
            style={{ ...inputStyle, width: '104px', flex:'0 0 104px', padding:'8px 6px', fontSize:'13px', background:'rgba(255,255,255,0.6)', textAlign:'center', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px' }}>
            {filterMonth === 'all' ? '📅 全部月份' : `📅 ${filterMonth}`} ▾
          </button>
          {accounts.length > 0 && (
            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}
              style={{ ...inputStyle, flex:'1 1 0', minWidth: '80px', padding:'8px 8px', fontSize:'13px', background:'rgba(255,255,255,0.6)' }}>
              <option value="all">全部账号</option>
              {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <SortButton label="日期" field="date" sortBy={sortBy} onClick={toggleSort} />
          <SortButton label="金额" field="amount" sortBy={sortBy} onClick={toggleSort} />
        </div>
      </div>

      {/* 列表 */}
      <div style={{ padding: '0 16px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>💰</div>
            <p style={{ fontSize: '14px', margin: 0 }}>暂无收支记录</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((t, idx) => {
              const cat = CATEGORIES[t.category] || { label: t.category, color: 'var(--text-sub)', bg: 'rgba(255,255,255,0.5)', type: t.type }
              const isSwiped = swipedTxId === t.id
              return (
                <div key={t.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
                  {/* 左滑操作按钮 */}
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '4px' }}>
                    <button onClick={() => { setSwipedTxId(null); navigate(`/finance/edit/${t.id}`) }} style={{ width: '72px', height: '80%', border: 'none', background: '#6366f1', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '10px' }}>编辑</button>
                    <button onClick={() => { setSwipedTxId(null); setDelId(t.id) }} style={{ width: '72px', height: '80%', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '10px' }}>删除</button>
                  </div>
                  <div
                    onTouchStart={(e) => { const ct = e.touches[0]; e.currentTarget.dataset.swipeStart = `${ct.clientX},${ct.clientY}`; e.currentTarget.dataset.swiping = 'false' }}
                    onTouchMove={(e) => { const ct = e.touches[0]; const start = (e.currentTarget.dataset.swipeStart || '').split(',').map(Number); if (!start[0]) return; const dx = ct.clientX - start[0]; const dy = ct.clientY - start[1]; if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) e.currentTarget.dataset.swiping = 'true' }}
                    onTouchEnd={(e) => { if (e.currentTarget.dataset.swiping === 'true') { setSwipedTxId(prev => prev === t.id ? null : t.id) } }}
                    style={{
                      ...glassStyle, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'transform 0.2s ease', transform: isSwiped ? 'translateX(-160px)' : 'translateX(0)',
                      position: 'relative', zIndex: 1,
                    }}
                  >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 9px',
                        borderRadius: '8px',
                        background: cat.bg,
                        color: cat.color,
                        fontWeight: 600,
                      }}>{cat.label}</span>
                      {t.account && (
                        <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>@{t.account}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '5px' }}>
                      {formatDate(t.date)}
                    </div>
                    {t.remark && (
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px' }}>{t.remark}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: t.type === 'income' ? '#e11d48' : '#059669',
                    }}>
                      {t.type === 'income' ? '+' : '-'}¥{(Number(t.amount) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 添加按钮 — 毛玻璃悬浮 */}
      <button
        onClick={() => navigate('/finance/new')}
        style={{
          position: 'fixed',
          bottom: 'calc(92px + var(--safe-bottom))',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
          color: '#fff',
          fontSize: '30px',
          fontWeight: 300,
          lineHeight: 1,
          boxShadow: '0 8px 24px rgba(52, 211, 153, 0.4)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'float 3s ease-in-out infinite',
        }}
      >+</button>

      {showAdd && (
        <TransactionForm
          accounts={accounts}
          onClose={() => setShowAdd(false)}
          onSave={(data) => { addTransaction(data); setShowAdd(false); show('已添加', 'success') }}
        />
      )}

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { deleteTransaction(delId); show('已删除', 'success') }}
        title="删除记录"
        message="确定删除这条收支记录吗？"
        confirmText="删除"
        danger
      />

      {/* 月份选择弹窗（支持跨年份翻页） */}
      <Modal open={showMonthPicker} onClose={() => setShowMonthPicker(false)} title="选择月份">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <button onClick={() => setPickerYear(pickerYear - 1)} style={{
            width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)',
            background: '#fff', fontSize: '18px', cursor: 'pointer', color: 'var(--text-main)',
          }}>‹</button>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>{pickerYear} 年</span>
          <button onClick={() => setPickerYear(pickerYear + 1)} style={{
            width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)',
            background: '#fff', fontSize: '18px', cursor: 'pointer', color: 'var(--text-main)',
          }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {Array.from({ length: 12 }, (_, i) => {
            const mm = String(i + 1).padStart(2, '0')
            const val = `${pickerYear}-${mm}`
            const selected = filterMonth === val
            const hasData = months.includes(val)
            return (
              <button key={val} onClick={() => { setFilterMonth(val); setShowMonthPicker(false) }} style={{
                padding: '10px 0', borderRadius: '10px', border: selected ? 'none' : '1px solid rgba(0,0,0,0.08)',
                background: selected ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
                color: selected ? '#fff' : 'var(--text-main)',
                fontSize: '13px', fontWeight: selected ? 600 : 500, cursor: 'pointer',
              }}>
                {i + 1}月{hasData ? ' •' : ''}
              </button>
            )
          })}
        </div>
        <button onClick={() => { setFilterMonth('all'); setShowMonthPicker(false) }} style={{
          width: '100%', marginTop: '12px', padding: '10px 0', borderRadius: '10px',
          border: filterMonth === 'all' ? 'none' : '1px dashed rgba(0,0,0,0.15)',
          background: filterMonth === 'all' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
          color: filterMonth === 'all' ? '#fff' : 'var(--text-sub)',
          fontSize: '13px', fontWeight: filterMonth === 'all' ? 600 : 500, cursor: 'pointer',
        }}>全部月份</button>
      </Modal>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: active ? 'linear-gradient(135deg, #f472b6, #ec4899)' : 'rgba(255, 255, 255, 0.55)',
        backdropFilter: active ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: active ? 'none' : 'blur(12px)',
        color: active ? '#fff' : 'var(--text-sub)',
        border: active ? 'none' : '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: active ? '0 4px 12px rgba(244, 114, 182, 0.3)' : 'none',
      }}
    >{children}</button>
  )
}

function SortButton({ label, field, sortBy, onClick }) {
  const active = sortBy.startsWith(field)
  const arrow = active ? (sortBy === field + '_desc' ? '↓' : '↑') : ''
  return (
    <button
      onClick={() => onClick(field)}
      style={{
        flex: 1,
        padding: '8px 10px',
        fontSize: '13px',
        fontWeight: 600,
        borderRadius: '10px',
        background: active ? 'linear-gradient(135deg, #a78bfa, #8b5cf6)' : 'rgba(255, 255, 255, 0.55)',
        color: active ? '#fff' : 'var(--text-sub)',
        border: active ? 'none' : '1px solid rgba(255, 255, 255, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: active ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
      }}
    >{label} <span style={{ fontSize: '14px', lineHeight: 1 }}>{arrow}</span></button>
  )
}

function TransactionForm({ accounts = [], onClose, onSave }) {
  const [form, setForm] = useState({
    type: 'income',
    category: 'sample',
    account: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    remark: '',
  })

  const incomeCats = Object.entries(CATEGORIES).filter(([_, c]) => c.type === 'income')
  const expenseCats = Object.entries(CATEGORIES).filter(([_, c]) => c.type === 'expense')
  const currentCats = form.type === 'income' ? incomeCats : expenseCats

  const handleTypeChange = (type) => {
    const cats = type === 'income' ? incomeCats : expenseCats
    setForm({ ...form, type, category: cats[0][0] })
  }

  const handleSave = () => {
    if (!form.amount || Number(form.amount) <= 0) return
    onSave(form)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="添加收支"
      inline
      footer={
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={btnGhost} onClick={onClose}>取消</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave}>保存</button>
        </div>
      }
    >
      <Field label="类型">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleTypeChange('income')}
            style={{
              flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
              background: form.type === 'income' ? 'linear-gradient(135deg, #34d399, #10b981)' : 'rgba(255, 255, 255, 0.5)',
              color: form.type === 'income' ? '#fff' : 'var(--text-sub)',
              border: form.type === 'income' ? 'none' : '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: form.type === 'income' ? '0 4px 12px rgba(52, 211, 153, 0.3)' : 'none',
            }}
          >💰 收入</button>
          <button
            onClick={() => handleTypeChange('expense')}
            style={{
              flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
              background: form.type === 'expense' ? 'linear-gradient(135deg, #fb7185, #f43f5e)' : 'rgba(255, 255, 255, 0.5)',
              color: form.type === 'expense' ? '#fff' : 'var(--text-sub)',
              border: form.type === 'expense' ? 'none' : '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: form.type === 'expense' ? '0 4px 12px rgba(251, 113, 133, 0.3)' : 'none',
            }}
          >💸 支出</button>
        </div>
      </Field>

      <Field label="分类">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {currentCats.map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setForm({ ...form, category: key })}
              style={{
                padding: '7px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                background: form.category === key ? cat.bg : 'rgba(255, 255, 255, 0.5)',
                color: form.category === key ? cat.color : 'var(--text-sub)',
                border: form.category === key ? `1px solid ${cat.color}33` : '1px solid rgba(255, 255, 255, 0.6)',
              }}
            >{cat.label}</button>
          ))}
        </div>
      </Field>

      <Field label="账号">
        <div style={{ position: 'relative' }}>
          <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: '36px', color: form.account ? 'var(--text-main)' : 'var(--text-sub)' }}>
            <option value="">请选择账号</option>
            {accounts.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-sub)', fontSize: '12px' }}>▾</span>
        </div>
      </Field>

      <Field label="金额" required>
        <input type="number" style={inputStyle} placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
      </Field>

      <Field label="日期">
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>

      <Field label="备注（选填）">
        <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="备注" value={form.remark} onChange={(e) => { const v=e.target.value; setForm({...form, remark:v, category:v.includes("海淘提现")?"haitao":form.category}) }} />
      </Field>
    </Modal>
  )
}
