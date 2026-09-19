// 「提醒中心」三个口径的唯一真相源
//
// 总览页的 Tab 计数与三个列表页的列表内容都从这里取，
// 避免同一个口径散落在多处、改一处漏一处导致「卡片数字 ≠ 点进去的条数」。
import { needPublishReminder } from './publish'
import { getAccounts, getAggregateCounts, isArchivedSample } from './sampleStatus'

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

// 2) 发布不足5条：**按样品合计**判定，一个未达标样品占一条。
//
// 口径（2026-09-19 最终确定，用户拍板）：
//   把样品**所有账号的发布数加在一起**看。合计 < 5 且没出单，才算「发布不足」。
//   一个样品只占一条，卡片上标出各账号的条数分布，供参考该给谁补。
//
// 为什么不用「逐账号各算各的」（上一版的做法，已废弃）：
//   那样每个账号自己够不够 5 条单独判定，会把「几个账号凑一凑合计够 5 条」的
//   样品也全部捞出来（用户实测列表从 25 条涨到 40 条）。
//   用户明确要的是**按样品合计**的口径，所以改回合计判定。
//
//   代价（已知并接受）：一个样品挂 A、B 两个账号、各发 3 条，合计 6 ≥ 5 →
//   整个样品判为达标、不提醒，尽管 A、B 各自都没发满 5 条。这是合计口径的
//   固有行为，不是 bug。用户知悉该取舍后仍选择合计口径。
//
// ⚠️ 合计用 getAggregateCounts（按账号求和），不用顶层 s.publishCount：
//   顶层 publishCount 是 store 迁移维护的**影子字段**，历史数据可能没跟上；
//   getAggregateCounts 现算各账号之和，更能反映真实分布。
//   但老数据若只有顶层计数、没有 countsByAccount 明细，getCounts 会回退到顶层值，
//   求和后也正确（单账号场景），所以两种形态都兜得住。
//
// 返回形状（保持与「逐账号判定」版一致，UI 无需再改）：
//   { sample, accounts: [{account, publishCount, orderCount, lack}], minPublishCount, minLack }
//   注意 accounts 现在列的是**该样品所有有发布记录的账号**（供展示分布），
//   不再是「未达标账号」——因为判定已经上移到样品级，账号本身不再单独判定。
export function selectLowPublish(samples, limit = LOW_PUBLISH_LIMIT) {
  const out = []
  for (const s of samples || []) {
    // 已放弃/归档的样品不再提醒补发布 —— 它已经不做了，再提示「还差 N 条」是错的。
    // 用 isArchivedSample 而非只看 s.status：它同时兼容 archived 布尔、
    // execByAccount 全 abandoned、以及老的顶层 status 三种形态。
    if (isArchivedSample(s)) continue

    const { publishCount, orderCount } = getAggregateCounts(s)
    // 一条都没发不算「发布不足」，那是「还没发」（属于发布提醒的关注范围）
    if (publishCount <= 0) continue
    if (publishCount >= limit) continue
    // 整个样品已出单就不算「发布不足」这个待办事项了
    if (orderCount !== 0) continue

    // 各账号的条数分布（仅供参考展示，不参与判定）
    const accounts = getAccounts(s)
      .map((a) => {
        const c = s?.countsByAccount?.[a]
        const n = Number(c?.publishCount) || 0
        return { account: a, publishCount: n, orderCount: Number(c?.orderCount) || 0, lack: limit - n }
      })
      // 只展示有发布记录的账号，没发过的不用列出来占位置
      .filter((x) => x.publishCount > 0)
      .sort((x, y) => x.publishCount - y.publishCount)

    out.push({
      sample: s,
      accounts,
      publishCount,
      orderCount,
      minPublishCount: accounts.length ? accounts[0].publishCount : publishCount,
      // 还差多少条：按样品合计算，这才是「补发布」的实际缺口
      minLack: limit - publishCount,
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
