import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
c = c.replace(
    "display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0, padding: '2px 16px 2px'",
    "display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0, padding: '2px 16px 2px'"
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
