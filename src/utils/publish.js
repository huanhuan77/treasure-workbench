// 视频发布 / 出单关联 / N 天未发提醒 相关纯函数
import { todayStr } from './helpers'

// 提醒阈值：超过该天数未发视频即提醒
export const N_PUBLISH_DAYS = 7

// 已发布状态（用于「出单」只能关联已发布产品）
export const PUBLISHED_STATES = ['published_free', 'published_paid', 'hit']

// 可记视频发布的状态（已拍摄/已发布都可发）
export const SHOOTABLE_STATES = ['shot', 'published_free', 'published_paid', 'hit']

// 样品是否可作为「出单」关联对象（仅已发布）
export function isSelectableForOrder(status) {
  return PUBLISHED_STATES.includes(status)
}

// 样品是否可作为「视频发布记录」关联对象（已拍摄/已发布）
export function isSelectableForPublish(status) {
  return SHOOTABLE_STATES.includes(status)
}

// 距今天数（基于 lastPublishAt 日期字符串）。无记录返回 Infinity
export function daysSincePublish(sample) {
  const d = sample?.lastPublishAt
  if (!d) return Infinity
  const last = new Date(d)
  const now = new Date(todayStr())
  if (isNaN(last.getTime())) return Infinity
  const diff = Math.floor((now - last) / 86400000)
  return diff
}

// 是否需要提醒：处于可发布状态，且从未发布或已超过阈值天数
export function needPublishReminder(sample) {
  if (!sample) return false
  if (!SHOOTABLE_STATES.includes(sample.status)) return false
  const days = daysSincePublish(sample)
  return days === Infinity || days > N_PUBLISH_DAYS
}

// 距上一次发布的友好文案
export function lastPublishText(sample) {
  const days = daysSincePublish(sample)
  if (days === Infinity) return '从未发布'
  if (days <= 0) return '今天发布'
  return `${days} 天前发布`
}
