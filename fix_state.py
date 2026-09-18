import io
f = r'E:\treasure-workbench\src\pages\DashboardPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

c = c.replace(
    "const [checking, setChecking] = useState(false)",
    "const [checking, setChecking] = useState(false)\n  const [showAllLow, setShowAllLow] = useState(false)"
)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
