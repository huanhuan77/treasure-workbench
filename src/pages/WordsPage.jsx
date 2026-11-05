import { useState, useEffect, useMemo } from 'react'

const FALLBACK_POOL = [
  { w: "abundant", ph: "/əˈbʌndənt/", pos: "adj.", m: "丰富的，充裕的",
    ex: "The region has abundant natural resources.", cn: "该地区自然资源丰富。",
    tip: "abound（充满）+ ant → 充满的 → 丰富的。" },
  { w: "accelerate", ph: "/əkˈseləreɪt/", pos: "v.", m: "加速，促进",
    ex: "The car accelerated to overtake the truck.", cn: "汽车加速超过卡车。",
    tip: "ac（加强）+ celer（快）+ ate → 加快。反义 decelerate 减速。" },
  { w: "compromise", ph: "/ˈkɒmprəmaɪz/", pos: "v./n.", m: "妥协，折中；危及",
    ex: "We had to compromise on the price.", cn: "我们不得不在价格上妥协。",
    tip: "com（共同）+ promise（承诺）→ 各让一步 → 妥协。" },
  { w: "dilemma", ph: "/dɪˈlemə/", pos: "n.", m: "进退两难的困境",
    ex: "She faced the dilemma of choosing between career and family.", cn: "她面临事业与家庭的两难。",
    tip: "di（两个）+ lemma（假设）→ 两个假设都不好 → 两难。" },
  { w: "eliminate", ph: "/ɪˈlɪmɪneɪt/", pos: "v.", m: "消除，排除；淘汰",
    ex: "The team was eliminated in the first round.", cn: "该队在第一轮被淘汰。",
    tip: "e（出）+ limin（门槛）+ ate → 扫地出门 → 消除。" },
  { w: "genuine", ph: "/ˈdʒenjuɪn/", pos: "adj.", m: "真的；真诚的",
    ex: "Her smile looked genuine.", cn: "她的微笑看起来很真诚。",
    tip: "词根 gen（出生/基因）→ 原生的 → 真的。反义 artificial。" },
  { w: "hierarchy", ph: "/ˈhaɪərɑːki/", pos: "n.", m: "等级制度，层级",
    ex: "There is a strict hierarchy in the company.", cn: "公司里有严格的等级制度。",
    tip: "hier（神圣）+ archy（统治）→ 神圣的统治秩序 → 等级。" },
  { w: "inevitable", ph: "/ɪnˈevɪtəbl/", pos: "adj.", m: "不可避免的",
    ex: "Change is inevitable in life.", cn: "生活中变化是不可避免的。",
    tip: "in（不）+ evit（避免）+ able → 不能避免的。" },
  { w: "perspective", ph: "/pəˈspektɪv/", pos: "n.", m: "视角，观点；透视法",
    ex: "Try to see it from a different perspective.", cn: "试着从不同角度看这件事。",
    tip: "per（贯穿）+ spect（看）+ ive → 看透 → 视角。" },
  { w: "substantial", ph: "/səbˈstænʃl/", pos: "adj.", m: "大量的；结实的；实质的",
    ex: "The building is a substantial structure.", cn: "这座建筑结构坚固。",
    tip: "sub（下面）+ stan（站）+ tial → 站得住的 → 结实的。" },
  { w: "ambiguous", ph: "/æmˈbɪɡjuəs/", pos: "adj.", m: "模棱两可的，含糊的",
    ex: "His ambiguous reply made her unsure what to do.", cn: "他模棱两可的回复让她拿不定主意。",
    tip: "ambi（两个）+ gu（驱动）+ ous → 两种走向都可解释 → 含糊。" },
  { w: "cautious", ph: "/ˈkɔːʃəs/", pos: "adj.", m: "小心的，谨慎的",
    ex: "Be cautious when crossing the busy street.", cn: "过这条繁忙马路时要小心。",
    tip: "caut（小心，同 caution）+ ious → 处处留神。别和 curious（好奇）混。" },
  { w: "dedicate", ph: "/ˈdedɪkeɪt/", pos: "v.", m: "致力于，献身；献给",
    ex: "She dedicated her life to helping the poor.", cn: "她毕生致力于帮助穷人。",
    tip: "de（加强）+ dic（宣告）+ ate → 公开宣告投入 → 奉献。" },
  { w: "evident", ph: "/ˈevɪdənt/", pos: "adj.", m: "明显的，明白的",
    ex: "It was evident that she had been crying.", cn: "很明显她刚哭过。",
    tip: "e（出）+ vid（看）+ ent → 一眼看出 → 明显。名词 evidence。" },
  { w: "fragile", ph: "/ˈfrædʒaɪl/", pos: "adj.", m: "易碎的；脆弱的",
    ex: "The fragile packages must be handled with care.", cn: "这些易碎包裹必须轻拿轻放。",
    tip: "frag（打碎，同 fraction）+ ile（易…的）→ 容易碎的。" },
  { w: "hesitate", ph: "/ˈhezɪteɪt/", pos: "v.", m: "犹豫，踌躇",
    ex: "Don't hesitate to call me if you need help.", cn: "需要帮忙就尽管打电话，别犹豫。",
    tip: "haes（粘，同 adhesive）+ itate → 脚粘住迈不开 → 犹豫。" },
  { w: "immense", ph: "/ɪˈmens/", pos: "adj.", m: "巨大的，广大的",
    ex: "The project requires an immense amount of time.", cn: "这个项目需要极其多的时间。",
    tip: "im（不）+ mens（测量，同 measure）→ 大到没法测量。" },
  { w: "justify", ph: "/ˈdʒʌstɪfaɪ/", pos: "v.", m: "证明…正当；为…辩护",
    ex: "Nothing can justify such rudeness.", cn: "无论什么理由都不能为这种粗鲁开脱。",
    tip: "just（正当）+ ify（使…）→ 使显得正当。名词 justification。" },
  { w: "prominent", ph: "/ˈprɒmɪnənt/", pos: "adj.", m: "突出的，杰出的；显著的",
    ex: "She is a prominent scientist in her field.", cn: "她是所在领域杰出的科学家。",
    tip: "pro（向前）+ min（突出）+ ent → 向前伸出来 → 显眼。" },
  { w: "vanish", ph: "/ˈvænɪʃ/", pos: "v.", m: "突然消失，绝迹",
    ex: "The magician made the rabbit vanish.", cn: "魔术师让兔子消失了。",
    tip: "van（空，同 empty、vain）+ ish → 变得空空如也 → 消失。" },
  { w: "abolish", ph: "/əˈbɒlɪʃ/", pos: "v.", m: "废除，取消",
    ex: "The government decided to abolish the old law.", cn: "政府决定废除旧法律。",
    tip: "ab（离开）+ ol（生长）+ ish → 让不再生长 → 废除。" },
  { w: "accumulate", ph: "/əˈkjuːmjəleɪt/", pos: "v.", m: "积累，积聚",
    ex: "He accumulated a fortune over the years.", cn: "他多年来积攒了一笔财富。",
    tip: "ac（加强）+ cumul（堆积）+ ate → 不断堆积 → 积累。" },
  { w: "advocate", ph: "/ˈædvəkeɪt/", pos: "v./n.", m: "提倡；支持者",
    ex: "Many doctors advocate a balanced diet.", cn: "许多医生提倡均衡饮食。",
    tip: "ad（加强）+ voc（叫喊）+ ate → 大声呼吁 → 提倡。" },
  { w: "aspire", ph: "/əˈspaɪə(r)/", pos: "v.", m: "渴望，有志于",
    ex: "She aspires to become a doctor.", cn: "她立志当一名医生。",
    tip: "a（向）+ spire（呼吸）→ 向往地呼吸 → 渴望。" },
  { w: "authentic", ph: "/ɔːˈθentɪk/", pos: "adj.", m: "真实的，正宗的",
    ex: "Is this an authentic Chinese restaurant?", cn: "这是正宗的中餐馆吗？",
    tip: "auth（自己）+ entic → 一手的、原作的 → 真实的。" },
  { w: "beneficial", ph: "/ˌbenɪˈfɪʃl/", pos: "adj.", m: "有益的，有利的",
    ex: "Exercise is beneficial to health.", cn: "运动有益健康。",
    tip: "bene（好）+ fic（做）+ ial → 做好事的 → 有益的。" },
  { w: "circulate", ph: "/ˈsɜːkjəleɪt/", pos: "v.", m: "循环，流通；传播",
    ex: "Blood circulates through the body.", cn: "血液在体内循环。",
    tip: "circ（圆）+ ul + ate → 绕圈走 → 循环。" },
  { w: "comprehensive", ph: "/ˌkɒmprɪˈhensɪv/", pos: "adj.", m: "全面的，综合的",
    ex: "We need a comprehensive plan.", cn: "我们需要一个全面的计划。",
    tip: "com（完全）+ prehens（抓住）+ ive → 全部抓住 → 全面的。" },
  { w: "conceive", ph: "/kənˈsiːv/", pos: "v.", m: "构想；怀孕",
    ex: "He conceived a bold plan.", cn: "他构想出一个大胆的计划。",
    tip: "con（一起）+ ceive（拿）→ 把想法拿来 → 构想。" },
  { w: "confront", ph: "/kənˈfrʌnt/", pos: "v.", m: "面对，遭遇",
    ex: "We must confront the problem.", cn: "我们必须直面这个问题。",
    tip: "con（一起）+ front（前面）→ 面对面 → 对抗。" },
  { w: "consensus", ph: "/kənˈsensəs/", pos: "n.", m: "一致意见，共识",
    ex: "They reached a consensus after hours of debate.", cn: "经过数小时辩论他们达成了共识。",
    tip: "con（共同）+ sens（感觉）+ us → 共同感觉 → 共识。" },
  { w: "contemplate", ph: "/ˈkɒntəmpleɪt/", pos: "v.", m: "深思；凝视",
    ex: "She sat quietly, contemplating her future.", cn: "她静静坐着思考未来。",
    tip: "con（加强）+ templ（神庙）+ ate → 在神庙里凝神 → 沉思。" },
  { w: "crucial", ph: "/ˈkruːʃl/", pos: "adj.", m: "至关重要的，决定性的",
    ex: "This is a crucial moment.", cn: "这是关键时刻。",
    tip: "cruc（十字）+ ial → 十字路口 → 决定性的。" },
  { w: "diminish", ph: "/dɪˈmɪnɪʃ/", pos: "v.", m: "减少，缩小",
    ex: "The pain gradually diminished.", cn: "疼痛逐渐减轻了。",
    tip: "di（离开）+ min（小）+ ish → 变小 → 减少。" },
  { w: "elaborate", ph: "/ɪˈlæbərət/", pos: "adj./v.", m: "详尽的；详细说明",
    ex: "Could you elaborate on your plan?", cn: "你能详细说明一下计划吗？",
    tip: "e（出）+ labor（劳动）+ ate → 付出更多劳动 → 详尽。" },
  { w: "endeavor", ph: "/ɪnˈdevə(r)/", pos: "v./n.", m: "努力，尽力",
    ex: "We will endeavor to meet your needs.", cn: "我们会尽力满足您的需求。",
    tip: "en（使）+ deavor（职责）→ 尽责 → 努力。" },
  { w: "exaggerate", ph: "/ɪgˈzædʒəreɪt/", pos: "v.", m: "夸大，夸张",
    ex: "Don't exaggerate the difficulties.", cn: "不要夸大困难。",
    tip: "ex（出）+ agger（堆积）+ ate → 堆得超出实际 → 夸张。" },
  { w: "fluctuate", ph: "/ˈflʌktʃueɪt/", pos: "v.", m: "波动，起伏",
    ex: "Oil prices fluctuate daily.", cn: "油价每天都在波动。",
    tip: "fluct（波浪）+ uate → 像波浪一样 → 波动。" },
  { w: "gratitude", ph: "/ˈɡrætɪtjuːd/", pos: "n.", m: "感激，感谢",
    ex: "She expressed her gratitude to the team.", cn: "她向团队表达了感谢。",
    tip: "grat（感激）+ itude（状态）→ 感恩的状态。" },
  { w: "hypothesis", ph: "/haɪˈpɒθəsɪs/", pos: "n.", m: "假设，假说",
    ex: "The experiment proved his hypothesis.", cn: "实验证明了他的假设。",
    tip: "hypo（下面）+ thesis（放置）→ 放在下面的前提 → 假设。" },
  { w: "indispensable", ph: "/ˌɪndɪˈspensəbl/", pos: "adj.", m: "不可或缺的",
    ex: "Water is indispensable to life.", cn: "水是生命不可或缺的。",
    tip: "in（不）+ dis（分开）+ pens（称量）+ able → 不能分开称量 → 必需的。" },
  { w: "integrate", ph: "/ˈɪntɪɡreɪt/", pos: "v.", m: "整合，使融入",
    ex: "We need to integrate the new system.", cn: "我们需要整合新系统。",
    tip: "integr（完整）+ ate → 使完整 → 整合。" },
  { w: "justify", ph: "/ˈdʒʌstɪfaɪ/", pos: "v.", m: "证明…正当；为…辩护",
    ex: "Nothing can justify such rudeness.", cn: "无论什么理由都不能为这种粗鲁开脱。",
    tip: "just（正当）+ ify（使…）→ 使显得正当。名词 justification。" },
  { w: "magnify", ph: "/ˈmæɡnɪfaɪ/", pos: "v.", m: "放大；夸大",
    ex: "The microscope magnifies the cells.", cn: "显微镜放大细胞。",
    tip: "magn（大）+ ify（使）→ 使变大 → 放大。" },
  { w: "negotiate", ph: "/nɪˈɡəʊʃieɪt/", pos: "v.", m: "谈判，协商",
    ex: "They negotiated a better deal.", cn: "他们谈判达成了更好的交易。",
    tip: "neg（不）+ otium（空闲）→ 没有空闲 → 忙着谈。" },
  { w: "obstacle", ph: "/ˈɒbstəkl/", pos: "n.", m: "障碍，干扰",
    ex: "Fear is the biggest obstacle to success.", cn: "恐惧是成功最大的障碍。",
    tip: "ob（反）+ sta（站）+ cle → 站在对面挡路 → 障碍。" },
  { w: "perceive", ph: "/pəˈsiːv/", pos: "v.", m: "察觉，感知；理解",
    ex: "She perceived a slight change in his mood.", cn: "她察觉到他情绪的微妙变化。",
    tip: "per（完全）+ ceive（抓）→ 完全抓住 → 感知。" },
  { w: "prestige", ph: "/preˈstiːʒ/", pos: "n.", m: "威望，声望",
    ex: "The university has great prestige.", cn: "这所大学享有很高声望。",
    tip: "pre（前）+ stig（拉）→ 拉到前面 → 引人注目 → 威望。" },
  { w: "profound", ph: "/prəˈfaʊnd/", pos: "adj.", m: "深刻的，深远的",
    ex: "The book had a profound effect on me.", cn: "这本书对我影响深远。",
    tip: "pro（向前）+ found（底）→ 深到底 → 深刻的。" },
  { w: "reinforce", ph: "/ˌriːɪnˈfɔːs/", pos: "v.", m: "加强，加固",
    ex: "This evidence reinforces our argument.", cn: "这个证据加强了我们的论点。",
    tip: "re（再）+ in（进）+ force（强）→ 再用力 → 加强。" },
  { w: "reluctant", ph: "/rɪˈlʌktənt/", pos: "adj.", m: "不情愿的，勉强的",
    ex: "He was reluctant to admit his mistake.", cn: "他不情愿承认错误。",
    tip: "re（反）+ luct（挣扎）+ ant → 反抗挣扎 → 不情愿。" },
  { w: "restrain", ph: "/rɪˈstreɪn/", pos: "v.", m: "抑制，约束",
    ex: "She could not restrain her anger.", cn: "她抑制不住怒火。",
    tip: "re（回）+ strain（拉紧）→ 拉回来 → 抑制。" },
  { w: "simultaneous", ph: "/ˌsɪmlˈteɪniəs/", pos: "adj.", m: "同时的",
    ex: "There were simultaneous translations.", cn: "有同声传译。",
    tip: "simul（相同）+ tane + ous → 相同时间发生的。" },
  { w: "sustain", ph: "/səˈsteɪn/", pos: "v.", m: "维持，支撑；遭受",
    ex: "The economy cannot sustain this growth.", cn: "经济无法维持这种增长。",
    tip: "sus（下面）+ tain（握）→ 在下面撑住 → 维持。" },
  { w: "tedious", ph: "/ˈtiːdiəs/", pos: "adj.", m: "冗长乏味的",
    ex: "The lecture was incredibly tedious.", cn: "那场讲座无聊透顶。",
    tip: "ted（厌倦）+ ious → 令人厌倦的。" },
  { w: "transition", ph: "/trænˈzɪʃn/", pos: "n.", m: "过渡，转变",
    ex: "The transition was smooth.", cn: "过渡很顺利。",
    tip: "trans（穿过）+ it（走）+ ion → 走过去 → 过渡。" },
  { w: "underlying", ph: "/ˌʌndəˈlaɪɪŋ/", pos: "adj.", m: "潜在的，根本的",
    ex: "We need to address the underlying causes.", cn: "我们需要解决根本原因。",
    tip: "under（下面）+ lying（躺着）→ 躺在下面的 → 潜在的。" },
  { w: "vivid", ph: "/ˈvɪvɪd/", pos: "adj.", m: "生动的，鲜明的",
    ex: "She gave a vivid description of the trip.", cn: "她生动地描述了旅行。",
    tip: "viv（生命）+ id → 有生命的 → 生动的。" },
  { w: "witness", ph: "/ˈwɪtnəs/", pos: "n./v.", m: "目击者；目睹",
    ex: "She witnessed the accident.", cn: "她目睹了那场事故。",
    tip: "wit（知道）+ ness → 亲眼知道的人 → 目击者。" },
  { w: "yield", ph: "/jiːld/", pos: "v./n.", m: "产出；屈服；产量",
    ex: "The investment yielded high returns.", cn: "这项投资带来了高回报。",
    tip: "yield 有两个意思：产出庄稼，或屈服让步。" },
]

const WORDS_PER_DAY = 20

// 根据日期生成确定性随机种子，保证同一天内词表固定，跨天自动换
function seedFromDate(dateStr) {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) >>> 0
  }
  return h
}
function seededShuffle(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function todayWords(pool, dateStr) {
  const seed = seedFromDate(dateStr)
  return seededShuffle(pool, seed).slice(0, Math.min(WORDS_PER_DAY, pool.length))
}

const STORE_KEY = 'cet_words_done_v1'
const TODAY_KEY = 'cet_words_last_study'
const TYPES = ['cn2en', 'en2cn', 'cloze', 'listen']

function pickN(arr, n) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, Math.min(n, a.length))
}

function pickEnVoice() {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices() || []
  return voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null
}
let audioEl = null
function fallbackSpeak(text) {
  if (!('speechSynthesis' in window)) return
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.9
    const v = pickEnVoice()
    if (v) u.voice = v
    u.onerror = () => {}
    window.speechSynthesis.speak(u)
  }, 120)
}
function speak(text) {
  // 停掉上一次音频与本地朗读
  if (audioEl) { audioEl.pause(); audioEl = null }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  // 优先走在线发音（不依赖本机语音包），失败再回退本地 TTS
  const a = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`)
  audioEl = a
  a.onended = () => { audioEl = null }
  a.onerror = () => { audioEl = null; fallbackSpeak(text) }
  a.play().catch(() => { audioEl = null; fallbackSpeak(text) })
}

const spkSvg = (size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3z" />
    <path d="M16 8a5 5 0 0 1 0 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
const checkSvg = (size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const cardStyle = {
  background: '#fff', border: '1px solid #fce7f3', borderRadius: 14,
  padding: '16px 16px 14px', marginBottom: 12, boxShadow: '0 1px 2px rgba(244,114,182,0.06)',
}
const btnBase = {
  appearance: 'none', border: '1px solid #fbcfe8', background: '#fff',
  color: 'var(--text-main)', padding: '7px 14px', borderRadius: 999,
  fontSize: 13, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
}

export function WordsPage() {
  const todayStr = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD local
  const [wordPool, setWordPool] = useState(FALLBACK_POOL)
  useEffect(() => {
    fetch('words-db.json?_=' + Date.now())
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setWordPool(data) })
      .catch(() => {})
  }, [])
  const todayList = useMemo(() => todayWords(wordPool, todayStr), [wordPool, todayStr])
  const [doneArr, setDoneArr] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] }
  })
  const doneSet = useMemo(() => new Set(doneArr), [doneArr])
  const [order, setOrder] = useState(() => todayList)
  const [onlyUndone, setOnlyUndone] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [lastStudy, setLastStudy] = useState(() => {
    try { return localStorage.getItem(TODAY_KEY) || '' } catch { return '' }
  })
  const studiedToday = lastStudy === todayStr

  const save = (arr) => {
    setDoneArr(arr)
    localStorage.setItem(STORE_KEY, JSON.stringify(arr))
  }
  const toggleDone = (w) => {
    const wasDone = doneSet.has(w)
    const next = wasDone ? doneArr.filter(x => x !== w) : [...doneArr, w]
    save(next)
    if (!wasDone) {
      localStorage.setItem(TODAY_KEY, todayStr)
      setLastStudy(todayStr)
    }
  }

  const visible = onlyUndone ? order.filter(it => !doneSet.has(it.w)) : order
  const todayDoneCount = todayList.filter(it => doneSet.has(it.w)).length
  const pct = Math.round(todayDoneCount / todayList.length * 100)

  const startQuiz = () => {
    const words = pickN([...todayList], Math.min(15, todayList.length))
    const questions = words.map(w => ({
      target: w,
      type: TYPES[Math.floor(Math.random() * TYPES.length)],
      others: pickN(wordPool.filter(x => x.w !== w.w), 3),
    }))
    setQuiz({ questions, index: 0, score: 0, wrong: [], answers: new Array(questions.length).fill(null), done: false })
  }
  const quitQuiz = () => setQuiz(null)

  useEffect(() => {
    if (!quiz || quiz.done) return
    const q = quiz.questions[quiz.index]
    if (q && q.type === 'listen' && quiz.answers[quiz.index] === null) {
      const t = setTimeout(() => speak(q.target.w), 350)
      return () => clearTimeout(t)
    }
  }, [quiz])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'calc(20px + var(--safe-top)) 4px 100px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>四六级单词卡片</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: 12, marginTop: 4 }}>
          每天自动换 20 个词 · 点喇叭发音 · 学过打勾 · 15 题随机测验
        </p>
      </div>

      {!studiedToday && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1px solid #f59e0b', borderRadius: 12,
          padding: '12px 16px', marginBottom: 14, fontSize: 14, color: '#92400e',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⏰</span>
          <div>
            <b>今天还没背单词哦</b><br/>
            <span style={{ fontSize: 12, opacity: 0.8 }}>打勾一个词就算完成今日学习，开始吧</span>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        margin: '14px 0 16px', opacity: quiz ? 0.4 : 1, pointerEvents: quiz ? 'none' : 'auto',
        transition: 'opacity .2s',
      }}>
        <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={() => {
            setOrder([...todayList]); setIsShuffled(false)
            if (audioEl) { audioEl.pause(); audioEl = null }
            if ('speechSynthesis' in window) window.speechSynthesis.cancel()
            const list = [...todayList]
            let i = 0
            const next = () => {
              if (i >= list.length) return
              const word = list[i].w; i++
              const a = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`)
              audioEl = a
              a.onended = () => { audioEl = null; next() }
              a.onerror = () => { audioEl = null; next() }
              a.play().catch(() => next())
            }
            next()
          }}>顺序朗读</button>
        <button style={{ ...btnBase, ...(isShuffled ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : {}) }} onClick={() => { setOrder(pickN([...todayList], todayList.length)); setIsShuffled(true) }}>打乱顺序</button>
        <button style={{ ...btnBase, ...(onlyUndone ? { background: 'var(--primary-light)', borderColor: 'var(--primary)', color: 'var(--primary-dark)' } : {}) }}
          onClick={() => setOnlyUndone(v => !v)}>{onlyUndone ? '显示全部' : '只看未学'}</button>
        <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={startQuiz}>开始测试</button>
        {quiz && !quiz.done && (
          <button style={{ ...btnBase, borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={quitQuiz}>退出测试</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-sub)' }}>共 {visible.length} 词</span>
      </div>

      <div style={{ height: 6, background: '#fce7f3', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', background: 'var(--primary)', width: pct + '%', transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 14 }}>
        今日已学 {todayDoneCount} / {todayList.length} 词 · {pct}%
      </div>

      {!quiz ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {visible.map(it => {
            const isDone = doneSet.has(it.w)
            return (
              <div key={it.w} style={{ ...cardStyle, flex: '1 1 340px', minWidth: 300, ...(isDone ? { opacity: 0.55 } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => toggleDone(it.w)} title="标记已学"
                    style={{
                      width: 24, height: 24, border: '2px solid #fbcfe8', borderRadius: 6,
                      cursor: 'pointer', background: isDone ? 'var(--primary)' : '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0, marginTop: 2, padding: 0,
                    }}>
                    <span style={{ opacity: isDone ? 1 : 0 }}>{checkSvg()}</span>
                  </button>
                  <span style={{
                    fontSize: 22, fontWeight: 700,
                    textDecoration: isDone ? 'line-through' : 'none',
                    textDecorationColor: 'var(--primary)',
                  }}>{it.w}</span>
                  <button onClick={() => speak(it.w)} title="朗读单词"
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: 'var(--primary-light)', color: 'var(--primary-dark)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                    }}>{spkSvg(16)}</button>
                  <span style={{ color: 'var(--text-sub)', fontSize: 14, fontFamily: 'Georgia, serif' }}>{it.ph}</span>
                  <span style={{
                    display: 'inline-block', fontSize: 11, color: 'var(--primary-dark)',
                    background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 6, marginTop: 3,
                  }}>{it.pos}</span>
                </div>
                <div style={{ fontSize: 15, marginTop: 6 }}>{it.m}</div>
                <div style={{
                  marginTop: 10, padding: '10px 12px', background: '#fdfafb',
                  borderLeft: '3px solid var(--primary)', borderRadius: '0 8px 8px 0', fontSize: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <button onClick={() => speak(it.ex)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: '#fce7f3', color: 'var(--primary-dark)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                      }}>{spkSvg(13)}</button>
                    <span>{it.ex}</span>
                  </div>
                  <div style={{ color: 'var(--text-sub)', fontSize: 13, marginTop: 4, marginLeft: 34 }}>{it.cn}</div>
                </div>
                <div style={{
                  marginTop: 10, padding: '8px 12px', background: '#fff7ed',
                  border: '1px dashed #fed7aa', borderRadius: 8, fontSize: 13, color: '#9a3412',
                }}><b>记忆提示：</b>{it.tip}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <QuizView quiz={quiz} setQuiz={setQuiz} quitQuiz={quitQuiz} />
      )}
    </div>
  )
}

function QuizView({ quiz, setQuiz, quitQuiz }) {
  const q = quiz.questions[quiz.index]
  const w = q.target
  const answered = quiz.answers[quiz.index]

  let head = null, opts = [], correctVal = ''
  if (q.type === 'cn2en') {
    head = (
      <>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{w.m}</div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13, margin: '4px 0 14px' }}>{w.pos} {w.ph}</div>
        <Tag>题型：根据中文选英文</Tag>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.w
  } else if (q.type === 'en2cn') {
    head = (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{w.w}</div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13, margin: '4px 0 14px' }}>{w.pos} {w.ph}</div>
        <Tag>题型：根据英文选中文释义</Tag>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.m
  } else if (q.type === 'cloze') {
    const blankEx = w.ex.replace(new RegExp('\\b' + w.w + '\\b'), '______')
    head = (
      <>
        <Tag>题型：例句填空</Tag>
        <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.7, marginBottom: 6 }}>{blankEx}</div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13 }}>{w.cn}</div>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.w
  } else {
    head = (
      <>
        <Tag>题型：听发音选词义</Tag>
        <div>
          <button onClick={() => speak(w.w)}
            style={{
              width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--primary)', color: '#fff', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', margin: '6px 0',
            }}>{spkSvg(28)}</button>
        </div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13 }}>点喇叭重听，选择正确释义</div>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.m
  }

  const isLast = quiz.index === quiz.questions.length - 1

  const pick = (val) => {
    if (answered) return
    const ok = val === correctVal
    const newAnswers = [...quiz.answers]
    newAnswers[quiz.index] = { picked: val, ok }
    setQuiz({
      ...quiz,
      answers: newAnswers,
      score: quiz.score + (ok ? 1 : 0),
      wrong: ok ? quiz.wrong : (quiz.wrong.find(x => x.w === w.w) ? quiz.wrong : [...quiz.wrong, w]),
    })
  }

  const goPrev = () => { if (quiz.index > 0) setQuiz({ ...quiz, index: quiz.index - 1 }) }
  const goNext = () => {
    if (!answered) return
    if (isLast) setQuiz({ ...quiz, done: true })
    else setQuiz({ ...quiz, index: quiz.index + 1 })
  }

  if (quiz.done) return <ResultView quiz={quiz} setQuiz={setQuiz} quitQuiz={quitQuiz} />

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 10 }}>
        第 {quiz.index + 1} / {quiz.questions.length} 题　·　当前得分 {quiz.score}
      </div>
      <div style={{ ...cardStyle, padding: '20px 16px' }}>
        {head}
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {opts.map(o => {
            const val = q.type === 'cn2en' || q.type === 'cloze' ? o.w : o.m
            let style = {
              padding: '12px 14px', border: '1.5px solid #fbcfe8', borderRadius: 10,
              background: '#fff', fontSize: 15, cursor: answered ? 'default' : 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
            }
            if (answered) {
              style.cursor = 'default'
              if (val === correctVal) style = { ...style, background: '#d1fae5', borderColor: '#10b981', color: '#065f46' }
              else if (answered.picked === val) style = { ...style, background: '#ffe4e6', borderColor: '#f43f5e', color: '#9f1239' }
              else style = { ...style, opacity: 0.5 }
            }
            return <button key={val} style={style} onClick={() => pick(val)} disabled={!!answered}>{val}</button>
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 14, minHeight: 22, color: answered ? (answered.ok ? '#10b981' : '#f43f5e') : 'transparent' }}>
          {answered ? (answered.ok ? '回答正确' : `正确答案：${w.w}（${w.m}）`) : '·'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
          <button style={{ ...btnBase, minWidth: 100, opacity: quiz.index === 0 ? 0.4 : 1 }}
            onClick={goPrev} disabled={quiz.index === 0}>上一题</button>
          <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)', minWidth: 100, opacity: answered ? 1 : 0.4 }}
            onClick={goNext} disabled={!answered}>{isLast ? '查看结果' : '下一题'}</button>
        </div>
      </div>
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, color: 'var(--primary-dark)',
      background: 'var(--primary-light)', padding: '3px 10px', borderRadius: 6, marginBottom: 10,
    }}>{children}</span>
  )
}

function ResultView({ quiz, setQuiz, quitQuiz }) {
  const total = quiz.questions.length
  const score = quiz.score
  const passLine = Math.ceil(total * 0.8)
  const passed = score >= passLine
  let comment
  if (score === total) comment = '满分！全部掌握了'
  else if (passed) comment = `通过！及格线 ${passLine} 题，再巩固下错题就更稳`
  else comment = `未通过（需对 ${passLine} 题），先把错题看完再重考`

  return (
    <div style={{ ...cardStyle, padding: '30px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 42, fontWeight: 800, color: passed ? 'var(--primary)' : 'var(--danger)' }}>
        {score} / {total}
      </div>
      <div style={{ color: 'var(--text-sub)', margin: '8px 0 20px' }}>
        {passed ? '恭喜通过' : '未通过'}　·　{comment}
      </div>
      {quiz.wrong.length > 0 ? (
        <>
          <div style={{ textAlign: 'left', marginBottom: 12, fontWeight: 600 }}>错题回顾：</div>
          {quiz.wrong.map(w => (
            <div key={w.w} style={{
              textAlign: 'left', padding: '10px 12px', border: '1px solid #fce7f3',
              borderRadius: 10, marginBottom: 8, fontSize: 14, background: '#fdfafb',
            }}>
              <b>{w.w}</b> <span style={{ color: 'var(--text-sub)' }}>{w.ph}</span>{' '}
              <span style={{ color: '#10b981' }}>✓ {w.m}</span>
            </div>
          ))}
        </>
      ) : (
        <div style={{ color: 'var(--text-sub)', marginTop: 0 }}>没有错题，太稳了。</div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
        <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={quitQuiz}>返回单词表</button>
        <button style={btnBase} onClick={() => setQuiz(null)}>
          {passed ? '再来一组' : '重新考试'}
        </button>
      </div>
    </div>
  )
}
