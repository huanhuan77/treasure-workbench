// 「提醒中心」四个口径的唯一真相源
//
// 总览页的 Tab 计数与三个列表页的列表内容都从这里取，
// 避免同一个口径散落在多处、改一处漏一处导致「卡片数字 ≠ 点进去的条数」。
import { needPublishReminder, isHotAccount, pendingAccounts } from './publish'
import { getAccounts, isArchivedSample, isShotSample, getTopStatus } from './sampleStatus'
import { isVideoAccount, cleanAccountOption } from './accounts'

// 发布不足的阈值：某产品发布数低于它即视为「发布不足」
export const LOW_PUBLISH_LIMIT = 10

// 旧「即将到期」天数窗口常量（保留导出兼容，页面口径已改为全部已拍未发）
export const EXPIRING_DAYS = 7

// 归属账号里只有「视频号」的样品：不进提醒中心（用户要求）。
// 提醒中心只针对三个达人账号做建议，视频号样品混在里面既没有对应账号胶囊，
// 也抢占了本该给达人的提醒位置。
export function isWechatOnlySample(sample) {
  const accs = getAccounts(sample)
  return accs.length > 0 && accs.every((a) => isVideoAccount(a))
}

// 四个 Tab 的标签与跳转目标。
export const REMINDER_TABS = [
  { id: 'hot', label: '高频出单', mid: '高频', short: '高频', accent: '#f43f5e', to: '/publish-reminders' },
  { id: 'reminders', label: '发布提醒', mid: '待发布', short: '待发', accent: '#ec4899', to: '/publish-reminders' },
  { id: 'low', label: '发布不足10', mid: '不足10', short: '不足', accent: '#8b5cf6', to: '/samples/low-publish' },
  { id: 'expiring', label: '已拍未发', mid: '未发', short: '未发', accent: '#06b6d4', to: '/samples/expiring' },
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

// 1) 发布提醒：从未发布过，或（出过单 + 超过阈值没发布）。
//    「高频出单」（手动设了提醒天数且 ≤5 天）的账号单独成 tab，不混在这里。
export function isHotCadence(sample) {
  return pendingAccounts(sample).some((a) => isHotAccount(sample, a))
}

// 「这个样品会不会进发布提醒」的唯一判据。
// 抽成函数是为了让「发布不足10」也能调用同一份口径做**整品互斥**（用户要求：
// 发布提醒里出现过的样品，就不要再在发布不足10 里出现一次）。
// 返回 true = 进发布提醒；false/undefined = 不进。
function inPublishReminder(s, orderedSampleIds) {
  // 注意：这里**不**排除「只有视频号」的样品（用户指定「发布提醒（待发）不要跳过」）——
  // 视频号专属品该发视频时也要在这栏提醒；只有高频出单 / 发布不足10 / 已拍未发三栏会跳过它。
  if (!needPublishReminder(s)) return false
  const due = pendingAccounts(s)
  if (!due.length) return false
  // 与「高频出单」按账号粒度互斥：高频到期账号归高频 tab；
  // 只要还有非高频到期账号，样品就留在发布提醒，卡片只挂这些非高频账号。
  // 不能按整品判定：一个账号设了高频，不能把另一个普通到期账号的提醒一起吞掉。
  const nonHotDue = due.filter((a) => !isHotAccount(s, a))
  if (!nonHotDue.length) return false
  // 没拍过视频的不进发布提醒（已拍未发 tab 统一按状态盯）
  if (!isShotSample(s)) return false
  // 与「已拍未发」整品互斥：全部账号都还没发布过的样品归已拍未发 tab，
  // 不在发布提醒里重复提醒；只要有任一账号发过视频（代表态为已发布），仍按下面的账号粒度分流。
  if (getTopStatus(s) === 'shot') return false

  // 互斥口径：出过单的 → 进发布提醒；没出单的 → 归发布不足10
  if (orderedSampleIds.has(s.id)) return true

  // 没出单：只要还有账号从没发过（publishCount=0），这个样品就进发布提醒，
  // 卡片只挂这些待发账号（reminderAccounts）。
  const accs = getAccounts(s)
  return accs.some((a) => (Number(s?.countsByAccount?.[a]?.publishCount) || 0) === 0)
}

export function selectPublishReminders(samples, orders = []) {
  const orderedSampleIds = new Set((orders || []).map((o) => o.sampleId).filter(Boolean))
  return (samples || []).filter((s) => !isArchivedSample(s) && inPublishReminder(s, orderedSampleIds))
}

// 高频出单：有账号按 ≤5 天高频口径、当前已到该发的产品
export function selectHotCadence(samples) {
  return (samples || []).filter((s) => !isArchivedSample(s) && !isWechatOnlySample(s) && needPublishReminder(s) && isHotCadence(s))
}

// 2) 发布不足10：发布了没有出单，且发布数量 > 0 且 < 10（按账号粒度）。
//    与「发布提醒」**整品互斥**（用户要求）：只要这个样品会上「发布提醒」，
//    它整体就不出现在这里 —— 同一产品不该在两个 Tab 各提醒一次，先按更紧急的发布提醒处理。
//    与「发布提醒」的另一半互斥：整个样品出过单的也不在这里。
export function selectLowPublish(samples, limit = LOW_PUBLISH_LIMIT, orders = []) {
  const out = []
  const orderedSampleIds = new Set((orders || []).map((o) => o.sampleId).filter(Boolean))
  for (const s of samples || []) {
    if (isArchivedSample(s)) continue
    if (isWechatOnlySample(s)) continue
    // 出过单的样品不在这里
    if (orderedSampleIds.has(s.id)) continue
    // 整品互斥：已经归「发布提醒」的样品不在「发布不足10」重复出现
    if (inPublishReminder(s, orderedSampleIds)) continue

    // 按账号单独判定：每个账号自己发了 1~9 条；旧代号「视频号」不上提醒标签
    const allAccounts = getAccounts(s)
      .map((a) => cleanAccountOption(a))
      .filter(Boolean)
      .map((a) => {
      const c = s?.countsByAccount?.[a]
      const n = Number(c?.publishCount) || 0
      return { account: a, publishCount: n, orderCount: Number(c?.orderCount) || 0, lack: limit - n }
    })
    const qualifying = allAccounts.filter((x) => x.publishCount > 0 && x.publishCount < limit)
    if (!qualifying.length) continue

    out.push({
      sample: s,
      accounts: qualifying.sort((x, y) => x.publishCount - y.publishCount),
      publishCount: qualifying.reduce((sum, x) => sum + x.publishCount, 0),
      orderCount: 0,
      minPublishCount: qualifying[0].publishCount,
      minLack: Math.min(...qualifying.map((x) => x.lack)),
    })
  }
  return out
}

// 3) 已拍未发：状态代表态为「已拍未发」（已到货、已拍摄、任一账号都未发布、未归档），
//    不再限截止日 7 天窗口，所有已拍未发的都列出；有截止日的按截止日升序在前，无截止日在后。
export function selectShotUnpublished(samples) {
  return (samples || [])
    .filter((s) => !isArchivedSample(s) && !isWechatOnlySample(s) && getTopStatus(s) === 'shot')
    .sort((a, b) => {
      const da = daysUntilDeadline(a.deadline) ?? 9999
      const db = daysUntilDeadline(b.deadline) ?? 9999
      if (da !== db) return da - db
      return (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN')
    })
}

// 兼容旧引用名（PC / H5 多处仍 import selectExpiringSoon）
export const selectExpiringSoon = selectShotUnpublished

// 一次性取出四组，供总览 Tab 与列表页共用（PC + H5 同口径）
export function selectAllReminders(samples, orders = []) {
  return {
    hot: selectHotCadence(samples),
    reminders: selectPublishReminders(samples, orders),
    low: selectLowPublish(samples, LOW_PUBLISH_LIMIT, orders),
    expiring: selectExpiringSoon(samples),
  }
}
