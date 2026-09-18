import io
f = r'E:\treasure-workbench\src\pages\DashboardPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """      {/* 已发布但发布不足5条 */}
      {lowPublish.length > 0 && (
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#8b5cf6' }} />
            发布不足5条
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#8b5cf6', padding: '1px 7px', borderRadius: '8px' }}>{lowPublish.length}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {lowPublish.map((s) => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>已发 {s.publishCount || 0} 条</span>
                </div>
              </div>
              <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: '9px', border: 'none', background: '#8b5cf6', color: '#fff',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>补发布</button>
            </div>
          ))}
        </div>
      </div>
      )}"""

new = """      {/* 已发布但发布不足5条 */}
      {lowPublish.length > 0 && (
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
            <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#8b5cf6' }} />
            发布不足5条
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#8b5cf6', padding: '1px 7px', borderRadius: '8px' }}>{lowPublish.length}</span>
          </div>
          {lowPublish.length > 5 && (
            <button onClick={() => setShowAllLow(!showAllLow)} style={{ fontSize: '12px', color: '#8b5cf6', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{showAllLow ? '收起' : `展开全部 ${lowPublish.length} 条`} ›</button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(showAllLow ? lowPublish : lowPublish.slice(0, 5)).map((s) => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>已发 {s.publishCount || 0} 条</span>
                </div>
              </div>
              <button onClick={() => navigate('/publish-record/new', { state: { sampleId: s.id, accounts: getAccounts(s) } })} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: '9px', border: 'none', background: '#8b5cf6', color: '#fff',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>补发布</button>
            </div>
          ))}
        </div>
      </div>
      )}"""

c = c.replace(old, new)

# Add state variable - find the first useState
c = c.replace(
    "const [show, setShow] =",
    "const [showAllLow, setShowAllLow] = useState(false)\n  const [show, setShow] ="
)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
