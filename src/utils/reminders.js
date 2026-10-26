// 「提醒中心」四个口径的唯一真相源
//
// 总览页的 Tab 计数与三个列表页的列表内容都从这里取，
// 避免同一个口径散落在多处、改一处漏一处导致「卡片数字 ≠ 点进去的条数」。
import { needPublishReminder, isHotAccount, pendingAccounts } from './publish'
import { getAccounts, isArchivedSample, isShotSample } from './sampleStatus'

// 发布不足的阈值：某产品发布数低于它即视为「发布不足」
export const LOW_PUBLISH_LIMIT = 10

// 即将到期的天数窗口
export const EXPIRING_DAYS = 7

// 四个 Tab 的标签与跳转目标。
export const REMINDER_TABS = [
  { id: 'hot', label: '高频出单', mid: '高频', short: '高频', accent: '#f43f5e', to: '/publish-reminders' },
  { id: 'reminders', label: '发布提醒', mid: '待发布', short: '待发', accent: '#ec4899', to: '/publish-reminders' },
  { id: 'low', label: '发布不足10', mid: '不足10', short: '不足', accent: '#8b5cf6', to: '/samples/low-publish' },
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

// 1) 发布提醒：从未发布过，或（出过单 + 超过阈值没发布）。
//    「高频出单」（手动设了提醒天数且 ≤5 天）的账号单独成 tab，不混在这里。
export function isHotCadence(sample) {
  return pendingAccounts(sample).some((a) => isHotAccount(sample, a))
}

export function selectPublishReminders(samples, orders = []) {
  const orderedSampleIds = new Set((orders || []).map((o) => o.sampleId).filter(Boolean))
  return (samples || []).filter((s) => {
    if (!needPublishReminder(s)) return false
    const due = pendingAccounts(s)
    if (!due.length) return false
    // 与「高频出单」互斥
    if (due.some((a) => isHotAccount(s, a))) return false
    // 没拍过视频的不进发布提醒（由「即将到期」盯截止日）
    if (!isShotSample(s)) return false

    // 互斥口径：出过单的 → 进发布提醒；没出单的 → 归发布不足10
    if (orderedSampleIds.has(s.id)) return true

    // 没出单的：只有「从未发布过」（所有账号 publishCount=0）才进发布提醒
    // 发了1~9条但没出单的，归发布不足10
    const accs = getAccounts(s)
    const allNeverPublished = accs.every((a) => (Number(s?.countsByAccount?.[a]?.publishCount) || 0) === 0)
    return allNeverPublished
  })
}

// 高频出单：有账号按 ≤5 天高频口径、当前已到该发的产品
export function selectHotCadence(samples) {
  return (samples || []).filter((s) => !s.archived && needPublishReminder(s) && isHotCadence(s))
}

// 2) 发布不足10：发布了没有出单，且发布数量 > 0 且 < 10（按账号粒度）。
//    与「发布提醒」互斥：整个样品出过单的不在这里。
//    从未发布过（0条）的归「发布提醒」，不在此处。
export function selectLowPublish(samples, limit = LOW_PUBLISH_LIMIT, orders = []) {
  const out = []
  const orderedSampleIds = new Set((orders || []).map((o) => o.sampleId).filter(Boolean))
  for (const s of samples || []) {
    if (isArchivedSample(s)) continue
    // 出过单的样品不在这里
    if (orderedSampleIds.has(s.id)) continue

    // 按账号单独判定：每个账号自己发了 1~9 条
    const allAccounts = getAccounts(s).map((a) => {
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

// 3) 即将到期：有截止日期、且未发布/未放弃、EXPIRING_DAYS 天内到期（含已逾期），按截止日升序
export function selectExpiringSoon(samples, days = EXPIRING_DAYS) {
  return (samples || [])
    .filter((s) => {
      if (isArchivedSample(s)) return false
      if (!s.deadline || s.status === 'published') return false
      const d = daysUntilDeadline(s.deadline)
      return d !== null && d <= days
    })
    .sort((a, b) => (daysUntilDeadline(a.deadline) ?? 999) - (daysUntilDeadline(b.deadline) ?? 999))
}

// 一次性取出四组，供总览 Tab 与列表页共用（PC + H5 同口径）
export function selectAllReminders(samples, orders = []) {
  return {
    hot: selectHotCadence(samples),
    reminders: selectPublishReminders(samples, orders),
    low: selectLowPublish(samples, LOW_PUBLISH_LIMIT, orders),
    expiring: selectExpiringSoon(samples),
  }
}
