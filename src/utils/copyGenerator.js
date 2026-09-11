// ════════════════════════════════════════════════════════
// 违规卡审词库（平台审核规则：贬低/歧视弱势群体、民族/种族/
// 国别/地域歧视、年龄/性别或特定人群歧视 → 扣分/罚没佣金/封号）
// 来源持续更新，命中后自动替换为安全表述
// ════════════════════════════════════════════════════════
export const DEFAULT_SENSITIVE_WORDS = [
  '平民',
  '黑奴',
  '医美',
  '800个前男友',
  '商战',
  '抠搜女大学生',
  '贫民窟女孩',
  '心机女',
  '狐媚子',
  '打工人',
  '大王',
]

// 安全替换映射（保持语义通顺的同时规避卡审）
const SAFE_REPLACES = {
  '平民': '普通人',
  '黑奴': '黑色人种',
  '医美': '护肤美容',
  '800个前男友': '前男友很多',
  '商战': '竞争',
  '抠搜女大学生': '精打细算女大学生',
  '贫民窟女孩': '经济型女孩',
  '心机女': '聪明女孩',
  '狐媚子': '迷人女孩',
  '打工人': '勤奋人',
  '大王': '大哥',
}

/**
 * 清洗文本中的违规卡审词
 * @param {string} text - 待清洗文本
 * @returns {{ clean: string, hits: string[] }} clean=清洗后文本, hits=命中的原始词
 */
export function sanitizeText(text, words = DEFAULT_SENSITIVE_WORDS) {
  if (!text) return { clean: text || '', hits: [] }
  let result = text
  const hits = []
  for (const word of words) {
    if (result.includes(word)) {
      hits.push(word)
      result = result.replaceAll(word, SAFE_REPLACES[word] || '**')
    }
  }
  return { clean: result, hits }
}

/** 快速检测是否包含违规词（用于输入时实时提示） */
export function checkSensitive(text, words = DEFAULT_SENSITIVE_WORDS) {
  if (!text) return []
  const found = []
  for (const word of words) {
    if (text.includes(word)) found.push(word)
  }
  return found
}

// 关键词提取
// 从文案内容中提取关键词，用于生成热门话题（默认 5 个）
function extractKeywords(text) {
  if (!text) return []
  const clean = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
  const stopWords = new Set([
    '这个', '那个', '是', '的', '了', '在', '有', '和', '就', '不', '人', '都', '一', '一个',
    '很', '也', '会', '要', '对', '可以', '没', '到', '说', '还', '但', '如果', '因为', '什么',
    '自己', '我们', '你们', '他们', '它', '她', '他', '这', '那', '哪', '啊', '吧', '呢', '嘛',
    '真的', '感觉', '觉得', '知道', '想', '看', '用', '做', '去', '来', '能', '让', '把', '被',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'to', 'in',
  ])
  const cnMatches = clean.match(/[\u4e00-\u9fa5]{2,6}/g) || []
  const enMatches = clean.match(/[a-zA-Z]{3,}/g) || []
  const freq = {}
  for (const w of cnMatches) {
    if (!stopWords.has(w) && w.length >= 2) { freq[w] = (freq[w] || 0) + 1 }
  }
  for (const w of enMatches) {
    const lw = w.toLowerCase()
    if (!stopWords.has(lw)) { freq[lw] = (freq[lw] || 0) + 1 }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w)
}

// 组合「品牌 + 产品名」：洁比兔 + 湿巾 = 洁比兔湿巾
// 若产品名已以品牌开头（如 olly女维 / OLLY），则不再重复拼接，避免大小写重复
function fullNameOf(name, brand) {
  const n = (name || '').trim()
  const b = (brand || '').trim()
  if (!b) return ''  // 无品牌：不提及产品名，改用通用词
  if (n.toLowerCase().startsWith(b.toLowerCase())) return n
  return b + n
}

// 生成话题（提及品牌 + 产品名，格式 #品牌产品名#）
export function generateTopics(content, productName, brand, sensitiveWords) {
  if (!content) return []
  const keywords = extractKeywords(content)
  const full = fullNameOf(productName, brand)
  const pName = full || '好物'
  const topicTemplates = [
    `#${pName}#`, `#${pName}测评#`, `#${pName}推荐#`, `#${pName}种草#`,
    `#${pName}开箱#`, `#${pName}真实测评#`, `#${pName}怎么样#`,
    `#${pName}好物分享#`, `#${pName}必买#`, `#${pName}平价好物#`,
    `#${pName}使用心得#`, `#${pName}宅藏单品#`, `#${pName}无限回购#`,
    `#${pName}${keywords[0] || '推荐'}#`, `#${pName}${keywords[0] || '好物'}#`,
  ]
  const unique = [...new Set(topicTemplates)]
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unique[i], unique[j]] = [unique[j], unique[i]]
  }
  let topics = unique.slice(0, 5)
  // 清洗后重新拆分回数组（话题格式 #xxx# 不受影响）
  return topics.map((t) => {
    const r = sanitizeText(t, sensitiveWords)
    return r.clean
  })
}

const styles = {
  '种草': {
    prefix: ['姐妹们！', '家人们！', '崽崽们！', '姐妹们冲！'],
    suffix: ['真的绝了，闭眼入！', '不好用你来找我！', '谁用谁知道！', '按头安利给大家！'],
    middle: ['这个', '真的是我', '用下来感受就是', '太绝了吧'],
  },
  '开箱': {
    prefix: ['今天给大家开箱', '终于等到', '快递到了！来开箱', '买了好久的'],
    suffix: ['一起看看吧～', '开箱实测来了！', '话不多说直接看', '详细测评往下看'],
    middle: ['拆开看看', '包装质感', '上手体验', '细节实拍'],
  },
  '避坑': {
    prefix: ['避坑预警！', '买之前先看这个', '别急着下单！', '说句大实话'],
    suffix: ['建议先收藏！', '看完再决定！', '别花冤枉钱！', '理性种草！'],
    middle: ['说实话', '要注意的是', '缺点也说说', '优缺点分析'],
  },
  '清单': {
    prefix: ['博主私藏清单！', '好物清单来啦！', '盘点一下', '我的爱用物'],
    suffix: ['码住不乱！', '记得点收藏！', '照着买不出错', '清单已整理好'],
    middle: ['第一个推荐', '第二个是', '必备好物', '清单奉上'],
  },
  '情绪': {
    prefix: ['救命啊！', '啊啊啊啊', '我真的会谢', '谁懂啊'],
    suffix: ['真的会谢！', '爱到不行！', '封神了！', '哭死也太好了吧'],
    middle: ['我真的', '简直不要太', '好用到哭', '绝绝子'],
  },
  '测评': {
    prefix: ['深度测评！', '实测', '专业测评', '硬核评测'],
    suffix: ['数据说话', '优缺点结', '客观评价', '建议收藏'],
    middle: ['从几个维度', '实测结果', '对比分析', '结论先行'],
  },
}

export function getStyles() { return Object.keys(styles) }

// 生成相似文案（提及品牌 + 产品名）
export function generateSimilarCopy(content, productName, brand, style = '种草', sensitiveWords) {
  if (!content) return ''
  const s = styles[style] || styles['种草']
  const keywords = extractKeywords(content)
  const full = fullNameOf(productName, brand)
  const pName = full || ''
  const prefix = s.prefix[Math.floor(Math.random() * s.prefix.length)]
  const suffix = s.suffix[Math.floor(Math.random() * s.suffix.length)]
  const kw1 = keywords[0] || '质感'
  const kw2 = keywords[1] || '体验'
  const sentences = content.split(/[\u3002\uff01\uff1c\n.!?]/).filter((s) => s.trim().length > 8)
  const highlight = sentences.length > 0
    ? sentences[Math.floor(Math.random() * sentences.length)].trim()
    : `${kw1}和${kw2}都在线`
  let raw = `${prefix}${pName}${s.middle[0]}${highlight}，${kw1}方面真的能打，${kw2}也超出预期。${suffix}`
  return sanitizeText(raw, sensitiveWords).clean
}
