import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """        alert('识别到部分信息，请检查并手动补全。

原始识别文本：
' + text.substring(0, 500))"""

new = """        alert('识别到部分信息，请检查并手动补全。\\n\\n原始识别文本：\\n' + text.substring(0, 500))"""

c = c.replace(old, new)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
