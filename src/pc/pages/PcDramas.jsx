import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { DRAMA_STATUS } from '../../utils/dramaLib'
import { ResetButton } from '../components/ResetButton'

// PC 版「追剧」。数据与语义照手机版 DramaPage：
//   store 的 dramas / addDrama / updateDrama / deleteDrama；
//   类型 tv|variety（旧数据没 type 字段 → 默认 tv）、状态 want|watching|done|dropped（缺省 want）；
//   同名会拦（「这部已经在列表里了」）。
// PC 侧差异只有展示层：卡片一行一条 → 表格；状态改成行内四个小按钮（点一下即改，不用进弹窗）。
const TYPES = [
  { key: 'tv', label: '📺 电视剧' },
  { key: 'variety', label: '🎬 综艺' },
]

export function PcDramas() {
  const { dramas, addDrama, updateDrama, deleteDrama } = useStore()
  const { show } = useToast()

  const [name, setName] = useState('')
  const [typeTab, setTypeTab] = useState('tv')
  // 默认看「想看」（用户要求）：这页日常就是挑下一部看什么，全部视图反而混进看过的
  const [statusTab, setStatusTab] = useState('want')
  const [editing, setEditing] = useState(null)          // 编辑中的对象
  const [editForm, setEditForm] = useState({ name: '', type: 'tv' })
  const [delTarget, setDelTarget] = useState(null)

  const list = dramas || []
  // 旧数据没有 type 字段，默认归为电视剧（与手机版一致）
  const typed = useMemo(
    () => list.map((d) => ({ ...d, type: d.type || 'tv', status: d.status || 'want' })),
    [list],
  )
  const byType = typed.filter((d) => d.type === typeTab)
  const shown = statusTab === 'all' ? byType : byType.filter((d) => d.status === statusTab)
  const typeCount = (k) => typed.filter((d) => d.type === k).length
  const statusCount = (s) => byType.filter((d) => d.status === s).length

  const add = () => {
    const n = name.trim()
    if (!n) { show('请输入名称', 'error'); return }
    if (typed.some((d) => (d.name || '').trim() === n)) { show('这部已经在列表里了', 'error'); return }
    addDrama({ name: n, type: typeTab })
    setName('')
    show('已加入', 'success')
  }

  const openEdit = (d) => {
    setEditing(d)
    setEditForm({ name: d.name || '', type: d.type || 'tv' })
  }
  const saveEdit = () => {
    const n = editForm.name.trim()
    if (!n) { show('名称不能为空', 'error'); return }
    updateDrama(editing.id, { name: n, type: editForm.type })
    setEditing(null)
    show('已修改', 'success')
  }

  const setStatus = (d, key) => {
    updateDrama(d.id, { status: key })
    show(`已标为「${DRAMA_STATUS.find((s) => s.key === key)?.label || key}」`, 'success')
  }

  const doDelete = () => {
    if (!delTarget) return
    deleteDrama(delTarget.id)
    setDelTarget(null)
    show('已删除', 'success')
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">追剧</div>
          <div className="pcv-sub">
            共 {list.length} 部 · 电视剧 {typeCount('tv')} · 综艺 {typeCount('variety')}
          </div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 260 }}
          placeholder={typeTab === 'tv' ? '输入剧名，如：狂飙' : '输入综艺名，如：奔跑吧'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        />
        <button className="pcv-btn" onClick={add}>＋ 加入{typeTab === 'tv' ? '电视剧' : '综艺'}</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        <div className="pcv-accountbar" style={{ padding: '0 0 10px', borderBottom: 'none' }}>
          <div className="pcv-seg">
            {TYPES.map((t) => (
              <button
                key={t.key}
                className={typeTab === t.key ? 'on' : ''}
                onClick={() => { setTypeTab(t.key); setStatusTab('want') }}
              >
                <span>{t.label}</span>
                <span className="pcv-count">{typeCount(t.key)}</span>
              </button>
            ))}
          </div>
          {/* 状态筛选紧跟类型 Tab 靠左（原来用 spacer 顶到最右，用户要求「放左边」） */}
          <div className="pcv-sortgrp">
            {[{ key: 'all', label: '全部' }, ...DRAMA_STATUS].map((s) => (
              <button
                key={s.key}
                className={statusTab === s.key ? 'on' : ''}
                onClick={() => setStatusTab(s.key)}
              >
                {s.label}
                {s.key !== 'all' && statusCount(s.key) > 0 ? ` ${statusCount(s.key)}` : ''}
              </button>
            ))}
          </div>
          {/* 重置只清状态筛选（电视剧/综艺是 Tab，不动）。
              用 inline：紧跟在「放弃」后面，不再被 spacer 顶到整行最右端（那样会孤零零挂在窗口边缘） */}
          <ResetButton active={statusTab !== 'want'} onClick={() => setStatusTab('want')} inline />
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 280 }}>名称</th>
                <th style={{ width: 100 }}>类型</th>
                <th style={{ width: 260 }}>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pcv-empty">
                    {byType.length === 0
                      ? `还没有${typeTab === 'tv' ? '电视剧' : '综艺'}，在上面输入名字加入`
                      : '当前状态筛选下没有条目'}
                  </td>
                </tr>
              ) : shown.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ color: '#c9cdd4', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                  <td><span className="pcv-nametext" title={d.name}>{d.name}</span></td>
                  <td>
                    <span className="pcv-chip" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                      {d.type === 'variety' ? '🎬 综艺' : '📺 电视剧'}
                    </span>
                  </td>
                  <td>
                    {/* 点一下即刻改状态（手机版也是行内四个按钮） */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {DRAMA_STATUS.map((s) => {
                        const on = d.status === s.key
                        return (
                          <button
                            key={s.key}
                            className="pcv-flag"
                            style={{ background: on ? s.c : s.bg, color: on ? '#fff' : s.c, borderColor: 'transparent' }}
                            onClick={() => setStatus(d, s.key)}
                          >{s.label}</button>
                        )
                      })}
                    </div>
                  </td>
                  <td>
                    <button className="pcv-btn-text" onClick={() => openEdit(d)}>✏️ 编辑</button>
                    <button className="pcv-btn-text" style={{ marginLeft: 10, color: '#b96a66' }} onClick={() => setDelTarget(d)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑：弹窗（手机版是行内就地改，PC 表格里放输入框会把行撑乱，改成弹窗） */}
      {editing && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>编辑</span>
              <div className="pcv-spacer" />
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="pcv-dialog-b">
              <div className="pcv-field-label">名称</div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit() }}
                autoFocus
              />
              <div className="pcv-field-label" style={{ marginTop: 16 }}>类型</div>
              <div className="pcv-catpick">
                {TYPES.map((t) => (
                  <button
                    key={t.key}
                    className={editForm.type === t.key ? 'on' : ''}
                    onClick={() => setEditForm((f) => ({ ...f, type: t.key }))}
                  >{t.label}</button>
                ))}
              </div>
            </div>
            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="pcv-btn" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
        title="删除追剧"
        message={delTarget ? `确定把「${delTarget.name}」从追剧列表移除吗？` : ''}
        confirmText="删除"
        danger
      />
    </>
  )
}
