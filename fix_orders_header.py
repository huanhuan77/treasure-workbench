import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# 1. Replace PageHeader call to include product select on the right
old_header = """      <PageHeader
        title="出单记录"
        onBack={() => navigate('/')}
      />"""

new_header = """      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'calc(12px + var(--safe-top)) 16px 10px', borderBottom: '1px solid rgba(244,114,182,0.12)', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{
          width: '38px', height: '38px', borderRadius: '50%', border: 'none',
          background: 'rgba(244,114,182,0.12)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', flexShrink: 0 }}>出单记录</h1>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          style={{
            flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            border: productFilter ? '1.5px solid var(--primary)' : '1px solid rgba(244,114,182,0.35)',
            background: productFilter ? 'rgba(99,102,241,0.08)' : '#fff',
            color: productFilter ? '#4f46e5' : 'var(--text-sub)', cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">全部产品</option>
          {groups.map((g) => (
            <option key={g.name} value={g.name}>{g.name}</option>
          ))}
        </select>
      </div>"""

c = c.replace(old_header, new_header)

# 2. Remove product select from the sort row, keep only sort buttons
old_sort = """      {/* 排序 + 产品筛选 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0, padding: '6px 16px 2px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
        <button onClick={toggleDateSort} style={sortChipStyle(isDateMode)}>
          日期 {dateAsc ? '↑' : '↓'}
        </button>
        <button onClick={toggleCountSort} style={sortChipStyle(isCountMode)}>
          出单 {mostAsc ? '↑' : '↓'}
        </button>
        {/* 产品下拉筛选：只列出有出单记录的产品 */}
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          style={{
            flex: '0 0 auto', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            border: productFilter ? '1.5px solid var(--primary)' : '1px solid rgba(244,114,182,0.35)',
            background: productFilter ? 'rgba(99,102,241,0.08)' : '#fff',
            color: productFilter ? '#4f46e5' : 'var(--text-sub)', cursor: 'pointer',
            outline: 'none', maxWidth: '45vw',
          }}
        >
          <option value="">全部产品</option>
          {groups.map((g) => (
            <option key={g.name} value={g.name}>{g.name}</option>
          ))}
        </select>
      </div>"""

new_sort = """      {/* 排序 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0, padding: '6px 16px 2px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
        <button onClick={toggleDateSort} style={sortChipStyle(isDateMode)}>
          日期 {dateAsc ? '↑' : '↓'}
        </button>
        <button onClick={toggleCountSort} style={sortChipStyle(isCountMode)}>
          出单 {mostAsc ? '↑' : '↓'}
        </button>
      </div>"""

c = c.replace(old_sort, new_sort)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
