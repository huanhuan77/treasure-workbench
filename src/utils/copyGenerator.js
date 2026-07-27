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
// 从文案内容中提取关键词，用于生成标题 + 热门话题（默认 5 个）
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

// 生成标题：三类风格（闺蜜唠嗑 / 痛点种草 / 情绪共情）
// 从文案真实内容里抽取卖点短语织进标题，让标题与内容强相关；
// 按产品领域选场景词，杜绝「香水套湿巾 / 女生套男品」等牛头不对马嘴；
// 私密叙事（被追问…）仅作可选风格、且仅香氛类才用香水梗
function inferDomain(name, content) {
  const t = ((name || '') + ' ' + (content || '')).toLowerCase()
  if (/膜|霜|乳|精华|护肤|修护|油敏|面霜|眼霜|爽肤/.test(t)) return 'skincare'
  if (/维|褪黑|祛湿|益生菌|健脾|养生|保健|静心|清清|噗噗|通/.test(t)) return 'health'
  if (/咖啡|茶|饮|润喉糖|食品|奶/.test(t)) return 'food'
  if (/睫毛|胶水|妆|眉|口红|眼线/.test(t)) return 'beauty'
  if (/湿巾|香|洗|护|洁|口气|沐浴/.test(t)) return 'scent'
  return 'default'
}

// 每个领域的情绪_adj（用于闺蜜唠嗑风）与是否偏女性受众
const TITLE_FILL = {
  scent:    { adj: '香',     female: true,  feel: '清爽舒适', benefit: '清新气息' },
  health:   { adj: '状态好',  female: false, feel: '舒服自在', benefit: '身体轻松' },
  skincare: { adj: '皮肤稳',  female: true,  feel: '水润舒服', benefit: '肌肤稳定' },
  food:     { adj: '精神',    female: false, feel: '暖身舒服', benefit: '状态在线' },
  beauty:   { adj: '眼睛亮',  female: true,  feel: '精致省心', benefit: '根根分明' },
  default:  { adj: '状态好',  female: false, feel: '舒服自在', benefit: '状态变好' },
}

// 从文案中抽取「卖点短语」：优先短小、带利益/痛点词的陈述句，截到最后一个卖点词结束
const BENEFIT_WORDS = ['舒服','清爽','自然','稳定','透亮','细腻','温柔','治愈','安心','明显','柔软','干净','温和','便利','便携','轻盈','水润','舒缓','好闻','去异味','不黏','透气','省心','精致','自在','红润','精神','在线','状态','绝','亮','香','美','闪','自由']
const PAIN_WORDS = ['去','告别','拯救','解决','不再','没','无','不卡粉','根根分明']

function extractHook(content) {
  if (!content) return ''
  const raw = content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
  // 同时按句号与逗号分句，避免一整段被当成一句而抽不到短卖点
  const sentences = raw.split(/[。！？!?；;，,、]/).map((s) => s.trim()).filter((s) => s.length >= 6 && s.length <= 22)
  if (!sentences.length) return ''
  let best = '', bestScore = -1
  for (const s of sentences) {
    if (s.includes('？') || s.includes('?') || s.includes('吗')) continue
    let score = 0
    for (const w of BENEFIT_WORDS) if (s.includes(w)) score += 2
    for (const w of PAIN_WORDS) if (s.includes(w)) score += 1
    if (score <= 0) continue
    score -= Math.max(0, s.length - 12)
    if (score > bestScore) { bestScore = score; best = s }
  }
  if (!best) return ''
  // 截到最后一个卖点/痛点词结束；若仍超 16 字，回退到 16 字内最后一个卖点词，杜绝半截词
  let cut = -1
  for (const w of [...BENEFIT_WORDS, ...PAIN_WORDS]) {
    const i = best.lastIndexOf(w)
    if (i !== -1) cut = Math.max(cut, i + w.length)
  }
  let phrase = cut > 0 ? best.slice(0, cut) : best
  if (phrase.length > 16) {
    let alt = -1
    for (const w of [...BENEFIT_WORDS, ...PAIN_WORDS]) {
      const i = best.lastIndexOf(w)
      if (i !== -1 && i + w.length <= 16) alt = Math.max(alt, i + w.length)
    }
    phrase = alt > 0 ? best.slice(0, alt) : phrase.slice(0, 16)
  }
  return phrase
}

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

// 构建标题候选池（与产品名、品牌、内容卖点相关，但尚不确定选哪条）
function buildTitleCandidates(content, productName, brand) {
  if (!content) return []
  const full = fullNameOf(productName, brand)
  const product = full || productName || '这款好物'
  const domain = inferDomain(productName, content)
  const fill = TITLE_FILL[domain] || TITLE_FILL.default
  // 抽取前先剥掉产品名与品牌，避免「润喉糖」里的「润」之类的品牌字被误当卖点
  const stripped = (brand ? content.split(brand).join(' ') : content).split(product).join(' ')
  const hook = extractHook(stripped) || fill.benefit
  const isFragrance = /香|蔓越莓|果香|清香|氛|香水/.test((productName || '') + ' ' + (content || ''))
  const chat = [
    (domain === 'scent' && isFragrance)
      ? `被男朋友追问喷了什么香水，其实只是用了${product}`
      : `被闺蜜追着问最近怎么这么${fill.adj}，其实只是悄悄用上了${product}`,
    `以为我偷偷卷了，其实只是随身带着${product}`,
    `同事说我最近${fill.adj}，其实只是坚持用${product}`,
    `${product}真是我的心机小物件，谁用谁知道`,
  ]
  const seed = [
    `${product}，${hook}`,
    `随手用就离不开的${product}，${hook}`,
    `${hook}，${product}真的可以闭眼入`,
    `日常常备${product}，${fill.feel}，${hook}`,
  ]
  const femTail = fill.female ? '女生别错过' : '闭眼入就对了'
  const mood = [
    `悄悄提升幸福感的${product}，${hook}`,
    `懂生活的人都在用${product}，${hook}`,
    `把仪式感拉满的${product}，${fill.female ? '治愈每个平凡日常' : '治愈每个日常'}`,
    `温柔又自在的${product}，${femTail}`,
  ]
  return [...chat, ...seed, ...mood]
}

export function generateTitle(content, productName, brand, sensitiveWords) {
  const candidates = buildTitleCandidates(content, productName, brand)
  if (candidates.length === 0) return ''
  // 基于内容+产品名稳定选一条（同一内容始终得到同一标题，便于导入/编辑时保持一致）
  const product = fullNameOf(productName, brand) || productName || '这款好物'
  const title = candidates[hashStr((content || '') + '|' + product) % candidates.length]
  return sanitizeText(title, sensitiveWords).clean
}

// 重新生成标题：从同一候选池里随机挑一条，且尽量不同于当前标题（用于「↻ 重新生成标题」）
export function regenerateTitle(content, productName, brand, sensitiveWords, currentTitle) {
  const candidates = buildTitleCandidates(content, productName, brand)
  if (candidates.length === 0) return ''
  const pool = currentTitle ? candidates.filter((t) => t !== currentTitle) : candidates
  const finalPool = pool.length > 0 ? pool : candidates
  const pick = finalPool[Math.floor(Math.random() * finalPool.length)]
  return sanitizeText(pick, sensitiveWords).clean
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
  const { clean: cleaned } = sanitizeText(topics.join(' '), sensitiveWords)
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

// 把标题 + 话题拼成可一键复制的文本
export function buildTitleWithTopics(title, topics) {
  return `${title}\n${topics.join(' ')}`
}
