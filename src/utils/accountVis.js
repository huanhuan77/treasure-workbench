// 全局「隐藏账号」开关：开启后所有只读界面不展示真实账号名，改用匿名占位（账号①/账号②…）
// 兼容旧键 samples_hide_account（样品页早期开关），新键 app_hide_accounts 全站生效
export function isAccountsHidden() {
  try {
    return localStorage.getItem('app_hide_accounts') === '1' || localStorage.getItem('samples_hide_account') === '1'
  } catch (e) {
    return false
  }
}

export function setAccountsHidden(v) {
  try {
    localStorage.setItem('app_hide_accounts', v ? '1' : '0')
    localStorage.setItem('samples_hide_account', v ? '1' : '0')
  } catch (e) {}
}

// 匿名展示账号名：同一账号在同一列表内编号稳定（按名称排序后的序号）
// hidden=false 时原样返回；hidden=true 时返回 账号N
export function anonAccount(name, hidden, allNames) {
  if (!name || !hidden) return name || ''
  const sorted = [...new Set(allNames || [])].sort()
  const i = sorted.indexOf(name)
  return i >= 0 ? `账号${i + 1}` : '账号'
}
