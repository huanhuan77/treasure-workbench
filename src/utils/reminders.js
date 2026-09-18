// 「提醒中心」三个口径的唯一真相源
//
// 总览页的 Tab 计数与三个列表页的列表内容都从这里取，
// 避免同一个口径散落在多处、改一处漏一处导致「卡片数字 ≠ 点进去的条数」。
import { needPublishReminder } from './publish'

// 发布不足的阈值：某产品发布数低于它即视为「发布不足」
export const LOW_PUBLISH_LIMIT = 5

// 即将到期的天数窗口
export const EXPIRING_DAYS = 7

export const REMINDER_TABS = [
  { id: 'reminders', label: '发布提醒', short: '待发布', accent: '#ec4899', to: '/publish-reminders' },
  { id: 'low', label: '发布不足5条', short: '不足5条', accent: '#8b5cf6', to: '/samples/low-publish' },
  { id: 'expiring', label: '即将到期', short: '将到期', accent: '#f97316', to: '/samples/expiring' },
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

// 2) 发布不足5条：已发布、发布数低于阈值、且尚未出单
export function selectLowPublish(samples, limit = LOW_PUBLISH_LIMIT) {
  return (samples || []).filter(
    (s) => s.status === 'published'
      && (Number(s.publishCount) || 0) < limit
      && (Number(s.orderCount) || 0) === 0,
  )
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
