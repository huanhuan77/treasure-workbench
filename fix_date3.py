import io
f = r'E:\treasure-workbench\src\components\DateFilterBar.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# 1. chipBase: fontSize 15px -> 14px, padding 4px 2px -> 4px 4px
c = c.replace(
    "padding: '4px 2px', borderRadius: 0, fontSize: '15px', fontWeight: 600, textAlign: 'center',",
    "padding: '4px 6px', borderRadius: 0, fontSize: '14px', fontWeight: 600, textAlign: 'center',"
)

# 2. 容器加 gap 和横滑，去掉 flex:1
c = c.replace(
    """    <div style={{
      display: 'flex', alignItems: 'center', padding: '4px 12px 2px', flexShrink: 0,
    }}>
      <button onClick={() => onChange('')} style={{
        ...chipBase, flex: 1,
        borderBottom: !value ? '2px solid #ec4899' : '2px solid transparent',
        color: !value ? '#ec4899' : 'var(--text-sub)',
      }}>全部</button>
      {DATE_CHIPS.map((c) => {
        const sel = value === c.id
        return (
          <button key={c.id} onClick={() => onChange(sel ? '' : c.id)} style={{
            ...chipBase, flex: 1,
            borderBottom: sel ? '2px solid #ec4899' : '2px solid transparent',
            color: sel ? '#ec4899' : 'var(--text-main)',
          }}>{c.label}</button>
        )
      })}
      {/* 日期弹窗入口 */}
      <button onClick={toggle} style={{
        ...chipBase, flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
        borderBottom: (isRange && value) ? '2px solid #ec4899' : '2px solid transparent',
        color: (isRange && value) ? '#ec4899' : 'var(--text-main)',
      }}>""",
    """    <div className="hide-scrollbar" style={{
      display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 16px 2px', flexShrink: 0,
      overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
    }}>
      <button onClick={() => onChange('')} style={{
        ...chipBase,
        borderBottom: !value ? '2px solid #ec4899' : '2px solid transparent',
        color: !value ? '#ec4899' : 'var(--text-sub)',
      }}>全部</button>
      {DATE_CHIPS.map((c) => {
        const sel = value === c.id
        return (
          <button key={c.id} onClick={() => onChange(sel ? '' : c.id)} style={{
            ...chipBase,
            borderBottom: sel ? '2px solid #ec4899' : '2px solid transparent',
            color: sel ? '#ec4899' : 'var(--text-main)',
          }}>{c.label}</button>
        )
      })}
      {/* 日期弹窗入口 */}
      <button onClick={toggle} style={{
        ...chipBase, display: 'inline-flex', alignItems: 'center', gap: '2px',
        borderBottom: (isRange && value) ? '2px solid #ec4899' : '2px solid transparent',
        color: (isRange && value) ? '#ec4899' : 'var(--text-main)',
      }}>"""
)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
