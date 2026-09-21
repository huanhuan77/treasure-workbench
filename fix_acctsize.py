import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """      {/* 账号筛选：一行不换行，可横滚 */}
      <div style={{ padding: '4px 16px 2px', display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button onClick={() => setAccountFilter('')} style={{
          flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
          border: accountFilter === '' ? 'none' : '1px solid rgba(244,114,182,0.35)',
          background: accountFilter === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: accountFilter === '' ? '#fff' : 'var(--text-main)', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const col = accMeta(a)
          const sel = accountFilter === a
          return (
            <button key={a} onClick={() => setAccountFilter(a)} style={{
              flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              border: sel ? 'none' : `1px solid ${col.c}`,
              background: sel ? col.c : '#fff',
              color: sel ? '#fff' : col.c, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>{a}</button>
          )
        })}
      </div>"""

new = """      {/* 账号筛选：一行不换行，可横滚（与视频发布记录一致） */}
      <div className="hide-scrollbar" style={{ padding: '4px 16px 2px', display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
        <button onClick={() => setAccountFilter('')} style={{
          flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
          border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
          whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderColor: accountFilter === '' ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: accountFilter === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: accountFilter === '' ? '#fff' : 'var(--text-sub)',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const col = accMeta(a)
          const sel = accountFilter === a
          return (
            <button key={a} onClick={() => setAccountFilter(a)} style={{
              flex: '0 0 auto', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
              whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderColor: sel ? col.c : 'rgba(0,0,0,0.06)',
              background: sel ? col.bg : '#fff',
              color: sel ? col.c : 'var(--text-main)',
            }}>{a}</button>
          )
        })}
      </div>"""

c = c.replace(old, new)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
