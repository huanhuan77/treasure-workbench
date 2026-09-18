import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
c = c.replace(
    "flex: '0 0 auto', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,",
    "flex: '0 0 auto', padding: '7px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,"
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
