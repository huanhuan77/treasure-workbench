import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
# Just change fontSize 13px -> 12px for account filter buttons
c = c.replace(
    "padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,",
    "padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,"
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
