import { Field, inputStyle } from './Modal'

// 简单唯一 id（同页内足够）
export function linkUid() {
  return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// 定向链接多行编辑器：links = [{id,url,note}]，onChange(nextLinks)
// 新增/编辑样品表单复用。每条只需填链接地址(必填)，可增行、可删行（不再提供备注字段）。
export function LinksEditor({ links, onChange }) {
  const list = Array.isArray(links) ? links : []
  const setRow = (i, patch) => {
    const next = list.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
    onChange(next)
  }
  const addRow = () => onChange([...list, { id: linkUid(), url: '', note: '' }])
  const removeRow = (i) => onChange(list.filter((_, idx) => idx !== i))

  return (
    <Field label="定向链接">
      {list.length === 0 ? (
        <div style={{
          fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.5,
          background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(0,0,0,0.12)',
          borderRadius: '10px', padding: '10px 12px',
        }}>
          还没有定向链接
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {list.map((it, i) => (
            <div key={it.id} style={{
              background: '#fff', border: '1px solid rgba(244,114,182,0.18)',
              borderRadius: '12px', padding: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', background: 'rgba(244,114,182,0.12)', padding: '2px 8px', borderRadius: '6px' }}>链接 {i + 1}</span>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  style={{ border: 'none', background: 'transparent', color: '#f43f5e', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                >删除</button>
              </div>
              <input
                style={{ ...inputStyle, minHeight: '38px', padding: '8px 10px', fontSize: '14px' }}
                placeholder="https://…（粘贴链接地址）"
                value={it.url || ''}
                onChange={(e) => setRow(i, { url: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        style={{
          marginTop: '8px', width: '100%', padding: '10px', borderRadius: '10px',
          border: '1px dashed rgba(244,114,182,0.5)', background: 'rgba(244,114,182,0.06)',
          color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}
      >＋ 添加链接</button>
    </Field>
  )
}
