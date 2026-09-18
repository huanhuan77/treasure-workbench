import io

# 1. DateFilterBar: padding 10px 16px 4px -> 4px 16px 2px
f1 = r'E:\treasure-workbench\src\components\DateFilterBar.jsx'
with io.open(f1, 'r', encoding='utf-8') as fh:
    c1 = fh.read()
c1 = c1.replace(
    "display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px 4px', flexShrink: 0,",
    "display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 16px 2px', flexShrink: 0,"
)
with io.open(f1, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c1)
print('DateFilterBar OK')

# 2. PublishRecordsPage: 账号筛选 padding 0 16px 6px -> 0 16px 2px, 排序 padding 4px 16px 2px -> 2px 16px 2px
f2 = r'E:\treasure-workbench\src\pages\PublishRecordsPage.jsx'
with io.open(f2, 'r', encoding='utf-8') as fh:
    c2 = fh.read()
c2 = c2.replace(
    "display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 6px',",
    "display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 2px',"
)
c2 = c2.replace(
    "display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0, padding: '4px 16px 2px'",
    "display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0, padding: '2px 16px 2px'"
)
with io.open(f2, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c2)
print('PublishRecordsPage OK')

# 3. OrdersPage: 账号筛选 padding 10px 16px 4px -> 4px 16px 2px, 排序 padding 6px 16px 2px -> 2px 16px 2px
f3 = r'E:\treasure-workbench\src\pages\OrdersPage.jsx'
with io.open(f3, 'r', encoding='utf-8') as fh:
    c3 = fh.read()
c3 = c3.replace(
    "display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch',",
    "display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 16px 2px',"
)
# Also fix the account filter padding
c3 = c3.replace(
    "padding: '10px 16px 4px', display: 'flex', gap: '6px', flexWrap: 'nowrap'",
    "padding: '4px 16px 2px', display: 'flex', gap: '6px', flexWrap: 'nowrap'"
)
c3 = c3.replace(
    "display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0, padding: '6px 16px 2px'",
    "display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0, padding: '2px 16px 2px'"
)
with io.open(f3, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c3)
print('OrdersPage OK')
