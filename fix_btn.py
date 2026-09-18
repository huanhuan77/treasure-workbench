import io
f = r'E:\treasure-workbench\src\pages\DashboardPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

c = c.replace(
    "background: '#8b5cf6', color: '#fff',\n                fontSize: '12px', fontWeight: 600, cursor: 'pointer',\n              }}>补发布",
    "background: '#ec4899', color: '#fff',\n                fontSize: '12px', fontWeight: 600, cursor: 'pointer',\n              }}>补发布"
)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
