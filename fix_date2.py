import io
f = r'E:\treasure-workbench\src\components\DateFilterBar.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# 1. chipBase fontSize 13px -> 15px
c = c.replace(
    "padding: '4px 2px', borderRadius: 0, fontSize: '13px', fontWeight: 600,",
    "padding: '4px 2px', borderRadius: 0, fontSize: '15px', fontWeight: 600, textAlign: 'center',"
)

# 2. 重构布局：去掉内层横滑容器，所有按钮直接在外层 flex 里均匀分布
old_block = """    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 16px 2px', flexShrink: 0,
    }}>
      {/* 左侧：可横滑的快捷筛选 chips */}
      <div className="hide-scrollbar" style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px',
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
      {/* 日期弹窗入口 */}
      <button onClick={toggle} style={{
        ...chipBase, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
        borderBottom: (isRange && value) ? '2px solid #ec4899' : '2px solid transparent',
        color: (isRange && value) ? '#ec4899' : 'var(--text-main)',
      }}>
        <span>📅 {dateLabel(value)}</span>
        <span style={{ fontSize: '9px', opacity: 0.8, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>"""

new_block = """    <div style={{
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
      }}>
        <span>📅{dateLabel(value)}</span>
        <span style={{ fontSize: '9px', opacity: 0.8, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>"""

c = c.replace(old_block, new_block)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
