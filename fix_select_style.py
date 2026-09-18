import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """        <select
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
        </select>"""

new = """        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#c084a0', zIndex: 1, pointerEvents: 'none' }}>🔍</span>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 28px 7px 30px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(244,114,182,0.28)', background: '#fff',
              color: productFilter ? '#4f46e5' : 'var(--text-sub)', cursor: 'pointer',
              outline: 'none', appearance: 'auto',
            }}
          >
            <option value="">全部产品</option>
            {groups.map((g) => (
              <option key={g.name} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>"""

c = c.replace(old, new)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
