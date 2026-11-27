// 思辨训练合集：书单 + 访谈片单 + 自检三问（PC 与手机端共用）
//
// 存储沿用旧 key `reading_growth_v1`（已在云备份 / 同步清单里登记，无需再加 key），
// 内部结构由旧的 { items: [] } 升级为 { books: [], shows: [] }。
// 读到旧结构（含 items）或异常时，兜底为新预置清单，不迁移旧条目。

export const READING_KEY = 'reading_growth_v1'

// 书单分组（顺序即展示顺序）
export const BOOK_GROUPS = [
  { key: 'logic', title: '逻辑与分辨信息', hint: '建立判断工具，优先读' },
  { key: 'self', title: '认清自我、稳定内核', hint: '' },
  { key: 'perspective', title: '拓展视角', hint: '不要用来找标准答案，用来对照不同人的想法' },
]

// 自检三问：看书、看访谈每期 / 每章必问
export const SELF_QUESTIONS = [
  '核心观点是什么？',
  '支撑这个观点的经历 / 证据是什么？',
  '这个观点，有哪些局限、不适用于我的地方？',
]

// 预置书单：group 对应 BOOK_GROUPS.key
const BOOK_SEED = [
  {
    group: 'logic', title: '《学会提问》',
    focus: '入门首选。教你拆解论证，识别话术、偷换概念、证据漏洞，刚好解决“别人一说我就动摇”',
  },
  {
    group: 'logic', title: '《超越感觉》',
    focus: '区分感受和论证，很多人混淆“我觉得”和“事实就是这样”，这本书针对性很强',
  },
  {
    group: 'logic', title: '《思考，快与慢》',
    focus: '看懂自己大脑的本能偏见——我们天然就容易盲从、跟风、被情绪劫持，知道弱点才好控制',
  },
  {
    group: 'self', title: '《被讨厌的勇气》',
    focus: '帮你分清“别人的课题、我的课题”，别人的评价、看法是别人的事，不必拿来推翻自己',
  },
  {
    group: 'self', title: '《少有人走的路》',
    focus: '关于心智成熟，如何建立属于自己的价值体系',
  },
  {
    group: 'perspective', title: '《人类简史》',
    focus: '拉长时间维度，很多当下大家笃定的观念，只是特定时代的产物',
  },
  {
    group: 'perspective', title: '《你当像鸟飞往你的山》',
    focus: '看一个人如何挣脱原生环境的固有认知，一点点构建自己',
  },
]

// 预置访谈片单
const SHOW_SEED = [
  { program: '岩中花述', episode: 'S9E4 鲁豫×蒙曼', platform: '小宇宙（音频）', focus: '区分个人选择和普适道理，学习接纳与人生选择' },
  { program: '岩中花述', episode: 'S9E8 鲁豫×庆山（安妮宝贝）', platform: '小宇宙（音频）', focus: '校验他人和解路径，思考是否适配自己处境' },
  { program: '岩中花述', episode: 'S9E7 鲁豫×芮迺伟', platform: '小宇宙（音频）', focus: '观察如何顶住外界声音，守住自我选择' },
  { program: '鲁豫有约（旧版）', episode: '鲁豫×陈嘉映', platform: '凤凰视频，B站搜片段', focus: '探讨良好生活、成功焦虑，避开情绪裹挟' },
  { program: '慢谈', episode: '陈鲁豫', platform: 'B站独播', focus: '分辨经验分享和通用判断标准，警惕共情上头' },
  { program: '新世相 张伟播客', episode: '张伟×王潮歌、周轶君', platform: '腾讯视频，小宇宙音频', focus: '对比两种生命态度，理解观点无唯一标准答案' },
  { program: '新世相 张伟播客', episode: '张伟×思文、陆庆屹', platform: '腾讯视频，小宇宙音频', focus: '区分打动你的是逻辑论证，还是情绪共鸣' },
  { program: '新世相 张伟播客', episode: '张伟×田沁鑫', platform: '腾讯视频，小宇宙音频', focus: '练习接纳两难取舍，接受没有完美解法' },
  { program: '圆桌派（优先1-4季）', episode: '边界（李松蔚、周轶君、许子东）', platform: '优酷独播', focus: '理清人际边界，不全盘接收别人的看法' },
  { program: '圆桌派（优先1-4季）', episode: '误读', platform: '优酷独播', focus: '识别语言隐藏预设，看懂分歧来源' },
  { program: '圆桌派（优先1-4季）', episode: '规则', platform: '优酷独播', focus: '多角度看待明规则、潜规则与人情' },
  { program: '圆桌派（优先1-4季）', episode: '亲情', platform: '优酷独播', focus: '分清他人对原生家庭的看法≠你的标准答案' },
  { program: '十三邀', episode: '许知远×陈嘉映', platform: '腾讯视频独播', focus: '拆解论证逻辑，思考何为良好生活' },
  { program: '十三邀', episode: '许知远×周轶君', platform: '腾讯视频独播', focus: '学习冷静克制的教育、人生视角' },
  { program: '十三邀', episode: '许知远×唐诺', platform: '腾讯视频独播', focus: '分辨哪些价值观点可以吸收，哪些只是个人偏好' },
]

const emptyAnswers = () => ({ q1: '', q2: '', q3: '' })

// 生成预置数据（每条带独立的打卡 / 感悟 / 三问回答字段）
export function defaultData() {
  return {
    books: BOOK_SEED.map((b, i) => ({
      id: `book-${i + 1}`,
      group: b.group,
      title: b.title,
      focus: b.focus,
      done: false,
      note: '',
      answers: emptyAnswers(),
    })),
    shows: SHOW_SEED.map((s, i) => ({
      id: `show-${i + 1}`,
      program: s.program,
      episode: s.episode,
      platform: s.platform,
      focus: s.focus,
      done: false,
      note: '',
      answers: emptyAnswers(),
    })),
  }
}

// 读取并合并：预置为基准，本地同 id 保留打卡 / 感悟 / 三问；旧 items 结构或异常 → 新预置
export function loadData() {
  const seed = defaultData()
  try {
    const raw = localStorage.getItem(READING_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw)
    // 旧结构：只有 items，没有 books/shows → 直接用新预置
    if (!parsed || (!Array.isArray(parsed.books) && !Array.isArray(parsed.shows))) return seed

    const mergeList = (seedList, localList) => {
      const byId = new Map((localList || []).filter(Boolean).map((x) => [x.id, x]))
      const merged = seedList.map((item) => {
        const exist = byId.get(item.id)
        if (!exist) return item
        return {
          ...item,
          done: !!exist.done,
          note: exist.note || '',
          answers: { ...emptyAnswers(), ...(exist.answers || {}) },
        }
      })
      // 本地有、预置已不含的自定义条目，一并保留（固定清单下一般不会出现）
      const seedIds = new Set(seedList.map((x) => x.id))
      ;(localList || []).filter((x) => x && !seedIds.has(x.id)).forEach((x) => merged.push(x))
      return merged
    }

    return {
      books: mergeList(seed.books, parsed.books),
      shows: mergeList(seed.shows, parsed.shows),
    }
  } catch (e) {
    console.warn('[reading-thinking] load 失败', e)
    return seed
  }
}

export function saveData(data) {
  localStorage.setItem(READING_KEY, JSON.stringify(data))
}

// 完成度统计
export function progressOf(data) {
  const books = data.books || []
  const shows = data.shows || []
  const total = books.length + shows.length
  const done = books.filter((b) => b.done).length + shows.filter((s) => s.done).length
  return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
}
