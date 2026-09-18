// 「提醒中心」三个口径的唯一真相源
//
// 总览页的 Tab 计数与三个列表页的列表内容都从这里取，
// 避免同一个口径散落在多处、改一处漏一处导致「卡片数字 ≠ 点进去的条数」。
import { needPublishReminder } from './publish'
import { getAccounts, getCounts } from './sampleStatus'

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

// 2) 发布不足5条：按「账号」粒度统计（不是样品粒度）。
//
// 为什么必须按账号：
//   样品 = 一个实体，可归属多个账号（见 sampleStatus.js 的数据模型）。
//   顶层 s.publishCount / s.orderCount 是**所有账号的合计**，用它判断会出两个错：
//     · 漏报：刘亦菲发 1 条、富婆发 6 条 → 合计 7 ≥ 5，整个样品被排除，
//             但刘亦菲那个账号明明发布不足。
//     · 误排除：只要任一账号出过单，合计 orderCount > 0，样品整体被排除，
//             哪怕另一个账号既没出单又发布不足。
//   所以这里逐个账号判断，三个条件全部落在同一账号上：
//     该账号已发布过（publishCount > 0）
//     && 该账号发布数 < 阈值
//     && 该账号尚未出单（orderCount === 0）
//
// 返回值是「样品 × 账号」的扁平条目数组，每条形如
//   { sample, account, publishCount, orderCount, lack }
// 而不是样品数组 —— 因为一个样品可能有多个账号各自发布不足，
// 它们要作为独立条目各自计数、各自展示。
export function selectLowPublish(samples, limit = LOW_PUBLISH_LIMIT) {
  const out = []
  for (const s of samples || []) {
    for (const a of getAccounts(s)) {
      const c = getCounts(s, a)
      const publishCount = c.publishCount
      const orderCount = c.orderCount
      // 「已发布」按账号判定：该账号发布数 > 0 即视为该账号已发布（与 sampleStatus 的口径一致）
      if (publishCount <= 0) continue
      if (publishCount >= limit) continue
      if (orderCount !== 0) continue
      out.push({
        sample: s,
        account: a,
        publishCount,
        orderCount,
        lack: limit - publishCount,
      })
    }
  }
  return out
}

// 3) 即将到期：有截止日期、且未发布/未放弃、EXPIRING_DAYS 天内到期（含已逾期），按截止日升序
export function selectExpiringSoon(samples, days = EXPIRING_DAYS) {
  return (samples || [])
    .filter((s) => {
      if (!s.deadline || s.status === 'published' || s.status === 'abandoned') return false
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
