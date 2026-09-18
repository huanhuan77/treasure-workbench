import io
f = r'E:\treasure-workbench\src\pages\DashboardPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """                  {/* 显示天数提示：红色胶囊标签（已发布的不显示） */}
                  {s.status !== 'published' && (
                    isOverdue(s) ? (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>⚠ 已逾期（截止 {s.deadline}）</span>
                      </div>
                    ) : (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: '#fff',
                          background: '#ef4444',
                          padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap',
                        }}>{daysText === Infinity ? '⚠ 从未发布过视频' : `已 ${daysText} 天没发视频`}</span>
                      </div>
                    )
                  )}"""

new = """                  {/* 显示天数提示：未发布且逾期显示红色；还有账号没发显示橙色 */}
                  {s.status !== 'published' && isOverdue(s) ? (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: '#ef4444', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>⚠ 已逾期（截止 {s.deadline}）</span>
                    </div>
                  ) : pending.length > 0 ? (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, color: '#fff',
                        background: '#f59e0b',
                        padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap',
                      }}>{daysText === Infinity ? '⚠ 从未发布过视频' : `已 ${daysText} 天没发视频`}</span>
                    </div>
                  ) : null}"""

c = c.replace(old, new)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
