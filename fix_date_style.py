import io
f = r'E:\treasure-workbench\src\components\DateFilterBar.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# 1. chipBase: 改成文字下划线样式
c = c.replace(
    """const chipBase = {
  padding: '5px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto',
}""",
    """const chipBase = {
  padding: '4px 2px', borderRadius: 0, fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto',
  border: 'none', background: 'transparent',
}"""
)

# 2. "全部"按钮
c = c.replace(
    """        <button onClick={() => onChange('')} style={{
          ...chipBase,
          border: !value ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: !value ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: !value ? '#fff' : 'var(--text-sub)',
        }}>全部</button>""",
    """        <button onClick={() => onChange('')} style={{
          ...chipBase,
          borderBottom: !value ? '2px solid #ec4899' : '2px solid transparent',
          color: !value ? '#ec4899' : 'var(--text-sub)',
        }}>全部</button>"""
)

# 3. 日期chips
c = c.replace(
    """            <button key={c.id} onClick={() => onChange(sel ? '' : c.id)} style={{
              ...chipBase,
              border: sel ? 'none' : '1px solid rgba(244,114,182,0.35)',
              background: sel ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
              color: sel ? '#fff' : 'var(--text-main)',
            }}>{c.label}</button>""",
    """            <button key={c.id} onClick={() => onChange(sel ? '' : c.id)} style={{
              ...chipBase,
              borderBottom: sel ? '2px solid #ec4899' : '2px solid transparent',
              color: sel ? '#ec4899' : 'var(--text-main)',
            }}>{c.label}</button>"""
)

# 4. 日期弹窗入口按钮
c = c.replace(
    """      <button onClick={toggle} style={{
        ...chipBase, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
        border: (isRange && value) ? 'none' : '1px solid rgba(244,114,182,0.35)',
        background: (isRange && value) ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
        color: (isRange && value) ? '#fff' : 'var(--text-main)',
      }}>""",
    """      <button onClick={toggle} style={{
        ...chipBase, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
        borderBottom: (isRange && value) ? '2px solid #ec4899' : '2px solid transparent',
        color: (isRange && value) ? '#ec4899' : 'var(--text-main)',
      }}>"""
)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
