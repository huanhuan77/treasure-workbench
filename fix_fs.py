import io
f = r'E:\treasure-workbench\src\components\DateFilterBar.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
c = c.replace(
    "padding: '4px 6px', borderRadius: 0, fontSize: '14px', fontWeight: 600, textAlign: 'center',",
    "padding: '4px 6px', borderRadius: 0, fontSize: '13px', fontWeight: 600, textAlign: 'center',"
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
