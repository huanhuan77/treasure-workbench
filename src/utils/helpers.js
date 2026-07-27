// 复制到剪贴板
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  // 降级方案
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// 格式化日期
export function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// 日期加 n 天，返回 YYYY-MM-DD（按本地日期解析，避免时区偏移）
export function addDays(dateStr, n) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// 计算天数差
export function daysDiff(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

// 距离截止时间描述
// 批量解析文案：按空行拆分；识别末尾标记
//   👍 = 出单（hasOrder，必然用过）   ✅ = 用过（used，未出单）
// 批量解析文案：按空行拆分；识别末尾标记
//   thumb-up(出单) / check(用过) 具体见 UI 导入说明
// 批量解析文案：按空行拆分；识别末尾标记与话题
//   thumb-up(出单) / check(用过) 具体见 UI 导入说明
//   结构：文案正文 + 末尾 👍/✅ 标记 + 可选 #话题 行（顺序任意，均自动剥离）
export function parseBulkCopies(text) {
  if (!text) return []
  const blocks = text.split(/\n\s*\n/)
  const out = []
  for (const raw of blocks) {
    let content = (raw || '').trim()
    if (!content) continue
    // 1) 先抽末尾话题行：#a #b #c（多个 # 标签，空格分隔）
    let topics = []
    const cl = content.split('\n')
    const lastLine = cl[cl.length - 1].trim()
    if (/^#\S+(\s+#\S+)+$/.test(lastLine)) {
      topics = lastLine.split(/\s+/)
      cl.pop()
      content = cl.join('\n').trim()
    }
    // 2) 再抽末尾标记
    const m = content.match(/[\s]*([\u2705\u{1F44D}])\s*$/u)
    let hasOrder = false
    let used = false
    if (m) {
      content = content.replace(/[\s]*[\u2705\u{1F44D}]\s*$/u, '').trim()
      if (m[1] === '\u2705') {
        used = true
      } else {
        hasOrder = true
        used = true
      }
    }
    out.push({ content, hasOrder, used, topics })
  }
  return out
}
export function deadlineDesc(deadline) {
  const d = daysDiff(deadline)
  if (d === null) return ''
  if (d < 0) return `已过期${-d}天`
  if (d === 0) return '今天截止'
  if (d === 1) return '明天截止'
  return `剩${d}天`
}
