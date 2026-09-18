import io
f = r'E:\treasure-workbench\src\pages\DashboardPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# 1. Add data computation after reminders
old_data = """  // 即将到期：有截止日期、且未发布/未放弃、7 天内到期（含已逾期），按截止日期升序"""

new_data = """  // 已发布但发布不足5条的样品
  const lowPublish = useMemo(
    () => (samples || []).filter((s) => s.status === 'published' && (Number(s.publishCount) || 0) < 5),
    [samples],
  )

  // 即将到期：有截止日期、且未发布/未放弃、7 天内到期（含已逾期），按截止日期升序"""

c = c.replace(old_data, new_data)

# 2. Add UI section before "即将到期"
old_ui = """      {/* 即将到期样品（按截止日期：7 天内 / 已逾期） */}"""

new_ui = """      {/* 已发布但发布不足5条 */}
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
      )}

      {/* 即将到期样品（按截止日期：7 天内 / 已逾期） */}"""

c = c.replace(old_ui, new_ui)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
