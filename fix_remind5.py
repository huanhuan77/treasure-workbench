import io
f = r'E:\treasure-workbench\src\pages\DashboardPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Add state
c = c.replace(
    "const [showAllLow, setShowAllLow] = useState(false)",
    "const [showAllLow, setShowAllLow] = useState(false)\n  const [showAllReminders, setShowAllReminders] = useState(false)"
)

# Limit to 5 and add expand button
old = """          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {reminders.map((s) => {"""

new = """          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {(showAllReminders ? reminders : reminders.slice(0, 5)).map((s) => {"""

c = c.replace(old, new)

# Add expand button after the list
old2 = """            })}
          </div>
        )}
      </div>

      {/* 已发布但发布不足5条 */}"""

new2 = """            })}
            {reminders.length > 5 && (
              <button onClick={() => setShowAllReminders(!showAllReminders)} style={{ fontSize: '12px', color: '#8a8588', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>{showAllReminders ? '收起' : `展开全部 ${reminders.length} 条`} ›</button>
            )}
          </div>
        )}
      </div>

      {/* 已发布但发布不足5条 */}"""

c = c.replace(old2, new2)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
