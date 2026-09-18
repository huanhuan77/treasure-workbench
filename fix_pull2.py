import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

# Remove the garbage line 294 (index 293)
print(f"Before: {repr(lines[293])}")
lines[293] = ''
print(f"After: {repr(lines[293])}")

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.writelines(lines)
print('OK')
