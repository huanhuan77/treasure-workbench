// 读取本地文本文件（.txt / .md）
// Windows 记事本存的中文 txt 常见 GBK 编码，直接 file.text() 会乱码 ——
// 先用 UTF-8 严格解码，失败再退回 GBK，最后兜底宽松 UTF-8。
export async function readTextFile(file) {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch (e) {
    try {
      return new TextDecoder('gbk').decode(buf)
    } catch (e2) {
      return new TextDecoder('utf-8').decode(buf)
    }
  }
}

// 把文件内容整理成「空行分段」的形式：
//   · 已经有了空行分段 → 原样返回（按段落 = 多条文案）
//   · 只有单个换行、且不止一行 → 认为「一行一条」，转成空行分隔
// 不然一份「每行一条」的 txt 会被解析成一大条文案（用户要求「识别」）。
export function normalizeForCopies(text) {
  const t = String(text || '').replace(/\r\n?/g, '\n').trim()
  if (!t) return ''
  if (/\n\s*\n/.test(t)) return t
  const lines = t.split('\n').map((s) => s.trim()).filter(Boolean)
  if (lines.length <= 1) return t
  return lines.join('\n\n')
}

// 一次读多个文件，逐份整理成空行分段，再用空行拼接
export async function readTextFiles(files) {
  const list = [...(files || [])]
  const texts = []
  for (const f of list) texts.push(normalizeForCopies(await readTextFile(f)))
  return texts.filter(Boolean).join('\n\n').trim()
}
