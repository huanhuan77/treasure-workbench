import io
f = r'E:\treasure-workbench\src\pages\PublishRecordsPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """      {/* 账号筛选：单行横向滚动，不换行 */}
      <div className="hide-scrollbar" style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 2px', marginTop: '7px',
        flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
      }}>
        <button onClick={() => setAccount('')} style={{
          ...chipBase, flexShrink: 0,
          borderColor: account === '' ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: account === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: account === '' ? '#fff' : 'var(--text-sub)',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const sel = account === a
          const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
          return (
            <button key={a} onClick={() => setAccount(a)} style={{
              ...chipBase, flexShrink: 0,
              borderColor: sel ? col.c : 'rgba(0,0,0,0.06)',
              background: sel ? col.bg : '#fff',
              color: sel ? col.c : 'var(--text-main)',
            }}>{a}</button>
          )
        })}
      </div>

      {/* 日期筛选：全部 / 今天 / 昨天 / 近7天 / 本周 / 本月 + 📅 日期（快捷键 / 具体某一天 / 本月·上月·近半年·本年） */}
      <DateFilterBar value={dateRange} onChange={setDateRange} />"""

new = """      {/* 日期筛选 */}
      <DateFilterBar value={dateRange} onChange={setDateRange} />

      {/* 账号筛选：单行横向滚动，不换行 */}
      <div className="hide-scrollbar" style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 16px 2px',
        flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
      }}>
        <button onClick={() => setAccount('')} style={{
          ...chipBase, flexShrink: 0,
          borderColor: account === '' ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
          background: account === '' ? 'linear-gradient(135deg,#f472b6,#ec4899)' : '#fff',
          color: account === '' ? '#fff' : 'var(--text-sub)',
        }}>全部账号</button>
        {ACCOUNTS.map((a) => {
          const sel = account === a
          const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(255,255,255,0.6)' }
          return (
            <button key={a} onClick={() => setAccount(a)} style={{
              ...chipBase, flexShrink: 0,
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
