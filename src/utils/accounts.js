// 账号体系统一来源：消除各页面重复定义
// 真实账号名（用于归属、发布、出单）
export const ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']

// 账号主题色（c=文字/边框色，bg=浅底圆角色）
export const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#b45309', bg: 'rgba(245,158,11,0.18)' },      // 琥珀金
  '晚梨不吃梨': { c: '#0d9488', bg: 'rgba(20,184,166,0.16)' },      // 青绿
  '努力成为富婆': { c: '#be185d', bg: 'rgba(244,114,182,0.18)' },   // 玫红
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
