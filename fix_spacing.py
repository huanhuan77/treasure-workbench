import io

# PublishRecordsPage: header bottom padding 10px -> 6px
f1 = r'E:\treasure-workbench\src\pages\PublishRecordsPage.jsx'
with io.open(f1, 'r', encoding='utf-8') as fh:
    c1 = fh.read()
c1 = c1.replace(
    "padding: 'calc(14px + var(--safe-top)) 16px 10px'",
    "padding: 'calc(14px + var(--safe-top)) 16px 6px'"
)
with io.open(f1, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c1)
print('PublishRecordsPage OK')

# OrdersPage: header bottom padding 10px -> 6px, stats top padding 10px -> 6px
f2 = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f2, 'r', encoding='utf-8') as fh:
    c2 = fh.read()
c2 = c2.replace(
    "padding: 'calc(12px + var(--safe-top)) 16px 10px', borderBottom: '1px solid rgba(244,114,182,0.12)', flexShrink: 0",
    "padding: 'calc(12px + var(--safe-top)) 16px 6px', borderBottom: '1px solid rgba(244,114,182,0.12)', flexShrink: 0"
)
c2 = c2.replace(
    "padding: '10px 16px 4px', flexShrink: 0",
    "padding: '6px 16px 4px', flexShrink: 0"
)
with io.open(f2, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c2)
print('OrdersPage OK')
