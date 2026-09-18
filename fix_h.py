import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
c = c.replace(
    "width: '100%', boxSizing: 'border-box', padding: '7px 28px 7px 30px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,",
    "width: '100%', boxSizing: 'border-box', padding: '10px 28px 10px 30px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,"
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
