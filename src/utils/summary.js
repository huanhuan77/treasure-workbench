// 周 / 月总结的统计口径（PC 与手机端共用）
//
// 口径（用户 2026-10-22 确认）：
//   · 周 = 周一 ~ 周日；月 = 自然月（1 号 ~ 月末）
//   · 发布：取「发布记录」的 publishDate 落在区间内，条数按 qty 累加（记录挂几个账号就算几条）
//   · 出单：取「出单记录」的 date 落在区间内，件数按 qty 累加，笔数按记录数
//   · 收支：取「收支」的 date 落在区间内，收入/支出按 type 分，净额 = 收入 − 支出（待收的也计入收入）
//   · 样品：新增按 createdAt 落在区间内；逾期 = 截止日已过且未发布/未放弃（按当前状态算）
//   · 待办：完成数 = done 且 updatedAt 落在区间内
import { ACCOUNTS } from './accounts'

const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const parseDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''))
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

// 期间列表：本周 / 上周 / 本月 / 上月 + 近 30 / 60 / 90 天（滚动窗口，含今天）
export const PERIODS = [
  { key: 'week', label: '本周' },
  { key: 'lastWeek', label: '上周' },
  { key: 'month', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'd30', label: '近30天' },
  { key: 'd60', label: '近60天' },
  { key: 'd90', label: '近90天' },
]

// 返回 { start, end, label, key }（start/end 都是 'YYYY-MM-DD'，含首含尾）
export function periodRange(key, base = new Date()) {
  const day = base.getDay()            // 0 = 周日
  const mondayOffset = (day + 6) % 7   // 周一 = 0
  const monday = new Date(base)
  monday.setDate(base.getDate() - mondayOffset)

  if (key === 'lastWeek') {
    const s = new Date(monday); s.setDate(s.getDate() - 7)
    const e = new Date(s); e.setDate(s.getDate() + 6)
    return { key, start: ymd(s), end: ymd(e), label: `${ymd(s)} ~ ${ymd(e)}` }
  }
  if (key === 'week') {
    const e = new Date(monday); e.setDate(e.getDate() + 6)
    return { key, start: ymd(monday), end: ymd(e), label: `${ymd(monday)} ~ ${ymd(e)}` }
  }
  if (key === 'lastMonth') {
    const s = new Date(base.getFullYear(), base.getMonth() - 1, 1)
    const e = new Date(base.getFullYear(), base.getMonth(), 0)
    return { key, start: ymd(s), end: ymd(e), label: `${s.getFullYear()} 年 ${s.getMonth() + 1} 月` }
  }
  // 近 N 天（滚动窗口，含今天）
  const rolling = /^d(\d+)$/.exec(String(key || ''))
  if (rolling) {
    const n = Number(rolling[1]) || 30
    const e = new Date(base)
    const s = new Date(base)
    s.setDate(s.getDate() - (n - 1))
    return { key, start: ymd(s), end: ymd(e), label: `近 ${n} 天（${ymd(s)} ~ ${ymd(e)}）` }
  }
  const s = new Date(base.getFullYear(), base.getMonth(), 1)
  const e = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return { key, start: ymd(s), end: ymd(e), label: `${s.getFullYear()} 年 ${s.getMonth() + 1} 月` }
}

const inRange = (d, start, end) => !!d && d >= start && d <= end

// 主统计：返回所有区间内的数字 + 分账号明细 + 按天明细
export function buildSummary(data, range) {
  const { start, end } = range
  const pubRecs = data.publishRecords || []
  const orders = data.orders || []
  const txs = data.transactions || []
  const samples = data.samples || []
  const todos = data.todos || []

  // ── 分账号累计 ──
  const accMap = new Map()
  const accOf = (a) => {
    if (!accMap.has(a)) accMap.set(a, { account: a, publish: 0, orderQty: 0, orderCount: 0, income: 0, expense: 0, newProducts: 0 })
    return accMap.get(a)
  }
  ACCOUNTS.forEach((a) => accOf(a))

  // 发布
  let publish = 0
  let publishRecords = 0
  for (const r of pubRecs) {
    if (!inRange(String(r.publishDate || ''), start, end)) continue
    const qty = Number(r.qty) > 0 ? Number(r.qty) : 1
    const accs = Array.isArray(r.accounts) && r.accounts.length ? r.accounts : []
    publishRecords += 1
    if (!accs.length) { publish += qty; continue }
    // 一条记录挂多个账号 → 每个账号各算 qty（与「发布记录」页的拆行口径一致）
    for (const a of accs) {
      publish += qty
      accOf(a).publish += qty
    }
  }

  // 出单
  let orderQty = 0
  let orderCount = 0
  for (const o of orders) {
    if (!inRange(String(o.date || ''), start, end)) continue
    const qty = Number(o.qty) > 0 ? Number(o.qty) : 1
    orderQty += qty
    orderCount += 1
    if (o.account) {
      const row = accOf(o.account)
      row.orderQty += qty
      row.orderCount += 1
    }
  }

  // 收支
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (!inRange(String(t.date || ''), start, end)) continue
    const amount = Number(t.amount) || 0
    if (t.type === 'income') {
      income += amount
      if (t.account) accOf(t.account).income += amount
    } else {
      expense += amount
      if (t.account) accOf(t.account).expense += amount
    }
  }

  // 样品 / 待办
  const newSampleObjs = samples.filter((s) => inRange(String(s.createdAt ? ymd(new Date(s.createdAt)) : ''), start, end))
  const newSampleList = newSampleObjs.map((s) => ({ name: s.name || '（未命名）', status: s.status || '' }))
  const newSamples = newSampleList.length
  // 分账号的「新增产品数」：区间内新建、且归属该账号的样品数量
  for (const s of newSampleObjs) {
    const accs = Array.isArray(s.accounts) && s.accounts.length ? s.accounts : (s.account ? [s.account] : [])
    for (const a of accs) accOf(a).newProducts += 1
  }
  const today = ymd(new Date())
  const overdueSamples = samples.filter((s) => {
    if (!s || s.archived || s.status === 'abandoned' || s.status === 'published') return false
    const dl = String(s.deadline || '')
    return !!dl && dl < today
  }).length
  const todosDone = todos.filter((t) => t.done && inRange(t.updatedAt ? ymd(new Date(t.updatedAt)) : '', start, end)).length

  // ── 按产品明细（用户要求「要统计具体的」：哪个品发了多少、出了多少单）──
  const prodMap = new Map()
  const prodOf = (name) => {
    const key = String(name || '（未命名）')
    if (!prodMap.has(key)) prodMap.set(key, { name: key, publish: 0, orderQty: 0, accounts: new Set() })
    return prodMap.get(key)
  }
  const sampleName = new Map((samples || []).map((s) => [s.id, String(s.name || '')]))
  // 产品名 → 归属账号（用于「按产品明细」里的账号列）
  const sampleAccs = new Map()
  for (const s of samples || []) {
    const nm = String(s.name || '')
    const accs = Array.isArray(s.accounts) && s.accounts.length ? s.accounts : (s.account ? [s.account] : [])
    if (!sampleAccs.has(nm)) sampleAccs.set(nm, new Set())
    for (const a of accs) sampleAccs.get(nm).add(a)
  }
  for (const r of pubRecs) {
    if (!inRange(String(r.publishDate || ''), start, end)) continue
    const nm = sampleName.get(r.sampleId) || r.name || '（样品已删除）'
    const row = prodOf(nm)
    row.publish += Number(r.qty) > 0 ? Number(r.qty) : 1
    for (const a of (r.accounts || [])) row.accounts.add(a)
    for (const a of (sampleAccs.get(nm) || [])) row.accounts.add(a)
  }
  for (const o of orders) {
    if (!inRange(String(o.date || ''), start, end)) continue
    const row = prodOf(o.name)
    row.orderQty += Number(o.qty) > 0 ? Number(o.qty) : 1
    if (o.account) row.accounts.add(o.account)
    for (const a of (sampleAccs.get(String(o.name || '')) || [])) row.accounts.add(a)
  }
  const accOrder = (a) => {
    const i = ACCOUNTS.indexOf(a)
    return i === -1 ? 999 : i
  }
  const products = [...prodMap.values()]
    .filter((r) => r.publish > 0 || r.orderQty > 0)
    .sort((a, b) => (b.publish + b.orderQty) - (a.publish + a.orderQty))
    .map((r) => ({ ...r, accounts: [...r.accounts].sort((x, y) => accOrder(x) - accOrder(y)) }))

  // ── 按天明细（只列有数据的日期，日期升序）──
  const dayMap = new Map()
  const dayOf = (d) => {
    if (!dayMap.has(d)) dayMap.set(d, { date: d, publish: 0, orderQty: 0, orderCount: 0, income: 0, expense: 0 })
    return dayMap.get(d)
  }
  for (const r of pubRecs) {
    const d = String(r.publishDate || '')
    if (!inRange(d, start, end)) continue
    dayOf(d).publish += Number(r.qty) > 0 ? Number(r.qty) : 1
  }
  for (const o of orders) {
    const d = String(o.date || '')
    if (!inRange(d, start, end)) continue
    const row = dayOf(d)
    row.orderQty += Number(o.qty) > 0 ? Number(o.qty) : 1
    row.orderCount += 1
  }
  for (const t of txs) {
    const d = String(t.date || '')
    if (!inRange(d, start, end)) continue
    const row = dayOf(d)
    const amount = Number(t.amount) || 0
    if (t.type === 'income') row.income += amount
    else row.expense += amount
  }

  const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  const accounts = [...accMap.values()].filter(
    (r) => r.publish > 0 || r.orderQty > 0 || r.orderCount > 0 || r.income > 0 || r.expense > 0 || r.newProducts > 0,
  )

  return {
    range,
    publish,
    publishRecords,
    orderQty,
    orderCount,
    income,
    expense,
    net: income - expense,
    newSamples,
    newSampleList,
    overdueSamples,
    todosDone,
    accounts,
    days,
    products,
  }
}

// 趋势柱：跟随当前选中的期间
//   · 本周 / 上周 → **按天**对比（周一~周日，7 根柱，用户要求「点本周是天数对比」）
//   · 本月 / 上月 → **按周**对比（自然周切分，通常 4~5 根柱，用户要求「本月是 4 周对比」）
export function buildTrendFor(data, range) {
  // 自定义区间：跨度小（≤10 天）按天画，跨度大按周画，避免柱子挤成一团
  const spanDays = daysBetween(range.start, range.end)
  const isDay = range.key === 'week' || range.key === 'lastWeek' || (range.key === 'custom' && spanDays <= 10)
  const today = ymd(new Date())
  if (isDay) {
    const bars = []
    for (let d = new Date(range.start); ymd(d) <= range.end; d.setDate(d.getDate() + 1)) {
      const day = ymd(d)
      const s = buildSummary(data, { start: day, end: day })
      const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
      bars.push({
        key: day,
        label: `${day.slice(5)} 周${wd}`,
        mark: day === today ? '今天' : '',
        publish: s.publish,
        orderQty: s.orderQty,
      })
    }
    return { mode: 'day', bars }
  }
  // 按周切分：从区间第一天所在周开始，末日裁剪到区间末尾
  const bars = []
  let cur = new Date(range.start)
  let guard = 0
  while (ymd(cur) <= range.end && guard < 40) {
    guard += 1
    const offsetToSunday = 6 - ((cur.getDay() + 6) % 7)
    const wEnd = new Date(cur)
    wEnd.setDate(cur.getDate() + offsetToSunday)
    const segStart = ymd(cur)
    const segEnd = ymd(wEnd) > range.end ? range.end : ymd(wEnd)
    const s = buildSummary(data, { start: segStart, end: segEnd })
    bars.push({
      key: segStart,
      label: `${segStart.slice(5)} ~ ${segEnd.slice(5)}`,
      mark: today >= segStart && today <= segEnd ? '本周' : '',
      publish: s.publish,
      orderQty: s.orderQty,
    })
    cur = new Date(wEnd)
    cur.setDate(cur.getDate() + 1)
  }
  return { mode: 'week', bars }
}

// 近 N 周趋势（含本周，周一起算）：每周返回 { label, start, end, publish, orderQty, newSamples }
// 用户要求「我想做成柱状图，4 周的都列出来」，所以默认取 4 周。
export function buildTrend(data, weeks = 4, base = new Date()) {
  const out = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i * 7)
    const r = periodRange('week', d)
    const sum = buildSummary(data, r)
    out.push({
      key: r.key + '_' + r.start,
      start: r.start,
      end: r.end,
      label: `${r.start.slice(5)} ~ ${r.end.slice(5)}`,
      isThisWeek: i === 0,
      publish: sum.publish,
      orderQty: sum.orderQty,
      newSamples: sum.newSamples,
    })
  }
  return out
}

// ── 图表数据 ────────────────────────────────────────────────
// 近 N 个月趋势（含本月）：发布条数 / 出单件数 / 转化率（出单件数 ÷ 发布条数）
export function buildMonthlyTrend(data, months = 6, base = new Date()) {
  const out = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const start = ymd(d)
    const end = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    const s = buildSummary(data, { start, end })
    out.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: `${d.getMonth() + 1}月`,
      start,
      end,
      publish: s.publish,
      orderQty: s.orderQty,
      orderCount: s.orderCount,
      rate: s.publish > 0 ? Math.round((s.orderQty / s.publish) * 1000) / 10 : 0,
    })
  }
  return out
}

// 分类占比（当前区间内）：按「发布条数」或「出单件数」统计各分类的占比
export function buildCategoryShare(data, range, metric = 'publish') {
  const samples = data.samples || []
  const catById = new Map()
  const catByName = new Map()
  for (const s of samples) {
    const cat = s.category || '未分类'
    catById.set(s.id, cat)
    catByName.set(String(s.name || ''), cat)
  }
  const map = new Map()
  const add = (k, v) => map.set(k, (map.get(k) || 0) + v)

  if (metric === 'order') {
    for (const o of data.orders || []) {
      if (!inRange(String(o.date || ''), range.start, range.end)) continue
      add(catByName.get(String(o.name || '')) || '未分类', Number(o.qty) > 0 ? Number(o.qty) : 1)
    }
  } else {
    for (const r of data.publishRecords || []) {
      if (!inRange(String(r.publishDate || ''), range.start, range.end)) continue
      add(catById.get(r.sampleId) || '未分类', Number(r.qty) > 0 ? Number(r.qty) : 1)
    }
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
}

// 粗略天数（用于展示「共 N 天」）
export function daysBetween(start, end) {
  const s = parseDay(start)
  const e = parseDay(end)
  if (!s || !e) return 0
  return Math.round((e - s) / 86400000) + 1
}
