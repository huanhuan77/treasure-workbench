import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Add full-screen loading overlay after the pull indicator
old = """      </div>
      {/* 顶部 Header */}"""

new = """      </div>
      {/* 全屏 Loading 遮罩 */}
      {refreshing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(248,250,252,0.75)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '12px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '3px solid #e0e7ff', borderTopColor: '#6366f1',
            animation: 'ip-spin 0.7s linear infinite',
          }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6366f1' }}>正在刷新行情…</span>
        </div>
      )}
      {/* 顶部 Header */}"""

c = c.replace(old, new)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
