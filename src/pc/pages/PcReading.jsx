import { useMemo, useState } from 'react'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { recordDelete } from '../../utils/sync'
import {
  READING_STORAGE_KEY as KEY,
  loadReadingData as loadData,
  deriveReadingType as deriveType,
  readingCatsFor as catsFor,
  makeReadingLink as makeLink,
  READING_CATEGORY_COLOR as CATEGORY_COLOR,
  READING_STATUS as STATUS,
  READING_STATUS_ORDER as STATUS_ORDER,
  READING_LINK_PLATFORMS as LINK_PLATFORMS,
} from '../../pages/ReadingPage'
import { ResetButton } from '../components/ResetButton'

// PC 版「读书成长」。
// 数据与语义照手机版 ReadingPage：**直接读写 localStorage 的 `reading_growth_v1`**；
// 加载/迁移（33 条内置推荐 + 按标题合并 + type 由分类推导）直接复用页面的 `loadData`，
// 两边共用一份，避免抄错。删除时 recordDelete 记墓碑。
// PC 侧差异只有展示层：卡片 + 左滑 → 表格；状态是行内循环按钮（想读→在读→已读→想读）；
// 写笔记从 `/reading/:id/notes` 整页改成弹窗（写的就是同一条 item 的 `mynotes`）。
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const TYPES = [
  { key: '全部', label: '📚 全部' },
  { key: '综艺', label: '🎬 综艺' },
  { key: '书籍', label: '📖 读书' },
]

export function PcReading() {
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const [typeFilter, setTypeFilter] = useState('全部')
  const [catFilter, setCatFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [editing, setEditing] = useState(null)     // null / 'new' / item
  const [form, setForm] = useState(null)
  const [noteTarget, setNoteTarget] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [delTarget, setDelTarget] = useState(null)

  const persist = (next) => { localStorage.setItem(KEY, JSON.stringify(next)); setData(next) }

  // type 一律由分类推导（与手机版 deriveType 同口径）
  const items = useMemo(
    () => (data.items || []).map((i) => ({
      ...i,
      type: deriveType(i.category, i.type),
      category: i.category || '历史',
    })),
    [data],
  )

  const isShow = (i) => deriveType(i.category, i.type) === '综艺'
  const total = items.length
  const done = items.filter((i) => i.status === 'done').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  // 分类按钮按「当前类型下实际出现的分类」动态生成（同手机版：有什么就显示什么）
  const currentCats = useMemo(() => {
    const pool = typeFilter === '综艺' ? items.filter(isShow)
      : typeFilter === '书籍' ? items.filter((i) => !isShow(i))
        : items
    const present = [...new Set(pool.map((i) => i.category).filter(Boolean))]
    const std = typeFilter === '综艺' ? booksOrShows('综艺')
      : typeFilter === '书籍' ? booksOrShows('书籍')
        : [...booksOrShows('综艺'), ...booksOrShows('书籍')]
    return [...std.filter((c) => present.includes(c)), ...present.filter((c) => !std.includes(c)).sort()]
  }, [items, typeFilter])

  const catStats = useMemo(() => {
    const o = {}
    for (const c of currentCats) o[c] = items.filter((i) => i.category === c).length
    return o
  }, [items, currentCats])

  const shown = useMemo(() => {
    return items.filter((i) => {
      if (typeFilter === '综艺' && !isShow(i)) return false
      if (typeFilter === '书籍' && isShow(i)) return false
      if (catFilter !== '全部' && i.category !== catFilter) return false
      if (statusFilter !== '全部' && i.status !== statusFilter) return false
      return true
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }, [items, typeFilter, catFilter, statusFilter])

  const openNew = () => {
    setForm({ title: '', type: '书籍', category: '历史', status: 'want', watchWhere: '', linkPlatform: 'weread', note: '' })
    setEditing('new')
  }
  const openEdit = (it) => {
    setForm({
      title: it.title || '',
      type: it.type || '书籍',
      category: it.category || '历史',
      status: it.status || 'want',
      watchWhere: it.watchWhere || '',
      linkPlatform: it.linkPlatform || 'weread',
      note: it.note || '',
    })
    setEditing(it)
  }

  // 切类型时把分类纠正到该类型合法的取值（与手机版下拉联动一致）
  const setType = (nextType) => {
    setForm((f) => {
      const opts = catsFor(nextType)
      const category = opts.includes(f.category) ? f.category : (nextType === '综艺' ? '文化' : '历史')
      return { ...f, type: nextType, category }
    })
  }

  const save = () => {
    const title = form.title.trim()
    if (!title) { show('请输入名称', 'error'); return }
    const type = form.type
    const base = {
      title,
      type,
      category: form.category,
      note: (form.note || '').trim(),
      watchWhere: type === '综艺' ? (form.watchWhere || '').trim() : '',
      linkPlatform: type === '书籍' ? (form.linkPlatform || 'weread') : '',
    }
    const link = type === '书籍' ? makeLink(base.linkPlatform, title) : ''
    if (editing && editing !== 'new') {
      persist({ ...data, items: items.map((i) => (i.id === editing.id ? { ...i, ...base, status: form.status || i.status, link } : i)) })
      show('已更新', 'success')
    } else {
      persist({ ...data, items: [{ id: uid(), ...base, status: form.status || 'want', link, createdAt: Date.now(), mynotes: '' }, ...items] })
      show('已添加', 'success')
    }
    setEditing(null)
  }

  const cycleStatus = (it) => {
    const order = STATUS_ORDER
    const next = order[(order.indexOf(it.status) + 1) % order.length]
    persist({ ...data, items: items.map((i) => (i.id === it.id ? { ...i, status: next } : i)) })
    show(`已标为「${STATUS[next].label}」`, 'success')
  }

  const openNotes = (it) => { setNoteTarget(it); setNoteText(it.mynotes || '') }
  const saveNotes = () => {
    if (!noteTarget) return
    persist({ ...data, items: items.map((i) => (i.id === noteTarget.id ? { ...i, mynotes: noteText.trim() } : i)) })
    show(noteText.trim() ? '笔记已保存' : '笔记已清空', 'success')
    setNoteTarget(null)
  }

  const doDelete = () => {
    if (!delTarget) return
    try { recordDelete(KEY, delTarget.id) } catch (e) { /* 同步异常不影响本地删除 */ }
    persist({ ...data, items: items.filter((i) => i.id !== delTarget.id) })
    setDelTarget(null)
    show('已删除', 'success')
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">读书成长</div>
          <div className="pcv-sub">自我提升综艺 + 开智必读书单</div>
        </div>
        <div className="pcv-spacer" />
        <button className="pcv-btn" onClick={openNew}>新增书籍 / 综艺</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        {/* 进度条 + 说明：0% 时只有一条空槽，单看像一块没内容的空白，
            所以在右侧常驻「已完成 x/y · z%」，让它自己说明这是什么 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(15,23,42,0.07)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`, borderRadius: 999,
              background: 'linear-gradient(135deg,#ee8fb6,#8b5cf6)',
              transition: 'width .3s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#8a8f98', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            已完成 {done}/{total} · {progress}%
          </span>
        </div>

        {/* 类型 + 分类 筛选 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 8px', borderBottom: 'none' }}>
          <div className="pcv-seg">
            {TYPES.map((t) => (
              <button
                key={t.key}
                className={typeFilter === t.key ? 'on' : ''}
                onClick={() => { setTypeFilter(t.key); setCatFilter('全部') }}
              >{t.label}</button>
            ))}
          </div>
        </div>
        <div className="pcv-accountbar" style={{ padding: '0 0 8px', borderBottom: 'none' }}>
          {['全部', ...currentCats].map((c) => (
            <button key={c} className={catFilter === c ? 'on' : ''} onClick={() => setCatFilter(c)}>
              {c}{c !== '全部' ? ` ${catStats[c] || 0}` : ''}
            </button>
          ))}
        </div>

        {/* 状态筛选 */}
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          {['全部', ...STATUS_ORDER].map((s) => (
            <button key={s} className={statusFilter === s ? 'on' : ''} onClick={() => setStatusFilter(s)}>
              {s === '全部' ? '全部状态' : `${STATUS[s].emoji} ${STATUS[s].label}`}
            </button>
          ))}
          {/* 重置只清分类 + 状态（书籍/影视是 Tab，不动） */}
          <ResetButton
            active={catFilter !== '全部' || statusFilter !== '全部'}
            onClick={() => { setCatFilter('全部'); setStatusFilter('全部') }}
          />
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 250 }}>名称</th>
                <th style={{ width: 90 }}>类型</th>
                <th style={{ width: 90 }}>分类</th>
                <th style={{ width: 100 }}>状态</th>
                <th style={{ width: 300 }}>备注 / 观看</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="pcv-empty">当前筛选下没有内容，点右上角「新增书籍 / 综艺」添加</td>
                </tr>
              ) : shown.map((it) => {
                const st = STATUS[it.status] || STATUS.want
                const color = CATEGORY_COLOR[it.category] || '#6b7280'
                const url = it.type === '书籍' ? (it.link || makeLink(it.linkPlatform, it.title)) : ''
                return (
                  <tr key={it.id}>
                    <td>
                      <span className="pcv-namecell">
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{it.type === '综艺' ? '🎬' : '📖'}</span>
                        <span className="pcv-nametext" title={it.title}>{it.title}</span>
                        {it.mynotes && (
                          <span className="pcv-chip" style={{ background: '#fef3c7', color: '#a16207', flexShrink: 0 }}>有笔记</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{it.type === '综艺' ? '综艺' : '读书'}</span>
                    </td>
                    <td>
                      <span className="pcv-chip" style={{ background: `${color}1a`, color }}>{it.category}</span>
                    </td>
                    <td>
                      {/* 点一下循环切：想读 → 在读 → 已读 → 想读（同手机版） */}
                      <button
                        className="pcv-chip"
                        style={{ border: 'none', cursor: 'pointer', background: st.color, color: '#fff' }}
                        onClick={() => cycleStatus(it)}
                        title="点一下切换状态"
                      >{st.emoji} {st.label}</button>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: it.note ? '#333a45' : '#c9cdd4' }} title={it.note || ''}>
                        {it.note ? (it.note.length > 24 ? it.note.slice(0, 24) + '…' : it.note) : '—'}
                      </span>
                      {it.type === '综艺' && it.watchWhere && (
                        <span style={{ fontSize: 11, color: '#6d4bc4', marginLeft: 8 }}>📍{it.watchWhere}</span>
                      )}
                    </td>
                    <td>
                      <button className="pcv-btn-text" style={{ color: '#a16207' }} onClick={() => openNotes(it)}>
                        📝 {it.mynotes ? '笔记' : '写笔记'}
                      </button>
                      {url && (
                        <a
                          className="pcv-btn-text"
                          style={{ marginLeft: 10, color: '#0d9488', textDecoration: 'none' }}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >🔍 {LINK_PLATFORMS[it.linkPlatform]?.short || '搜索'}</a>
                      )}
                      <button className="pcv-btn-text" style={{ marginLeft: 10 }} onClick={() => openEdit(it)}>✏️ 编辑</button>
                      <button className="pcv-btn-text" style={{ marginLeft: 10, color: '#b96a66' }} onClick={() => setDelTarget(it)}>删除</button>
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
          <div className="pcv-dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{editing === 'new' ? '添加书籍 / 综艺' : '编辑'}</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              <div className="pcv-field-label">名称 <span style={{ color: '#b96a66' }}>*</span></div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                placeholder="例如：政治学通识 / 圆桌派"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') save() }}
              />

              <div className="pcv-field-label" style={{ marginTop: 16 }}>类型</div>
              <div className="pcv-catpick">
                {[{ k: '书籍', l: '📖 读书' }, { k: '综艺', l: '🎬 综艺' }].map((t) => (
                  <button key={t.k} className={form.type === t.k ? 'on' : ''} onClick={() => setType(t.k)}>{t.l}</button>
                ))}
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16 }}>分类</div>
              <div className="pcv-catpick">
                {catsFor(form.type).map((c) => (
                  <button
                    key={c}
                    className={form.category === c ? 'on' : ''}
                    onClick={() => setForm((f) => ({ ...f, category: c }))}
                  >{c}</button>
                ))}
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16 }}>状态</div>
              <div className="pcv-catpick">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    className={form.status === s ? 'on' : ''}
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                  >{STATUS[s].emoji} {STATUS[s].label}</button>
                ))}
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16 }}>
                {form.type === '综艺' ? '在哪里看' : '搜索平台'}
              </div>
              {form.type === '综艺' ? (
                <input
                  className="pcv-input"
                  style={{ width: '100%' }}
                  placeholder="例如：腾讯视频 / 爱奇艺 / B站"
                  value={form.watchWhere}
                  onChange={(e) => setForm((f) => ({ ...f, watchWhere: e.target.value }))}
                />
              ) : (
                <select
                  className="pcv-input"
                  style={{ width: '100%' }}
                  value={form.linkPlatform}
                  onChange={(e) => setForm((f) => ({ ...f, linkPlatform: e.target.value }))}
                >
                  {Object.entries(LINK_PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              )}

              <div className="pcv-field-label" style={{ marginTop: 16 }}>备注（选填）</div>
              <textarea
                className="pcv-input"
                style={{ width: '100%', minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="一句话推荐 / 心得"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="pcv-btn" onClick={save}>{editing === 'new' ? '添加' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 写笔记（同一条 item 的 mynotes 字段） */}
      {noteTarget && (
        <div className="pcv-overlay" onClick={() => setNoteTarget(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>📝 读书笔记</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#9aa0a9' }}>{noteTarget.title}</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setNoteTarget(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              <textarea
                className="pcv-input"
                style={{ width: '100%', minHeight: 280, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                placeholder="摘抄 / 感想 / 行动清单…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
              <div style={{ fontSize: 11, color: '#9aa0a9', marginTop: 6 }}>
                清空内容后保存即删除笔记；改动只写在这本书上。
              </div>
            </div>
            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setNoteTarget(null)}>取消</button>
              <button className="pcv-btn" onClick={saveNotes}>保存笔记</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
        title="删除"
        message={delTarget ? `确定删除「${delTarget.title}」吗？笔记也会一起删掉。` : ''}
        confirmText="删除"
        danger
      />
    </>
  )
}

// 分类的标准顺序（与手机版一致：综艺在前、书籍在后）
function booksOrShows(type) {
  return catsFor(type)
}
