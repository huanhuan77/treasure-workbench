import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

# Fix line 283 (index 282)
lines[282] = "        position: 'fixed', top: '0', left: '50%', transform: `translateX(-50%) translateY(calc(${-60 + pullDistance}px))`,\n"

# Fix lines 293-294 (index 292-293) - remove duplicate and fix
lines[292] = "          transform: refreshing ? 'rotate(360deg)' : `rotate(${pullDistance * 3}deg)`,\n"
lines[293] = ''  # remove the duplicate line

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.writelines(lines)
print('OK')
