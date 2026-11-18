// 账号体系统一来源：消除各页面重复定义
// 真实账号名（用于归属、发布、出单）
export const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']

// 发布计划可排的账号 = 三个达人账号 + 视频号。
// 视频号在样品里已经是一等账号（SampleDialog 的 FORM_ACCOUNTS 同样拼了它），
// 但发布计划原来只认 ACCOUNTS，导致排不了视频号的品（用户要求「发布计划加一个视频号」）。
// 单独列一个列表，避免影响出单页、发布记录页那些只针对达人账号的口径。
export const PLAN_ACCOUNTS = [...ACCOUNTS, '视频号']

// 可「记发布 / 记出单」的账号 = 三个达人 + 视频号（用户要求「视频号发布/提醒也走一样的逻辑」）。
// 视频号原本在样品里是一等账号，但记发布页只列 ACCOUNTS，导致视频号的品永远记不上发布、
// 在提醒中心永远显示「从未发布」。用这张表让视频号跟达人走同一套判定。
export const PUBLISH_ACCOUNTS = [...ACCOUNTS, '视频号']

// 账号主题色（c=文字/边框色，bg=浅底圆角色）
export const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#b45309', bg: 'rgba(245,158,11,0.18)' },      // 琥珀金
  '晚梨不吃梨': { c: '#0d9488', bg: 'rgba(20,184,166,0.16)' },      // 青绿
  '努力成为富婆': { c: '#be185d', bg: 'rgba(244,114,182,0.18)' },   // 玫红
  '视频号': { c: '#2563eb', bg: 'rgba(37,99,235,0.14)' },           // 渠道蓝（与三个达人账号的金/青/玫红拉开，也不和青绿撞色）
}

// 旧代号 → 真实账号名（历史数据兼容）
export const ACCOUNT_MAP = { '大号': '广东刘亦菲', '小号': '晚梨不吃梨', '小小号': '努力成为富婆' }
export const mapAccount = (a) => (a && ACCOUNT_MAP[a]) || a || ''

// 取样品归属账号数组（兼容单 account 旧字段）
export function getAccounts(sample) {
  if (Array.isArray(sample?.accounts) && sample.accounts.length) return sample.accounts
  if (sample?.account) return [sample.account]
  return []
}

// 判断某账号是否属于该样品归属
export function hasAccount(sample, account) {
  return getAccounts(sample).includes(account)
}

// ── 隐藏账号 = **打星号**（不是筛选掉，用户明确「是账号显示星号，不是筛选」）──
// 规则：保留首字 + 其余用 * 代替（广东刘亦菲 → 广****），既能区分不同账号，
// 又不会把名字露出来。传入 hidden 列表，命中即打码。
export function maskAccount(name, hidden) {
  if (!name) return name
  if (!Array.isArray(hidden) || !hidden.includes(name)) return name
  const s = String(name)
  return s.slice(0, 1) + '*'.repeat(Math.max(2, s.length - 1))
}

// 便捷版：直接拿到用于展示的账号名
export function accountLabel(name, hidden) {
  return maskAccount(name, hidden)
}
