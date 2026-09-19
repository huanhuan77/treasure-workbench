// 「提醒中心」三个口径的唯一真相源
//
// 总览页的 Tab 计数与三个列表页的列表内容都从这里取，
// 避免同一个口径散落在多处、改一处漏一处导致「卡片数字 ≠ 点进去的条数」。
import { needPublishReminder } from './publish'

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

// 2) 发布不足5条：**按样品**统计，一个样品最多贡献一条。
//
// 为什么回到样品粒度（2026-09-19 修正）：
//   曾短暂改为「按账号」逐个判定并返回「样品×账号」扁平条目，理由是顶层
//   s.publishCount / s.orderCount 是所有账号的合计，多账号下会漏判。但实测发现
//   那个改动会把列表撑大：早期「一个样品属于一个账号」的数据，同一产品发给 N 个
//   账号会存成 N 条，mergeSplitSamples 迁移把它们合并成一条实体并把顶层计数
//   **原样复制给每个账号**（store.jsx 见「明细里没覆盖到的账号，用顶层值兜底补上」）。
//   于是「已发 3 条」的多账号样品被当成 3 个账号各自「已发 3 条」，
//   一个样品拆出 N 条，列表凭空变长（用户实测 25 条被拆成更多）。
//
//   现在的口径：一个样品一条，条数与出单都读样品级合计（getAggregateCounts）。
//   这样计数与列表条数天然一一对应，不会再出现同一份数字被复制到每个账号的虚增。
//
// 保留 b6c2b01 修对的部分：只算「已发布过」且「未出单」的样品，
//   而不是把未发布（0 条）的样品也算进来。
export function selectLowPublish(samples, limit = LOW_PUBLISH_LIMIT) {
  return (samples || []).filter((s) => {
    const publishCount = Number(s?.publishCount) || 0
    const orderCount = Number(s?.orderCount) || 0
    // 一条都没发不算「发布不足」，那是「还没发」（属于发布提醒的关注范围）
    if (publishCount <= 0) return false
    if (publishCount >= limit) return false
    // 已出单就不算「发布不足」这个待办事项了
    if (orderCount !== 0) return false
    return true
  })
}

// 单条「发布不足」的展示计数（卡片文案「已发 N 条 · 还差 M」用）
export function lowPublishCounts(s, limit = LOW_PUBLISH_LIMIT) {
  const publishCount = Number(s?.publishCount) || 0
  return { publishCount, lack: Math.max(0, limit - publishCount) }
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
