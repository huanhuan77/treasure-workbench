// 账号体系统一来源：消除各页面重复定义
// 真实账号名（用于归属、发布、出单）
export const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']

// 账号主题色（c=文字/边框色，bg=浅底圆角色）
export const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#c2410c', bg: 'rgba(251,146,60,0.16)' },
  '晚梨不吃梨': { c: '#1d4ed8', bg: 'rgba(59,130,246,0.16)' },
  '努力成为富婆': { c: '#7e22ce', bg: 'rgba(168,85,247,0.16)' },
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
