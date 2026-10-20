import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ACCOUNTS, ACCOUNT_COLOR } from '../../utils/accounts'
import { SearchSelect } from './SearchSelect'

// 总览「发布计划」卡片（用户要求）：
//   字段 = 发布产品 / 发布账号 / 发布数量 / 发布时间
//   数据在 store.publishPlans，随本地存储 + 云同步（sync 白名单已加）
//   今天及以前的计划标「已到期」，未来的按时间升序排在前面，方便看这两天要发什么
const todayStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const emptyForm = () => ({ name: '', account: ACCOUNTS[0] || '', qty: '1', planDate: todayStr(), note: '' })

export function PublishPlanCard() {
  const { products, publishPlans, addPublishPlan, updatePublishPlan, deletePublishPlan } = useStore()
  const { show } = useToast()
  const [editing, setEditing] = useState(null)   // null=关闭 / 'new' / 条目对象
  const [form, setForm] = useState(emptyForm())
  const [flashId, setFlashId] = useState('')     // 刚保存的那条：滚动定位 + 高亮 4 秒

  const list = publishPlans || []

  // 按发布时间升序（没填日期的排最后）；同一天按创建时间倒序
  const sorted = useMemo(() => {
    return [...list].sort((a, b) => {
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

  // 产品名候选：产品库里的名字（可手填，不强制选）
  const productNames = useMemo(() => {
    const set = new Set()
    for (const p of products || []) {
      const n = String((p && p.name) || '').trim()
      if (n) set.add(n)
    }
    return [...set]
  }, [products])

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
          <table className="pcv-table pcv-table--inset">
            <thead>
              <tr>
                <th style={{ width: 260 }}>发布产品</th>
                <th style={{ width: 160 }}>发布账号</th>
                <th style={{ width: 100 }}>发布数量</th>
                <th style={{ width: 170 }}>发布时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const col = ACCOUNT_COLOR[p.account] || { c: '#64748b', bg: 'rgba(100,116,139,0.14)' }
                const overdue = p.planDate && p.planDate < today
                const isToday = p.planDate === today
                return (
                  <tr
                    key={p.id}
                    data-plan-id={p.id}
                    style={flashId === p.id ? { background: '#fff7e6', transition: 'background .3s ease' } : undefined}
                  >
                    <td className="pcv-name" title={p.name}>{p.name}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.c, flexShrink: 0 }} />
                        <span style={{ color: '#333a45' }}>{p.account || '—'}</span>
                      </span>
                    </td>
                    <td style={{ color: '#b8517f', fontVariantNumeric: 'tabular-nums' }}>{p.qty || 1}</td>
                    <td style={{ color: overdue ? '#b96a66' : '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {p.planDate || '—'}
                      {isToday && <span className="pcv-chip" style={{ marginLeft: 6, background: '#eef2ff', color: '#4f5fbb' }}>今天</span>}
                      {overdue && <span className="pcv-chip" style={{ marginLeft: 6, background: '#fdeaea', color: '#b96a66' }}>已过期</span>}
                    </td>
                    <td>
                      <button className="pcv-btn-text" onClick={() => openEdit(p)}>编辑</button>
                      <button
                        className="pcv-btn-text"
                        style={{ marginLeft: 8, color: '#b96a66' }}
                        onClick={() => { deletePublishPlan(p.id); show('已删除', 'success') }}
                      >删除</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 新增 / 编辑弹窗 */}
      {editing && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{editing === 'new' ? '新增发布计划' : '编辑发布计划'}</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              <div className="pcv-field-label">发布产品 <span style={{ color: '#b96a66' }}>*</span></div>
              {/* 换成站内统一的可搜索下拉（原来是浏览器原生 datalist，灰色菜单和整体风格不搭）：
                  可以在产品库里搜，也可以直接打一个新名字（回车 / 点「使用「xxx」」） */}
              <SearchSelect
                value={form.name}
                options={productNames}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                allLabel=""
                placeholder="搜索或输入产品名…"
                width="100%"
                allowCustom
                title="发布产品"
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <div style={{ flex: 1 }}>
                  <div className="pcv-field-label">发布账号</div>
                  <select
                    className="pcv-input"
                    style={{ width: '100%' }}
                    value={form.account}
                    onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}
                  >
                    {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
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
              </div>

              <div className="pcv-field-label" style={{ marginTop: 14 }}>发布时间</div>
              <input
                className="pcv-input"
                style={{ width: 180 }}
                type="date"
                value={form.planDate}
                onChange={(e) => setForm((f) => ({ ...f, planDate: e.target.value }))}
              />

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
