import io

p = 'src/store.jsx'
s = open(p, 'r', encoding='utf-8').read()

# 1) 删除旧的 jiebiwetSeed 块（无话题旧版，与 jiebitudushijinSeed 内容重复）
start = s.index('const jiebiwetSeed = [')
ms = s.index('.map((c, i) => ({', start)
end = s.index('}))', ms) + 3
tail = end
while tail < len(s) and s[tail] == '\n':
    tail += 1
s = s[:start] + s[tail:]

# 2) 把 jiebitudushijinSeed（带话题 10 条）重命名为 jiebiwetSeed 作为唯一来源
assert s.count('const jiebitudushijinSeed = [') == 1
s = s.replace('const jiebitudushijinSeed = [', 'const jiebiwetSeed = [', 1)

# 3) 产品列表：删除 p_jiebitudushijin 条目，p_jiebiwet 改名为「洁比兔 湿巾」
old_line = "    { id: 'p_jiebitudushijin', name: '洁比兔 湿巾', brand: '洁比兔', category: '其他', createdAt: Date.now(), copies: jiebitudushijinSeed },\n"
assert old_line in s, "p_jiebitudushijin 行未找到"
s = s.replace(old_line, '')
assert 'jiebitudushijinSeed' not in s, "仍有 jiebitudushijinSeed 残留"
old_p = "{ id: 'p_jiebiwet', name: '洁比兔湿厕纸', brand: '洁比兔', category: '其他', createdAt: Date.now(), copies: jiebiwetSeed },"
new_p = "{ id: 'p_jiebiwet', name: '洁比兔 湿巾', brand: '洁比兔', category: '其他', createdAt: Date.now(), copies: jiebiwetSeed },"
assert old_p in s
s = s.replace(old_p, new_p)

# 4) 交易记录名称统一为「洁比兔 湿巾」
s = s.replace("name:'洁比兔湿厕纸'", "name:'洁比兔 湿巾'")

# 5) 定义 consolidateJiebitudu（合并洁比兔湿巾/湿厕纸为同一产品）
func_def = '''// 合并洁比兔湿巾/湿厕纸为同一产品：用户曾分两条导入，按名称归一，避免重复显示
function consolidateJiebitudu(products) {
  const isJbt = (p) => p && /洁比兔/.test(p.name) && /(湿巾|湿厕纸)/.test(p.name)
  const out = []
  let merged = null
  for (const p of products) {
    if (!isJbt(p)) { out.push(p); continue }
    if (!merged) {
      merged = { ...p, name: '洁比兔 湿巾', copies: [...(p.copies || [])] }
    } else {
      const seen = new Set(merged.copies.map((c) => (c.content || '').replace(/\\s+/g, '')))
      for (const c of (p.copies || [])) {
        const key = (c.content || '').replace(/\\s+/g, '')
        if (!seen.has(key)) { merged.copies.push(c); seen.add(key) }
      }
    }
  }
  if (merged) out.push(merged)
  return out
}

'''
marker = 'function loadData() {'
assert marker in s
idx = s.index(marker)
s = s[:idx] + func_def + s[idx:]

# 6) 在 loadData 返回前调用 consolidateJiebitudu
ret_marker = '    return {\n      products: productsFinal,'
assert ret_marker in s
s = s.replace(ret_marker, '    productsFinal = consolidateJiebitudu(productsFinal)\n' + ret_marker, 1)

open(p, 'w', encoding='utf-8').write(s)
print('merge script done; jiebiwetSeed consts =', s.count('const jiebiwetSeed = ['))
