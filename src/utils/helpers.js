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
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
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
// 抽末尾话题行：#a #b #c（1 个或多个 # 标签，空格分隔）。命中则剥掉该行并返回话题数组
function takeTopicLine(content) {
  const cl = content.split('\n')
  const lastLine = cl[cl.length - 1].trim()
  if (/^#\S+(\s+#\S+)*$/.test(lastLine)) {
    cl.pop()
    return { topics: lastLine.split(/\s+/), rest: cl.join('\n').trim() }
  }
  return { topics: [], rest: content }
}

// 判断首行是否是「产品名表头」：
// 纯名词短语（品牌+品类），不含口语词/代词/动词，避免把文案第一句误当产品名
const COPY_LIKE_CHARS = /[你我他她它这那很真太怎么哪什么谁不没别就还也都了吗吧啊呢啦哟哦咋啥被让把给在从对于是有要会能懂跟和与上下去来吃用做玩拍想知看说写笑爱恨]/
function isProductNameHeader(line) {
  const s = (line || '').trim()
  if (!s || s.length < 2 || s.length > 12) return false
  if (s.includes('\n')) return false
  if (/[\u2705\u{1F44D}](?:[\u{FE0F}\u{1F3FB}-\u{1F3FF}])?/u.test(s)) return false
  if (/^#\S+(\s+#\S+)*$/.test(s)) return false
  if (/[。！？，；：、.!?,;:'"'"'()（）]/.test(s)) return false
  if (COPY_LIKE_CHARS.test(s)) return false  // 含口语/代词/动词 → 是文案不是产品名
  return true
}

export function parseBulkCopies(text) {
  if (!text) return []
  const _lines = text.split('\n')
  // 首行以「产品名称：」开头 → 去掉该行（用户显式标记产品名）
  if (_lines.length > 1 && /^\s*产品名称[：:]\s*/.test(_lines[0])) {
    text = _lines.slice(1).join('\n')
  }
  // 首行像产品名表头（纯名词短语）→ 去掉该行不入库
  else if (_lines.length > 1 && isProductNameHeader(_lines[0])) {
    text = _lines.slice(1).join('\n')
  }
  const blocks = text.split(/\n\s*\n/)

  // 末尾整块「仅剩一个话题行」（抽完话题+标记后内容为空）→ 视为全批共享话题
  let globalTopics = []
  if (blocks.length > 0) {
    const lastRaw = (blocks[blocks.length - 1] || '').trim()
    if (lastRaw) {
      const { topics, rest } = takeTopicLine(lastRaw)
      const stripped = rest.replace(/[\s]*[\u2705\u{1F44D}](?:[\u{FE0F}\u{1F3FB}-\u{1F3FF}])?\s*$/u, '').trim()
      if (topics.length > 0 && stripped === '') {
        globalTopics = topics
        blocks.pop()
      }
    }
  }

  const out = []
  for (const raw of blocks) {
    let content = (raw || '').trim()
    if (!content) continue
    const { topics, rest } = takeTopicLine(content)
    content = rest
    const m = content.match(/[\s]*([\u2705\u{1F44D}])(?:[\u{FE0F}\u{1F3FB}-\u{1F3FF}])?\s*$/u)
    let hasOrder = false
    let used = false
    if (m) {
      content = content.replace(/[\s]*[\u2705\u{1F44D}](?:[\u{FE0F}\u{1F3FB}-\u{1F3FF}])?\s*$/u, '').trim()
      if (m[1] === '\u2705') {
        used = true
      } else {
        hasOrder = true
        used = true
      }
    }
    const finalTopics = topics.length > 0 ? topics : globalTopics
    // 内容为空的「孤立标记/话题行」（如标记单独成行）：合并到上一条文案，不单独成条
    if (!content && out.length > 0) {
      const prev = out[out.length - 1]
      prev.hasOrder = prev.hasOrder || hasOrder
      prev.used = prev.used || used
      if (prev.topics.length === 0 && finalTopics.length > 0) prev.topics = finalTopics
      continue
    }
    if (!content) continue
    out.push({ content, hasOrder, used, topics: finalTopics })
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
