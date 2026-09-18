import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()
c = c.replace(
    'accept="image/*" capture="environment"',
    'accept="image/*"'
)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
