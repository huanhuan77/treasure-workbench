import io
f = r'E:\treasure-workbench\src\pages\SamplesPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """          <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索产品名称…"
            style={{ width: 'min(42vw, 180px)', boxSizing:'border-box', padding:'6px 12px', borderRadius:'999px',
              border:'1px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.5)',
              fontSize:'13px', outline:'none', fontFamily:'inherit', color:'var(--text-main)' }}
          />"""

new = """          <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
            onBlur={() => { window.scrollTo(0, 0); if (listRef.current) listRef.current.scrollTop = 0 }}
            placeholder="搜索产品名称…"
            style={{ width: 'min(42vw, 180px)', boxSizing:'border-box', padding:'6px 12px', borderRadius:'999px',
              border:'1px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.5)',
              fontSize:'13px', outline:'none', fontFamily:'inherit', color:'var(--text-main)' }}
          />"""

c = c.replace(old, new)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
