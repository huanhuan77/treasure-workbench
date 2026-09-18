import io
f = r'E:\treasure-workbench\src\pages\PublishRecordsPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
c = c.replace(
    "display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 2px',\n        flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',",
    "display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 2px', marginTop: '7px',\n        flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',"
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
