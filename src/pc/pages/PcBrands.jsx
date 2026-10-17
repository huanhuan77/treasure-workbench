import { useMemo, useState } from 'react'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { copyText } from '../../utils/clipboard'
import { recordDelete } from '../../utils/sync'
import { ResetButton } from '../components/ResetButton'

// PC 版「品牌方联系」。
// 数据与语义照手机版 BrandContactsPage：**直接读写 localStorage 的 `brand_contacts_v1`**（数组，不走 store），
// 删除时 recordDelete 记墓碑以便同步。字段：{ id, name, wechat, added }。
// PC 侧差异只有展示层：卡片 + 左滑操作 → 表格 + 行内操作；新增/编辑走弹窗（手机版也是弹窗，
// 但那边是用 DOM id 取值，这里改成受控 state）。
const STORAGE_KEY = 'brand_contacts_v1'

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
const persist = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'added', label: '已添加' },
  { key: 'todo', label: '未添加' },
]

export function PcBrands() {
  const { show } = useToast()
  const [list, setList] = useState(load)
  const [filter, setFilter] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState(null)   // null=关闭 / 'new'=新增 / 对象=编辑
  const [form, setForm] = useState({ name: '', wechat: '', added: false })
  const [delTarget, setDelTarget] = useState(null)

  const update = (next) => { persist(next); setList(next) }

  const counts = useMemo(() => ({
    all: list.length,
    added: list.filter((i) => i.added).length,
    todo: list.filter((i) => !i.added).length,
  }), [list])

  const shown = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return list
      .filter((i) => (filter === 'all' ? true : filter === 'added' ? !!i.added : !i.added))
      .filter((i) => !kw || `${i.name || ''} ${i.wechat || ''}`.toLowerCase().includes(kw))
  }, [list, filter, keyword])

  const openNew = () => { setForm({ name: '', wechat: '', added: false }); setEditing('new') }
  const openEdit = (it) => { setForm({ name: it.name || '', wechat: it.wechat || '', added: !!it.added }); setEditing(it) }

  const save = () => {
    const name = form.name.trim()
    if (!name) { show('请输入品牌方名称', 'error'); return }
    const wechat = form.wechat.trim()
    if (editing && editing !== 'new') {
      update(list.map((i) => (i.id === editing.id ? { ...i, name, wechat, added: form.added } : i)))
      show('已更新', 'success')
    } else {
      update([{ id: uid(), name, wechat, added: form.added }, ...list])
      show('已添加', 'success')
    }
    setEditing(null)
  }

  const toggleAdded = (it) => {
    update(list.map((i) => (i.id === it.id ? { ...i, added: !i.added } : i)))
    show(it.added ? '已改为「未添加」' : '已改为「已添加」', 'success')
  }

  const copyOne = (it) => {
    const text = `${it.name} ${it.wechat}`.trim()
    copyText(text).then((ok) => show(ok ? `已复制：${text}` : '复制失败', ok ? 'success' : 'error'))
  }

  const doDelete = () => {
    if (!delTarget) return
    try { recordDelete(STORAGE_KEY, delTarget.id) } catch (e) { /* 同步异常不影响本地删除 */ }
    update(list.filter((i) => i.id !== delTarget.id))
    setDelTarget(null)
    show('已删除', 'success')
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">品牌方联系</div>
          <div className="pcv-sub">
            {list.length} 个品牌方 · 已添加 {counts.added} · 未添加 {counts.todo}
          </div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 220 }}
          placeholder="搜索品牌方 / 微信"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <ResetButton active={keyword !== ''} onClick={() => setKeyword('')} inline />
        <button className="pcv-btn" onClick={openNew}>新增品牌方</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <div className="pcv-seg">
            {FILTERS.map((f) => (
              <button key={f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>
                <span>{f.label}</span>
                <span className="pcv-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 240 }}>品牌方</th>
                <th style={{ width: 220 }}>微信</th>
                <th style={{ width: 110 }}>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="pcv-empty">
                    {list.length === 0 ? '还没有品牌方联系方式，点右上角「新增品牌方」添加' : '当前筛选下没有品牌方'}
                  </td>
                </tr>
              ) : shown.map((it) => (
                <tr key={it.id}>
                  <td>
                    <span className="pcv-namecell">
                      <span className="pcv-caticon" style={{ background: '#f4f1fd', color: '#6d4bc4' }}>
                        {(it.name || '?').charAt(0)}
                      </span>
                      <span className="pcv-nametext" title={it.name}>{it.name}</span>
                    </span>
                  </td>
                  <td>
                    {it.wechat
                      ? <span style={{ color: '#333a45' }}>{it.wechat}</span>
                      : <span style={{ color: '#c9cdd4' }}>—</span>}
                  </td>
                  <td>
                    {/* 状态本身就是个开关：点一下切换（手机版卡片里那个小胶囊也是可点的） */}
                    <button
                      className="pcv-chip"
                      style={{
                        border: 'none', cursor: 'pointer',
                        background: it.added ? '#eef4ef' : '#f3f4f6',
                        color: it.added ? '#5f8a74' : '#6b7280',
                      }}
                      onClick={() => toggleAdded(it)}
                      title="点一下切换「已添加 / 未添加」"
                    >{it.added ? '✓ 已添加' : '○ 未添加'}</button>
                  </td>
                  <td>
                    <button className="pcv-btn pcv-btn-ghost" onClick={() => copyOne(it)}>复制</button>
                    <button className="pcv-btn-text" style={{ marginLeft: 10 }} onClick={() => openEdit(it)}>编辑</button>
                    <button className="pcv-btn-text" style={{ marginLeft: 10, color: '#b96a66' }} onClick={() => setDelTarget(it)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增 / 编辑：弹窗 */}
      {editing && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{editing === 'new' ? '添加品牌方' : '编辑品牌方'}</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>

            <div className="pcv-dialog-b">
              <div className="pcv-field-label">品牌方名称 <span style={{ color: '#b96a66' }}>*</span></div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                placeholder="例如：珀芙研 / 洁比兔"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') save() }}
              />

              <div className="pcv-field-label" style={{ marginTop: 16 }}>微信</div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                placeholder="微信号"
                value={form.wechat}
                onChange={(e) => setForm((f) => ({ ...f, wechat: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') save() }}
              />

              <div className="pcv-field-label" style={{ marginTop: 16 }}>是否已添加</div>
              <div className="pcv-catpick">
                <button className={form.added ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, added: true }))}>✓ 已添加</button>
                <button className={!form.added ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, added: false }))}>○ 未添加</button>
              </div>
            </div>

            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="pcv-btn" onClick={save}>{editing === 'new' ? '添加' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
        title="删除品牌方"
        message={delTarget ? `确定删除「${delTarget.name}」吗？` : ''}
        confirmText="删除"
        danger
      />
    </>
  )
}
