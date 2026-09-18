import io
f = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
c = c.replace(
    "padding: '4px 16px 2px', display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch',",
    "className: 'hide-scrollbar', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 16px 2px', flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',"
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
