import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Fix setToast references
c = c.replace("setToast('识别完成，请确认信息后保存')", "alert('识别完成，请确认信息后保存')")
c = c.replace("setToast('识别失败，请手动输入')", "alert('识别失败，请手动输入')")

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
