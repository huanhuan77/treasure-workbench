// 视频发布 / 出单关联 / N 天未发提醒 相关纯函数
import { todayStr, daysDiff } from './helpers'
import { getAccounts } from './accounts'
import { getAggregateCounts } from './sampleStatus'

// 提醒阈值：超过该天数未发视频即提醒（用户可在「设置」里改）
export const N_PUBLISH_DAYS = 7
let PUBLISH_DAYS = N_PUBLISH_DAYS
export function setPublishDays(n) {
  const v = Number(n)
  if (Number.isFinite(v) && v >= 1 && v <= 365) PUBLISH_DAYS = Math.round(v)
}
export function getPublishDays() { return PUBLISH_DAYS }

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

// 样品下「最久没发」的天数：跨所有账号取最大；任一账号从没发过就是 Infinity
function worstDays(sample) {
  const accs = getAccounts(sample)
  if (!accs.length) return daysSincePublish(sample)
  let max = -1
  for (const a of accs) {
    const d = daysSincePublishByAccount(sample, a)
    if (d === Infinity) return Infinity
    if (d > max) max = d
  }
  return max < 0 ? daysSincePublish(sample) : max
}

export function compareUrgent(a, b) {
  const oa = isOverdueRow(a) ? 1 : 0
  const ob = isOverdueRow(b) ? 1 : 0
  if (oa !== ob) return ob - oa
  // 非逾期：任一账号从没发过（Infinity）排在第二梯队；其余按最久没发天数降序
  const da = worstDays(a)
  const db = worstDays(b)
  const na = da === Infinity ? Number.MAX_SAFE_INTEGER : da
  const nb = db === Infinity ? Number.MAX_SAFE_INTEGER : db
  return nb - na
}

// 样品下「还需要发视频」的账号：从未发过 或 超过 N_PUBLISH_DAYS 天没发。
// 都发过（且未超期）时返回空数组。
//
// 用户口径（2026-10-20）：「已发布 + 已过截止日 也要提醒，按之前的来」——
// 这里不再对「执行状态已发布但没记条数」的账号做特殊豁免，Keep it simple。
// 提醒天数优先级：账号单独设(accountReminderDays[a]) > 产品设(reminderDays) > 默认7天
export function sampleDays(sample, account) {
  const ard = sample?.accountReminderDays || {}
  if (account != null && Number.isFinite(Number(ard[account]))) {
    const v = Number(ard[account])
    if (v >= 1) return Math.round(v)
  }
  const v = Number(sample?.reminderDays)
  return Number.isFinite(v) && v >= 1 ? Math.round(v) : PUBLISH_DAYS
}

// 该账号的天数是不是「单独手动设过的」（用于高频出单 tab 判定）
// 只有账号级单独设了 ≤5 天才算高频；账号没设就走默认7天，不算高频，
// 不能兜底读产品级 reminderDays（否则给刘亦菲设5天会把同品的晚梨也带进高频tab）
export function isHotAccount(sample, account) {
  const ard = sample?.accountReminderDays || {}
  const av = Number(ard[account])
  return Number.isFinite(av) && av >= 1 && av <= 5
}

// 发布提醒的唯一锚点：**距离上一次发布**（用户要求「不要出单后 7 天提醒了，改为距离上一次发布提醒」）。
// 出单日期不再参与判定（countsByAccount.lastOrderAt 仅作统计保留）。
// 天数按账号口径（账号单独设 > 产品设 > 默认 7）；从未发布过 → 也算该发。
// 边界：隔 N 天（第 N 天）就提醒。
export function accountDue(sample, account) {
  const th = sampleDays(sample, account)
  const d = daysSincePublishByAccount(sample, account)
  return d === Infinity || d >= th
}

export function pendingAccounts(sample) {
  return getAccounts(sample).filter((a) => accountDue(sample, a))
}

// 「高频出单」tab 里「每 N 天提醒」的展示值。
// 必须取**高频账号**（≤5 天）的天数，不能拿产品级/默认的 7 天：
// 用户反馈「我不是改成了 5 天吗」—— 行内账号可能是按 7 天口径的那个账号，
// 直接用它算就会显示「每7天提醒」，看起来像设置没生效。
export function hotReminderDays(sample) {
  const accs = pendingAccounts(sample).filter((a) => isHotAccount(sample, a))
  const list = accs.length ? accs : getAccounts(sample).filter((a) => isHotAccount(sample, a))
  if (list.length) return Math.min(...list.map((a) => sampleDays(sample, a)))
  return sampleDays(sample, getAccounts(sample)[0])
}

// 「发布提醒」这一行该显示哪些账号（以及按谁算未发布天数）。
//
// 口径：
//   ① **从未发过**这个品的账号 → 一定要列（真正需要动手的就是它们）；
//   ② **已到该发天数**（超 N 天没发）的账号 → 也要列。
//      原来是「只要有没有发过的账号就只列它」，会把同样到天数的其他账号漏掉，
//      用户反馈「另外的账号怎么没提醒呢」——所以改成两者的并集。
//      （副作用：某个账号刚在 N 天内发过就不在其中，不会出现「发过还要再发」。）
//   ③ 都不满足 → 退回全部账号，避免账号列空着。
export function reminderAccounts(sample) {
  const accs = getAccounts(sample)
  if (!accs.length) return []
  const counts = (sample && sample.countsByAccount) || {}
  // 同上：不再按 execByAccount='abandoned' 过滤（那个老字段界面上看不到也改不了）
  const never = accs.filter((a) => (Number(counts[a]?.publishCount) || 0) === 0)
  const stale = pendingAccounts(sample)
  const due = accs.filter((a) => never.includes(a) || stale.includes(a))
  return due.length ? due : accs
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
  // 按账号检查：截止日期已过，某个账号从未发布过（publishCount=0）→ 提醒
  if (isOverdue(sample)) {
    const counts = sample.countsByAccount || {}
    const accounts = getAccounts(sample)
    const anyUnpublished = accounts.some((a) => (Number(counts[a]?.publishCount) || 0) === 0)
    if (anyUnpublished) return true
  }
  // 按账号判定「距上次发布是否超期」。
  // ⚠️ 不再看 execByAccount === 'abandoned'（老的单账号兼容字段，UI 已经不展示/不能改）：
  //    它会被「出单后又发满5条无新单」的自动放弃规则写入，导致样品在界面上看着正常
  //    （状态=已拍/已发布、提示天数也都对），却永远不进提醒，用户完全无从修改
  //    （用户反馈「没放弃啊」）。现在只有**样品级归档**(archived) 才排除提醒。
  for (const a of getAccounts(sample)) {
    if (accountDue(sample, a)) return true
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
