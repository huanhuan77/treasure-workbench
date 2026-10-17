import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { isAccountsHidden, setAccountsHidden } from '../../utils/accountVis'
import { CATEGORIES } from '../../utils/financeCategories'
import { ResetButton } from '../components/ResetButton'

// PC 版「收支明细」。
// 数据与语义照手机版 FinancePage / NewTransactionPage / EditTransactionPage：
//   store 的 transactions / addTransaction / updateTransaction / deleteTransaction；
//   分类表 CATEGORIES 的 type 决定收入/支出（金额配色：收入红、支出绿，中国习惯）；
//   收入有「已收款 / 待收款」开关（`received`，false 才是待收款；undefined 视为已收款）；
//   合计只统计**当前筛选后**的记录（与手机版同一口径，不是全量）。
// PC 侧差异只有展示层：卡片 + 左滑 → 表格；新增/编辑从整页改成弹窗；
// 月份从「12 个月网格弹窗」改成下拉（能选到同一个集合，交互更省事）。
// 分类表统一放在 utils/financeCategories，与手机端三个页面共用一份（新增分类只改一处）
const INCOME = Object.entries(CATEGORIES).filter(([, c]) => c.type === 'income')
const EXPENSE = Object.entries(CATEGORIES).filter(([, c]) => c.type === 'expense')

const todayStr = () => new Date().toISOString().slice(0, 10)
const fmtMoney = (n) => (Number(n) || 0).toFixed(2)

export function PcFinance() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useStore()
  const { show } = useToast()

  const now = new Date()
  const [filterType, setFilterType] = useState('all')       // all | income | expense | pending
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterMonth, setFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [sortBy, setSortBy] = useState('date_desc')
  const [hideAccount, setHideAccount] = useState(isAccountsHidden)
  const [editing, setEditing] = useState(null)              // null / 'new' / tx
  const [form, setForm] = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  // 表头点击排序（与样品页、出单页同一套交互）：
  // 只在当前排序列显示箭头；再点同一列翻转方向，换列则回到该列默认方向。
  const sortDirOf = (field) => (sortBy.startsWith(field) ? (sortBy.endsWith('asc') ? 'asc' : 'desc') : null)
  const toggleSort = (field) => {
    setSortBy((p) => (p === `${field}_desc` ? `${field}_asc` : `${field}_desc`))
  }

  // 重置：分类 / 账号 / 月份 / 排序回到默认（月份默认当前月）
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const hasFilter = filterCategory !== 'all' || filterAccount !== 'all' || filterMonth !== defaultMonth || sortBy !== 'date_desc'
  const resetFilters = () => {
    setFilterCategory('all')
    setFilterAccount('all')
    setFilterMonth(defaultMonth)
    setSortBy('date_desc')
  }

  const toggleHideAccount = () => {
    const next = !hideAccount
    setHideAccount(next)
    setAccountsHidden(next)
  }

  const accounts = useMemo(() => {
    const set = new Set()
    for (const t of transactions || []) if (t.account) set.add(t.account)
    return [...set]
  }, [transactions])

  const months = useMemo(() => {
    const set = new Set()
    for (const t of transactions || []) { const m = (t.date || '').slice(0, 7); if (m) set.add(m) }
    for (let i = 1; i <= 12; i++) set.add(`${now.getFullYear()}-${String(i).padStart(2, '0')}`)
    return [...set].sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    let r = [...(transactions || [])]
    if (filterType === 'pending') r = r.filter((t) => t.type === 'income' && t.received === false)
    else if (filterType !== 'all') r = r.filter((t) => t.type === filterType)
    if (filterCategory !== 'all') r = r.filter((t) => t.category === filterCategory)
    if (filterAccount !== 'all') r = r.filter((t) => t.account === filterAccount)
    if (filterMonth !== 'all') r = r.filter((t) => (t.date || '').slice(0, 7) === filterMonth)

    const by = {
      date_desc: (a, b) => String(b.date).localeCompare(String(a.date)),
      date_asc: (a, b) => String(a.date).localeCompare(String(b.date)),
      amount_desc: (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
      amount_asc: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
    }[sortBy]
    if (by) r.sort(by)
    return r
  }, [transactions, filterType, filterCategory, filterAccount, filterMonth, sortBy])

  // 合计只算筛选后的（与手机版一致）
  const totals = useMemo(() => {
    let income = 0, expense = 0, receivable = 0
    for (const t of filtered) {
      const n = Number(t.amount) || 0
      if (t.type === 'income') {
        income += n
        if (t.received === false) receivable += n
      } else expense += n
    }
    return { income, expense, receivable, net: income - expense, count: filtered.length }
  }, [filtered])

  const openNew = () => {
    setForm({ type: 'income', category: 'sample', account: '', amount: '', date: todayStr(), remark: '', received: true })
    setEditing('new')
  }
  const openEdit = (t) => {
    setForm({
      type: t.type || 'income',
      category: t.category || (t.type === 'expense' ? 'prop' : 'sample'),
      account: t.account || '',
      amount: String(t.amount ?? ''),
      date: t.date || todayStr(),
      remark: t.remark || '',
      received: t.received !== undefined ? !!t.received : t.type !== 'expense',
    })
    setEditing(t)
  }

  // 切收入/支出时把分类纠正到该类型下第一个（同手机版 handleTypeChange）
  const setType = (type) => {
    setForm((f) => {
      const cats = type === 'income' ? INCOME : EXPENSE
      const ok = cats.some(([k]) => k === f.category)
      return { ...f, type, category: ok ? f.category : cats[0][0] }
    })
  }

  const save = () => {
    const amount = Number(form.amount)
    if (!form.amount || !(amount > 0)) { show('请输入大于 0 的金额', 'error'); return }
    const payload = {
      type: form.type,
      category: form.category,
      account: form.account || '',
      amount,
      date: form.date,
      remark: (form.remark || '').trim(),
      received: form.type === 'income' ? !!form.received : true,
    }
    if (editing && editing !== 'new') {
      updateTransaction(editing.id, payload)
      show('已更新', 'success')
    } else {
      addTransaction(payload)
      show('已添加', 'success')
    }
    setEditing(null)
  }

  const doDelete = () => {
    if (!delTarget) return
    deleteTransaction(delTarget.id)
    setDelTarget(null)
    show('已删除', 'success')
  }

  const catsForFilter = filterType === 'income' ? INCOME : filterType === 'expense' ? EXPENSE : [...INCOME, ...EXPENSE]

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">收支明细</div>
          <div className="pcv-sub">
            {totals.count} 笔 · 收入 +¥{fmtMoney(totals.income)} · 支出 -¥{fmtMoney(totals.expense)} · 净 {totals.net >= 0 ? '+' : ''}¥{fmtMoney(totals.net)}
          </div>
        </div>
        <div className="pcv-spacer" />
        <button className="pcv-btn pcv-btn-ghost" onClick={toggleHideAccount}>
          {hideAccount ? '🙈 显示账号' : '👁 隐藏账号'}
        </button>
        <button className="pcv-btn" onClick={openNew}>＋ 记一笔</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        {/* 汇总条：一张卡内分 4 段（标签在上、数字在下），段间 1px 竖线。
            原来 4 张独立卡 + 左侧色条，占地大、颜色还互相打架；
            现在统一成一条，数字用语义色：收入绿 / 支出红 / 净收支看正负 / 待收款琥珀。 */}
        <div className="pcv-sumbar">
          {[
            { label: '收入合计', value: `+¥${fmtMoney(totals.income)}`, color: '#4f8a6d' },
            { label: '支出合计', value: `-¥${fmtMoney(totals.expense)}`, color: '#c05a6e' },
            { label: '净收支', value: `${totals.net >= 0 ? '+' : ''}¥${fmtMoney(totals.net)}`, color: totals.net >= 0 ? '#4f8a6d' : '#c05a6e' },
            { label: '其中待收款', value: `¥${fmtMoney(totals.receivable)}`, color: totals.receivable > 0 ? '#b1702c' : '#c9cdd4' },
          ].map((m) => (
            <div key={m.label} className="pcv-sumcell">
              <div className="pcv-sumlabel">{m.label}</div>
              <div className="pcv-sumvalue" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* 类型筛选 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 8px', borderBottom: 'none' }}>
          <div className="pcv-seg">
            {[
              { k: 'all', l: '全部' },
              { k: 'income', l: '收入' },
              { k: 'expense', l: '支出' },
              { k: 'pending', l: '⏳ 待收款' },
            ].map((t) => (
              <button
                key={t.k}
                className={filterType === t.k ? 'on' : ''}
                onClick={() => { setFilterType(t.k); setFilterCategory('all') }}
              >{t.l}</button>
            ))}
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 8px', borderBottom: 'none' }}>
          <button className={filterCategory === 'all' ? 'on' : ''} onClick={() => setFilterCategory('all')}>全部分类</button>
          {catsForFilter.map(([k, c]) => (
            <button key={k} className={filterCategory === k ? 'on' : ''} onClick={() => setFilterCategory(k)}>{c.label}</button>
          ))}
        </div>

        {/* 月份 / 账号 / 排序 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <select
            className="pcv-input"
            style={{ width: 130 }}
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">📅 全部月份</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {!hideAccount && accounts.length > 0 && (
            <select
              className="pcv-input"
              style={{ width: 140, marginLeft: 6 }}
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="all">全部账号</option>
              {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {/* 重置：分类 / 账号 / 月份 / 排序回到默认（收入·支出那个 seg 是 Tab，不动） */}
          <ResetButton active={hasFilter} onClick={resetFilters} />
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                {/* 排序入口统一：去掉右上那排「日期 / 金额」按钮，改为点表头
                    （与样品页、出单页一致）。箭头只显示在当前排序列上。 */}
                <th style={{ width: 110 }} className="pcv-th-sort" onClick={() => toggleSort('date')}>
                  日期{sortDirOf('date') ? (sortDirOf('date') === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th style={{ width: 120 }}>分类</th>
                <th style={{ width: 130 }}>账号</th>
                <th style={{ width: 130 }} className="pcv-th-sort" onClick={() => toggleSort('amount')}>
                  金额{sortDirOf('amount') ? (sortDirOf('amount') === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th style={{ width: 100 }}>收款</th>
                <th style={{ width: 260 }}>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="pcv-empty">当前筛选下没有收支记录</td>
                </tr>
              ) : filtered.map((t) => {
                const cat = CATEGORIES[t.category] || { label: t.category || '未分类', color: '#6b7280', bg: '#f3f4f6' }
                const isIncome = t.type === 'income'
                return (
                  <tr key={t.id}>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: '#475569' }}>{t.date || '—'}</td>
                    <td>
                      <span className="pcv-chip" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    </td>
                    <td style={{ color: t.account ? '#475569' : '#c9cdd4' }}>
                      {t.account ? (hideAccount ? '***' : t.account) : '—'}
                    </td>
                    <td style={{
                      fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: isIncome ? '#c05a6e' : '#5f8a74',
                    }}>
                      {isIncome ? '+' : '-'}¥{fmtMoney(t.amount)}
                    </td>
                    <td>
                      {isIncome ? (
                        // 点一下切换 已收款 / 待收款（同手机版那个小胶囊）
                        <button
                          className="pcv-chip"
                          style={{
                            border: 'none', cursor: 'pointer',
                            background: t.received === false ? '#faf1e3' : '#eef4ef',
                            color: t.received === false ? '#a97c46' : '#5f8a74',
                          }}
                          onClick={() => {
                            const next = t.received === false
                            updateTransaction(t.id, { received: next })
                            show(next ? '已标记待收款' : '已收款', 'success')
                          }}
                        >{t.received === false ? '待收款' : '已收款'}</button>
                      ) : <span style={{ color: '#c9cdd4' }}>—</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: t.remark ? '#333a45' : '#c9cdd4' }} title={t.remark || ''}>
                        {t.remark ? (t.remark.length > 26 ? t.remark.slice(0, 26) + '…' : t.remark) : '—'}
                      </span>
                    </td>
                    <td>
                      <button className="pcv-btn-text" onClick={() => openEdit(t)}>编辑</button>
                      <button className="pcv-btn-text" style={{ marginLeft: 10, color: '#b96a66' }} onClick={() => setDelTarget(t)}>删除</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增 / 编辑 */}
      {editing && form && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{editing === 'new' ? '记一笔收支' : '编辑收支'}</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>

            <div className="pcv-dialog-b">
              <div className="pcv-field-label">类型</div>
              <div className="pcv-catpick">
                <button className={form.type === 'income' ? 'on' : ''} onClick={() => setType('income')}>💰 收入</button>
                <button className={form.type === 'expense' ? 'on' : ''} onClick={() => setType('expense')}>💸 支出</button>
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16 }}>分类</div>
              <div className="pcv-catpick">
                {(form.type === 'income' ? INCOME : EXPENSE).map(([k, c]) => (
                  <button
                    key={k}
                    className={form.category === k ? 'on' : ''}
                    style={form.category === k ? { background: c.bg, color: c.color, borderColor: `${c.color}33` } : undefined}
                    onClick={() => setForm((f) => ({ ...f, category: k }))}
                  >{c.label}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <div className="pcv-field-label">金额 <span style={{ color: '#b96a66' }}>*</span></div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') save() }}
                  />
                </div>
                <div style={{ width: 170 }}>
                  <div className="pcv-field-label">日期</div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%' }}
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16 }}>账号</div>
              <select
                className="pcv-input"
                style={{ width: '100%' }}
                value={form.account}
                onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}
              >
                <option value="">不指定账号</option>
                {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>

              {form.type === 'income' && (
                <>
                  <div className="pcv-field-label" style={{ marginTop: 16 }}>收款状态</div>
                  <div className="pcv-catpick">
                    <button className={form.received ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, received: true }))}>✓ 已收款</button>
                    <button className={!form.received ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, received: false }))}>⏳ 待收款</button>
                  </div>
                </>
              )}

              <div className="pcv-field-label" style={{ marginTop: 16 }}>备注（选填）</div>
              <textarea
                className="pcv-input"
                style={{ width: '100%', minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="备注"
                value={form.remark}
                onChange={(e) => {
                  const v = e.target.value
                  // 手机版的老习惯：备注里出现「海淘提现」自动把分类切成海淘
                  setForm((f) => ({ ...f, remark: v, category: v.includes('海淘提现') ? 'haitao' : f.category }))
                }}
              />
            </div>

            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="pcv-btn" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
        title="删除记录"
        message="确定删除这条收支记录吗？"
        confirmText="删除"
        danger
      />
    </>
  )
}
