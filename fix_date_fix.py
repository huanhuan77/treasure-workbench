import io
f = r'E:\treasure-workbench\src\components\DateFilterBar.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """    <div className="hide-scrollbar" style={{
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

new = """    <div style={{
      display: 'flex', alignItems: 'center', padding: '4px 16px 2px', flexShrink: 0,
    }}>
      {/* 左侧：快捷日期chips，可横滑 */}
      <div className="hide-scrollbar" style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px',
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
      </div>
      {/* 右侧：日期弹窗入口，固定不滚动 */}
      <button onClick={toggle} style={{
        ...chipBase, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '2px',
        borderBottom: (isRange && value) ? '2px solid #ec4899' : '2px solid transparent',
        color: (isRange && value) ? '#ec4899' : 'var(--text-main)',
      }}>"""

c = c.replace(old, new)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
