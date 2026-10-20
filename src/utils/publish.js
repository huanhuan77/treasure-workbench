// 视频发布 / 出单关联 / N 天未发提醒 相关纯函数
import { todayStr, daysDiff } from './helpers'
import { getAccounts } from './accounts'
import { getAggregateCounts } from './sampleStatus'

// 提醒阈值：超过该天数未发视频即提醒
export const N_PUBLISH_DAYS = 7

// 已发布状态（用于「出单」只能关联已发布样品）
export const PUBLISHED_STATES = ['published']

// 可记视频发布的状态（已拍摄未发布 / 已发布 都可发；未到货、已到货未拍摄、放弃 不可发）
export const SHOOTABLE_STATES = ['shot', 'published']

// 逾期提醒仅针对仍需处理的待发状态；已发布（截止日对发布提醒无意义）、放弃 不计入
export const OVERDUE_STATES = ['un_arrived', 'arrived', 'shot']

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

// 某账号距上次发布天数（基于该账号自己的发布统计）。无记录返回 Infinity
export function daysSincePublishByAccount(sample, account) {
  const c = (sample && sample.countsByAccount && sample.countsByAccount[account]) || null
  const d = c && c.lastPublishAt
  if (!d) return Infinity
  const last = new Date(d)
  const now = new Date(todayStr())
  if (isNaN(last.getTime())) return Infinity
  return Math.floor((now - last) / 86400000)
}

// 「最紧急优先」排序：**已逾期排最前面**，其次「多久没发视频」由久到近
// （没发过视频的 daysSincePublish = Infinity，也排最前）。
//
// ⚠️ 逾期的判定要和界面上那枚红色「已逾期」标签完全一致：
//    标签是 `status !== 'published' && isOverdue(s)`，如果这里只看 isOverdue，
//    「已发布但截止日已过」的行也会被算成逾期排到最前，把真正逾期的行挤下去
//    （PC 总览踩过这个坑）。手机端总览 / 发布提醒页、PC 总览的兜底比较共用这一份。
function isOverdueRow(sample) {
  return !!sample && sample.status !== 'published' && isOverdue(sample)
}

export function compareUrgent(a, b) {
  const oa = isOverdueRow(a) ? 1 : 0
  const ob = isOverdueRow(b) ? 1 : 0
  if (oa !== ob) return ob - oa
  const da = daysSincePublish(a)
  const db = daysSincePublish(b)
  const na = da === Infinity ? Number.MAX_SAFE_INTEGER : da
  const nb = db === Infinity ? Number.MAX_SAFE_INTEGER : db
  return nb - na
}

// 样品下「还需要发视频」的账号：从未发过 或 超过 N_PUBLISH_DAYS 天没发。
// 都发过（且未超期）时返回空数组。
//
// ⚠️ 特例（用户反馈「我改了状态它不是应该消失吗」）：
//   账号的执行状态已经是 published、只是没记发布条数/日期（counts 为空）时，
//   说明这个账号已经发过了（用户手动改的状态），不该再按「从未发过」催。
//   所以 Infinity 分两种：exec 未发布 → 真没发；exec 已发布 → 已发但缺日期，不催。
export function pendingAccounts(sample) {
  const exec = (sample && sample.execByAccount) || {}
  return getAccounts(sample).filter((a) => {
    if (exec[a] === 'abandoned') return false
    const d = daysSincePublishByAccount(sample, a)
    if (d === Infinity) return exec[a] !== 'published'
    return d > N_PUBLISH_DAYS
  })
}

// 「发布提醒」这一行该显示哪些账号（以及按谁算未发布天数）。
//
// 口径（用户反馈「晚梨已经发过了，应该只提醒一个账号吧」）：
//   ① 有账号**从未发过**这个品 → 只列这些账号。真正需要动手的就是它们；
//      已经发过的账号（哪怕它自己 49 天没发）不该被挂在这一行里，
//      否则看起来像「发过还要再发」，与手机端的展示也对不上。
//   ② 都发过 → 退回「超 N 天没发」的账号（这是「已出单样品催更」的场景）；
//   ③ 都不满足 → 退回全部账号，避免账号列空着。
export function reminderAccounts(sample) {
  const accs = getAccounts(sample)
  if (!accs.length) return []
  const counts = (sample && sample.countsByAccount) || {}
  const exec = (sample && sample.execByAccount) || {}
  const never = accs.filter((a) => (
    exec[a] !== 'abandoned'
    && exec[a] !== 'published'   // 执行状态已是「已发布」→ 视作发过，不再当「从未发」
    && (Number(counts[a]?.publishCount) || 0) === 0
  ))
  if (never.length) return never
  const stale = pendingAccounts(sample)
  return stale.length ? stale : accs
}

// 是否逾期（有截止时间且已过今天）
export function isOverdue(sample) {
  const d = daysDiff(sample?.deadline)
  return d !== null && d < 0
}

// 发布提醒规则：
// 1) 放弃的样品不提醒；
// 2) 逾期（截止时间已过）一律提醒；
// 3) 已出单的样品（orderCount>0，即在出单记录列表中），在该账号下 7 天未发视频才提醒
//    —— 未出单的样品（无论已拍摄/已发布）不再按「N 天未发」提醒，避免无关打扰。
// 4) 即使样品整体已发布，某个账号从未发布且已过截止日期，也要提醒
export function needPublishReminder(sample) {
  if (!sample) return false
  if (sample.archived || sample.status === 'abandoned') return false   // 归档(放弃)不提醒
  // 逾期：仅仍需处理的待发状态（未到货/已到货未拍摄/已拍摄未发布）才提醒，已发布的过去截止日不计
  if (isOverdue(sample) && OVERDUE_STATES.includes(sample.status)) return true
  // 按账号检查：截止日期已过，某个账号从未发布过（publishCount=0）且未放弃 → 提醒
  if (isOverdue(sample)) {
    const execByAccount = sample.execByAccount || {}
    const counts = sample.countsByAccount || {}
    const accounts = getAccounts(sample)
    const anyUnpublished = accounts.some((a) => {
      if (execByAccount[a] === 'abandoned') return false
      // 执行状态已是「已发布」→ 用户已确认这个账号发过（哪怕没记条数），不再按「从未发」提醒
      if (execByAccount[a] === 'published') return false
      const pc = Number(counts[a]?.publishCount) || 0
      return pc === 0
    })
    if (anyUnpublished) return true
  }
  // 已发布 + 已过截止日：不再按「N 天没发」催更（用户反馈「我改了状态它不是应该消失吗」）。
  // 逾期该提醒的两种情况上面已经判完：待发状态逾期（规则 2）、某账号从未发（规则 4）。
  // 剩下的「已发布但很久没发」再挂在逾期里催，用户会以为改状态没生效。
  if (isOverdue(sample)) return false
  // 已发布的样品：某个账号超过 7 天没发，就提醒
  // 未拍/未到货的样品不走这个判断（它们由逾期逻辑管）
  {
    const counts = sample.countsByAccount || {}
    const hasAnyPublish = Object.values(counts).some((c) => (Number(c?.publishCount) || 0) > 0)
    if (hasAnyPublish) {
      const execByAccount = sample.execByAccount || {}
      const accounts = getAccounts(sample)
      const anyNeed = accounts.some((a) => {
        if (execByAccount[a] === 'abandoned') return false
        const d = daysSincePublishByAccount(sample, a)
        // 已发布但没有日期记录 → 视为已发，不按「从未发」催（与 pendingAccounts 同口径）
        if (d === Infinity) return execByAccount[a] !== 'published'
        return d > N_PUBLISH_DAYS
      })
      if (anyNeed) return true
    }
  }
  return false
}

// 距上一次发布的友好文案
export function lastPublishText(sample) {
  const days = daysSincePublish(sample)
  if (days === Infinity) return '从未发布'
  if (days <= 0) return '今天发布'
  return `${days} 天前发布`
}
