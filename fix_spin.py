import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Replace the icon div to use CSS animation for continuous spin
old = """        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
          transform: refreshing ? 'rotate(360deg)' : `rotate(${pullDistance * 3}deg)`,
          transition: refreshing ? 'transform 0.8s linear infinite' : 'transform 0.2s',
        }}>🔄</div>"""

new = """        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
          transform: refreshing ? 'none' : `rotate(${pullDistance * 3}deg)`,
          transition: refreshing ? 'none' : 'transform 0.2s',
          animation: refreshing ? 'ip-spin 0.7s linear infinite' : 'none',
        }}>🔄</div>"""

c = c.replace(old, new)

# Add keyframes style tag right after the opening div
old2 = """    <div className="app-container" style={{ paddingBottom: '100px', background: '#f8fafc', minHeight: '100vh' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>"""

new2 = """    <div className="app-container" style={{ paddingBottom: '100px', background: '#f8fafc', minHeight: '100vh' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <style>{`@keyframes ip-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>"""

c = c.replace(old2, new2)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
