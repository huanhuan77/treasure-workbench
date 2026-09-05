// 文案去重：按内容去重（忽略空白差异），保留信息更完整的一方并合并双方状态。
//
// 背景：同一产品下会出现内容完全相同的多条文案，来源有两个：
//   1) loadData 曾用「种子文案按索引对齐」的方式合并，某下标用户无对应文案时会注入纯种子条目，
//      而种子内容可能与用户已导入的文案相同；
//   2) 云同步 mergeArrayById 按 id 取并集，本地去重删掉的条目若云端仍存在会被"复活"。
// 因此本地加载和云端合并两条路径都必须跑这个函数，只修一处无法根治。
export function dedupeCopies(copies) {
  if (!Array.isArray(copies) || copies.length < 2) return copies
  const score = (c) => (c && c.hasOrder ? 4 : 0) + (c && c.used ? 2 : 0) + (c && c.usedDate ? 1 : 0)
  const norm = (s) => (s || '').replace(/\s+/g, '')
  const out = []
  const index = new Map() // 内容 key -> 在 out 中的下标
  for (const c of copies) {
    if (!c) { out.push(c); continue }
    const k = norm(c.content)
    if (!k) { out.push(c); continue } // 空内容不参与去重
    if (!index.has(k)) { index.set(k, out.length); out.push(c); continue }
    const idx = index.get(k)
    const cur = out[idx]
    const keep = score(c) > score(cur) ? c : cur
    const other = keep === c ? cur : c
    out[idx] = {
      ...keep,
      used: keep.used || other.used,
      hasOrder: keep.hasOrder || other.hasOrder,
      usedDate: keep.usedDate || other.usedDate,
      title: keep.title || other.title,
      topics: (keep.topics && keep.topics.length) ? keep.topics : other.topics,
    }
  }
  return out
}

// 对整个产品列表做去重（返回新数组，未变化的产品保持原引用）
export function dedupeProducts(products) {
  if (!Array.isArray(products)) return products
  let changed = false
  const next = products.map((p) => {
    if (!p || !Array.isArray(p.copies)) return p
    const deduped = dedupeCopies(p.copies)
    if (deduped.length === p.copies.length) return p
    changed = true
    return { ...p, copies: deduped }
  })
  return changed ? next : products
}
