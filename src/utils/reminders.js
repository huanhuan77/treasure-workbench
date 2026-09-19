// 「提醒中心」三个口径的唯一真相源
//
// 总览页的 Tab 计数与三个列表页的列表内容都从这里取，
// 避免同一个口径散落在多处、改一处漏一处导致「卡片数字 ≠ 点进去的条数」。
import { needPublishReminder } from './publish'
import { getAccounts, isArchivedSample } from './sampleStatus'

// 发布不足的阈值：某产品发布数低于它即视为「发布不足」
export const LOW_PUBLISH_LIMIT = 5

// 即将到期的天数窗口
export const EXPIRING_DAYS = 7

// 三个 Tab 的标签与跳转目标。
// label/mid/short 是同一标签的三档长度，供总览页按屏宽切换（见 index.css 的 .dashTab*），
// 目的是让最长的「发布不足5条」+ 数量气泡在窄屏下不被省略号截断。
// 注意：短标签不能以数字结尾。标签后紧跟数量气泡，「不足5」+「66」会连成「不足566」被读成千位数，
// 所以 short 档改用「不足」「待发」这类不带尾随数字的写法。
export const REMINDER_TABS = [
  { id: 'reminders', label: '发布提醒', mid: '待发布', short: '待发', accent: '#ec4899', to: '/publish-reminders' },
  { id: 'low', label: '发布不足5条', mid: '不足5条', short: '不足', accent: '#8b5cf6', to: '/samples/low-publish' },
  { id: 'expiring', label: '即将到期', mid: '将到期', short: '将到期', accent: '#f97316', to: '/samples/expiring' },
]

// 距截止日还有几天。无截止日 / 日期非法返回 null
export function daysUntilDeadline(deadline) {
  if (!deadline) return null
  const t = new Date(deadline)
  if (Number.isNaN(t.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((t - today) / 86400000)
}

// 1) 发布提醒：可发布状态但超阈值未发（含从未发布）。放弃的已被 needPublishReminder 排除
export function selectPublishReminders(samples) {
  return (samples || []).filter((s) => needPublishReminder(s))
}

// 2) 发布不足5条：**逐账号判定**，但**按样品聚合展示**。
//
// 口径（2026-09-19 确定）：
//   每个账号**各算各的** —— 某账号自己发满 5 条就算它达标，
//   与这个样品一共挂了几个账号、别的账号发了多少**无关**。
//   三个条件必须落在同一个账号上：
//     该账号已发布过（publishCount > 0）
//     && 该账号发布数 < 阈值
//     && 该账号自己尚未出单（orderCount === 0，别的账号出单不影响）
//
// 为什么不是读样品合计（上一版的做法，已废弃）：
//   顶层 s.publishCount 是所有账号的合计。一个样品挂 3 个账号、各发 2 条，
//   合计 6 ≥ 5，整个样品就被排除了 —— 但这三个账号**每个都没发满 5 条**，
//   本该全部提醒却集体漏报。合计口径在多账号下必然出错。
//
// 为什么不返回「样品×账号」扁平条目（更早一版的做法，已废弃）：
//   那样一个样品有几个账号未达标就占几行，列表被撑长（用户实测 25 条变更多）。
//   现在改为**一个样品一条**，条目里带上未达标账号的明细数组：
//     { sample, accounts: [{ account, publishCount, orderCount, lack }], minPublishCount }
//   列表条数 = 未达标的样品数，稳定且可预期。
//
// ⚠️ 关于老数据的虚增隐患（务必理解，否则会改错）：
//   getCounts(s, a) 在 countsByAccount[a] 缺失时会回退成**顶层合计**，
//   多账号样品若没跑过迁移，每个账号都会拿到同一个合计数。
//   但 store 的 aggregatePublish 迁移（store.jsx）会给每个账号补
//   { publishCount: 0 } 的明细，所以正常数据下不会触发该回退。
//   为了稳妥，这里额外校验：若某账号的明细整个缺失，就**跳过该账号**，
//   宁可不报也不虚报（虚报会让用户看到根本不存在的「发布不足」）。
export function selectLowPublish(samples, limit = LOW_PUBLISH_LIMIT) {
  const out = []
  for (const s of samples || []) {
    // 已放弃/归档的样品不再提醒补发布 —— 它已经不做了，再提示「还差 N 条」是错的。
    // 用 isArchivedSample 而非只看 s.status：它同时兼容 archived 布尔、
    // execByAccount 全 abandoned、以及老的顶层 status 三种形态。
    if (isArchivedSample(s)) continue
    const short = []
    for (const a of getAccounts(s)) {
      // 明细缺失 → 该账号条数不可信，跳过（见上方说明）
      const raw = s?.countsByAccount?.[a]
      if (!raw) continue
      const publishCount = Number(raw.publishCount) || 0
      const orderCount = Number(raw.orderCount) || 0
      // 一条都没发不算「发布不足」，那是「还没发」（属于发布提醒的关注范围）
      if (publishCount <= 0) continue
      if (publishCount >= limit) continue
      // 只看该账号自己有没有出单，别的账号出单不影响
      if (orderCount !== 0) continue
      short.push({ account: a, publishCount, orderCount, lack: limit - publishCount })
    }
    if (!short.length) continue
    // 未达标账号按条数升序，最该补的排前面；供卡片顶部显示「还差 N 条」取最小值
    short.sort((x, y) => x.publishCount - y.publishCount)
    out.push({
      sample: s,
      accounts: short,
      minPublishCount: short[0].publishCount,
      minLack: short[0].lack,
    })
  }
  return out
}

// 3) 即将到期：有截止日期、且未发布/未放弃、EXPIRING_DAYS 天内到期（含已逾期），按截止日升序
export function selectExpiringSoon(samples, days = EXPIRING_DAYS) {
  return (samples || [])
    .filter((s) => {
      // 已放弃/归档的不提醒（原先只看顶层 status，漏掉了 archived 与
      // execByAccount 形态的老数据，改用统一的 isArchivedSample 兜住）
      if (isArchivedSample(s)) return false
      if (!s.deadline || s.status === 'published') return false
      const d = daysUntilDeadline(s.deadline)
      return d !== null && d <= days
    })
    .sort((a, b) => (daysUntilDeadline(a.deadline) ?? 999) - (daysUntilDeadline(b.deadline) ?? 999))
}

// 一次性取出三组，供总览 Tab 与列表页共用
export function selectAllReminders(samples) {
  return {
    reminders: selectPublishReminders(samples),
    low: selectLowPublish(samples),
    expiring: selectExpiringSoon(samples),
  }
}
