import io
f = r'E:\treasure-workbench\src\pages\DashboardPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = """  const fLowPublish = useMemo(
    () => lowPublish.filter((s) => matchAcct(s, remindAccount)),
    [lowPublish, remindAccount],
  )"""

new = """  const fLowPublish = useMemo(
    () => lowPublish.filter((item) => remindAccount === 'all' || getAccounts(item.sample).includes(remindAccount)),
    [lowPublish, remindAccount],
  )"""

c = c.replace(old, new)
with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
