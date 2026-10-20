import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR, getAccounts } from '../../utils/accounts'
import { SearchSelect } from './SearchSelect'

// 总览「发布计划」卡片（用户要求）：
//   字段 = 发布产品 / 发布账号 / 发布数量 / 发布时间
//   数据在 store.publishPlans，随本地存储 + 云同步（sync 白名单已加）
//   今天及以前的计划标「已到期」，未来的按时间升序排在前面，方便看这两天要发什么
const fmtDate = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const todayStr = () => fmtDate(new Date())
// 发布计划默认日期 = **明天**（用户要求）：今天发的东西通常是当天就录完了，
// 计划多数是「明天要发什么」，默认明天能省一次选择
const tomorrowStr = () => fmtDate(new Date(Date.now() + 864e5))

const emptyForm = () => ({ name: '', account: ACCOUNTS[0] || '', qty: '1', planDate: tomorrowStr(), note: '' })

export function PublishPlanCard() {
  const { samples, publishPlans, addPublishPlan, updatePublishPlan, deletePublishPlan } = useStore()
  const { show } = useToast()
  const [editing, setEditing] = useState(null)   // null=关闭 / 'new' / 条目对象
  const [form, setForm] = useState(emptyForm())
  const [flashId, setFlashId] = useState('')     // 刚保存的那条：滚动定位 + 高亮 4 秒

  const list = publishPlans || []

  // 先按账号分组（同账号排在一起，账号之间按 ACCOUNTS 固定顺序），
  // 组内按发布时间升序（没填日期的排最后），同一天按创建时间倒序
  const sorted = useMemo(() => {
    const rank = (acc) => {
      const i = ACCOUNTS.indexOf(acc)
      return i === -1 ? 999 : i
    }
    return [...list].sort((a, b) => {
      const d = rank(a.account) - rank(b.account)
      if (d !== 0) return d
      const ad = a.planDate || ''
      const bd = b.planDate || ''
      if (ad && bd && ad !== bd) return ad < bd ? -1 : 1
      if (!ad && bd) return 1
      if (ad && !bd) return -1
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  }, [list])

  const today = todayStr()
  const upcoming = sorted.filter((p) => !p.planDate || p.planDate >= today).length

  // 产品名候选 = 当前账号名下做过的样品名（含多账号归属的样品）。
  // 用户要求「先选账号再选产品，产品按账号筛选」：只列该账号的品，避免串号。
  const productNames = useMemo(() => {
    const set = new Set()
    for (const s of samples || []) {
      if (!getAccounts(s).includes(form.account)) continue
      const n = String((s && s.name) || '').trim()
      if (n) set.add(n)
    }
    // 按中文排序，搜同一前缀时相邻显示
    return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
  }, [samples, form.account])

  const openNew = () => { setForm(emptyForm()); setEditing('new') }
  const openEdit = (p) => {
    setForm({ name: p.name || '', account: p.account || ACCOUNTS[0] || '', qty: String(p.qty || 1), planDate: p.planDate || '', note: p.note || '' })
    setEditing(p)
  }

  const save = () => {
    const name = form.name.trim()
    if (!name) { show('请先选择或输入发布产品', 'error'); return }
    const payload = {
      name,
      account: form.account,
      qty: Number(form.qty) > 0 ? Number(form.qty) : 1,
      planDate: form.planDate || '',
      note: form.note.trim(),
    }
    if (editing === 'new') {
      const id = addPublishPlan(payload)
      show(`已加入发布计划：${name}`, 'success')
      // 新增后滚到这一行并高亮（用户反馈「新增了一条消失不见了」：
      // 条目其实加进去了，但按时间排序可能落在卡片下方，一屏看不到）
      setFlashId(id || '')
    } else if (editing) {
      updatePublishPlan(editing.id, payload)
      show('已保存', 'success')
      setFlashId(editing.id)
    }
    setEditing(null)
  }

  useEffect(() => {
    if (!flashId) return
    const t = setTimeout(() => {
      const row = document.querySelector(`tr[data-plan-id="${flashId}"]`)
      if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 80)
    const t2 = setTimeout(() => setFlashId(''), 4000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [flashId])

  return (
    <>
      <div className="pcv-card">
        <div className="pcv-card-h">
          <span>发布计划</span>
          {list.length > 0 && (
            <span className="pcv-chip" style={{ background: '#eef2ff', color: '#4f5fbb' }}>{upcoming} 待发</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>共 {list.length} 条</span>
          <button className="pcv-metric-add" style={{ marginLeft: 2 }} title="新增一条发布计划" onClick={openNew}>新增</button>
          <div className="pcv-spacer" />
        </div>

        {list.length === 0 ? (
          // 空态只占一行（用户要求）：文案缩短 + 单行省略，卡片高度不再被撑开
          <div
            className="pcv-empty"
            style={{ padding: '13px 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >还没有发布计划，点「新增」记一条</div>
        ) : (
          // 卡片与「待办清单 / 待投流」并排（各占 1/3），表格五列放不下，
          // 改成紧凑两行式：第一行 产品 + ×数量，第二行 账号 · 时间 + 状态标签
          <div>
            {sorted.map((p) => {
              const col = ACCOUNT_COLOR[p.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
              const overdue = p.planDate && p.planDate < today
              const isToday = p.planDate === today
              return (
                <div
                  key={p.id}
                  data-plan-id={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                    borderTop: '0.5px solid rgba(15,23,42,0.05)',
                    ...(flashId === p.id ? { background: '#fff7e6', transition: 'background .3s ease' } : null),
                  }}
                >
                  {/* 单行显示（用户要求）：产品名可截断，其余信息压到同一行 */}
                  <span
                    title={p.name}
                    style={{
                      flex: 1, minWidth: 40, fontSize: 14, color: '#333a45',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >{p.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#b8517f', background: '#fdf1f6',
                    padding: '1px 5px', borderRadius: 6, flexShrink: 0,
                  }}>×{p.qty || 1}</span>
                  <span
                    title={p.account}
                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8a8f98', maxWidth: 76 }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: col.c, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.account || '—'}</span>
                  </span>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontVariantNumeric: 'tabular-nums',
                    color: overdue ? '#b96a66' : (isToday ? '#4f5fbb' : '#b0b6bf'),
                    fontWeight: (overdue || isToday) ? 600 : 400,
                  }}>
                    {(p.planDate || '').slice(5) || '—'}
                  </span>
                  <button className="pcv-x" title="编辑" style={{ flexShrink: 0, color: '#8a8f98' }} onClick={() => openEdit(p)}>✎</button>
                  <button
                    className="pcv-x"
                    title="删除"
                    style={{ flexShrink: 0 }}
                    onClick={() => { deletePublishPlan(p.id); show('已删除', 'success') }}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 新增 / 编辑弹窗 */}
      {editing && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{editing === 'new' ? '新增发布计划' : '编辑发布计划'}</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              {/* 先选账号、再选产品（用户要求）：产品候选按账号过滤，
                  切账号时清空已选产品，避免出现「A 账号 + B 账号的品」 */}
              <div className="pcv-field-label">发布账号</div>
              <select
                className="pcv-input"
                style={{ width: '100%' }}
                value={form.account}
                onChange={(e) => setForm((f) => ({ ...f, account: e.target.value, name: '' }))}
              >
                {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>

              <div className="pcv-field-label" style={{ marginTop: 14 }}>发布产品 <span style={{ color: '#b96a66' }}>*</span></div>
              {/* 站内统一的可搜索下拉：**只能选已有的产品**（用户要求去掉「使用自定义」入口，
                  避免手打的名字和产品库/样品名对不上，后面统计不到一块儿） */}
              <SearchSelect
                value={form.name}
                options={productNames}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                allLabel=""
                placeholder="搜索该账号的样品…"
                width="100%"
                inline
                title="发布产品"
              />
              {productNames.length === 0 && (
                <div style={{ fontSize: 12, color: '#b96a66', marginTop: 6 }}>该账号还没有样品，先去「样品」登记</div>
              )}

              {/* 加宽后把「数量 / 时间」摆成一行，视线不用来回跳 */}
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <div style={{ width: 110 }}>
                  <div className="pcv-field-label">发布数量</div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%' }}
                    type="number"
                    min="1"
                    step="1"
                    value={form.qty}
                    onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                  />
                </div>
                <div style={{ width: 190 }}>
                  <div className="pcv-field-label">发布时间</div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%' }}
                    type="date"
                    value={form.planDate}
                    onChange={(e) => setForm((f) => ({ ...f, planDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pcv-field-label" style={{ marginTop: 14 }}>备注（选填）</div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                placeholder="例如：带货链接已到位"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="pcv-btn" style={{ marginLeft: 8 }} onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
