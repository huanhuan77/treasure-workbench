// 全局「隐藏账号」开关：开启后所有只读界面不展示真实账号名，统一显示星号
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

// 匿名展示账号名：隐藏时统一显示星号
export function anonAccount(name, hidden) {
  if (!name || !hidden) return name || ''
  return '***'
}
