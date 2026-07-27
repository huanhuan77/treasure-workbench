p = 'src/store.jsx'
s = open(p, encoding='utf-8').read()
inner = open('/tmp/seed_arr.txt', encoding='utf-8').read().strip()

new_jiebiwet = (
    "const jiebiwetSeed = " + inner + ".map((c, i) => ({\n"
    "  id: 'p_jiebiwet_c' + (i + 1),\n"
    "  content: c.content,\n"
    "  title: generateTitle(c.content, '洁比兔 湿巾', '洁比兔', DEFAULT_SENSITIVE_WORDS),\n"
    "  topics: c.topics.length ? c.topics : generateTopics(c.content, '洁比兔 湿巾', '洁比兔', DEFAULT_SENSITIVE_WORDS),\n"
    "  style: '',\n"
    "  used: c.used,\n"
    "  usedDate: null,\n"
    "  hasOrder: c.hasOrder,\n"
    "  createdAt: Date.now(),\n"
    "}))\n\n"
)

consolidate_fn = (
    "// 合并重复产品：洁比兔湿巾 与 洁比兔湿厕纸 视为同一产品\n"
    "function consolidateJiebitudu(products) {\n"
    "  const norm = (x) => (x || '').replace(/\\s/g, '')\n"
    "  const isTarget = (name) => { const n = norm(name); return n.includes('洁比兔') && (n.includes('湿巾') || n.includes('湿厕纸')) }\n"
    "  const targets = (products || []).filter((pr) => isTarget(pr.name))\n"
    "  if (targets.length <= 1) {\n"
    "    targets.forEach((t) => { if (t.name !== '洁比兔 湿巾') t.name = '洁比兔 湿巾' })\n"
    "    return products\n"
    "  }\n"
    "  targets.sort((a, b) => (b.copies ? b.copies.length : 0) - (a.copies ? a.copies.length : 0))\n"
    "  const primary = targets[0]\n"
    "  primary.name = '洁比兔 湿巾'\n"
    "  const have = new Set((primary.copies || []).map((c) => (c.content || '').trim()))\n"
    "  for (const dup of targets.slice(1)) {\n"
    "    for (const c of (dup.copies || [])) {\n"
    "      const key = (c.content || '').trim()\n"
    "      if (key && !have.has(key)) { primary.copies.push(c); have.add(key) }\n"
    "    }\n"
    "  }\n"
    "  return products.filter((pr) => !targets.slice(1).includes(pr))\n"
    "}\n\n"
)

# 1) 删除 jiebitudushijinSeed 整块（从定义到 const defaultData 之前）
dd = s.index('const defaultData = {')
jbtd = s.index('const jiebitudushijinSeed = [')
assert jbtd < dd, 'order wrong'
s = s[:jbtd] + s[dd:]

# 2) 替换 jiebiwetSeed 整块（现为 const defaultData 前最后一个种子常量）
jb = s.index('const jiebiwetSeed = [')
dd2 = s.index('const defaultData = {')
end = s.rindex(']))', jb, dd2) + 3
s = s[:jb] + new_jiebiwet + s[end:]

# 3) 删除 jiebitudushijin 产品条目所在行
idx = s.index("id: 'p_jiebitudushijin'")
ls = s.rindex('\n', 0, idx) + 1
le = s.index('\n', idx) + 1
s = s[:ls] + s[le:]

# 4) 产品名 洁比兔湿厕纸 -> 洁比兔 湿巾
old_entry = "{ id: 'p_jiebiwet', name: '洁比兔湿厕纸', brand: '洁比兔', category: '其他', createdAt: Date.now(), copies: jiebiwetSeed },"
new_entry = "{ id: 'p_jiebiwet', name: '洁比兔 湿巾', brand: '洁比兔', category: '其他', createdAt: Date.now(), copies: jiebiwetSeed },"
assert old_entry in s, 'jiebiwet entry not found'
s = s.replace(old_entry, new_entry, 1)

# 5) 合并函数
assert 'function loadData() {' in s, 'loadData not found'
s = s.replace('function loadData() {', consolidate_fn + 'function loadData() {', 1)

# 6) 在 return 前调用
assert '    return {\n      products: productsFinal,' in s, 'return not found'
s = s.replace(
    '    return {\n      products: productsFinal,',
    '    productsFinal = consolidateJiebitudu(productsFinal)\n    return {\n      products: productsFinal,',
    1
)

open(p, 'w', encoding='utf-8').write(s)
print('merge applied; bytes =', len(s.encode('utf-8')))
