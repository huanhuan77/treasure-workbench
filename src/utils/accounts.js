// 账号体系统一来源：消除各页面重复定义
//
// 两级概念：
//   ACCOUNTS      —— 展示/统计全集（当前在用的 3 个达人 + 2 个视频号具体号）。
//   PICK_ACCOUNTS —— 新建/编辑记录时真正可选的账号（与 ACCOUNTS 一致）。
//   LEGACY_ACCOUNTS —— 历史旧代号「视频号」，只用于兜底展示，不再出现在选择器/标签里。
//
// 历史数据兼容：localStorage 里存的可能是旧名（广东刘亦菲/晚梨不吃梨/努力成为富婆/大号…），
// 统一经 mapAccount 归一到新名；颜色表同时保留旧名键，直接查表也不会丢色。

export const DOUYIN_ACCOUNTS = ['刘亦菲', '晚梨', '富婆']
// 视频号下的两个具体号
export const VIDEO_ACCOUNTS = ['奶油', '发財']
// 历史旧代号：不再新建、不再展示，仅兜底老数据
export const LEGACY_ACCOUNTS = ['视频号']

// 展示/统计全集（顺序 = 账号排序顺序）
export const ACCOUNTS = [...DOUYIN_ACCOUNTS, ...VIDEO_ACCOUNTS]

// 新建/编辑记录时可选的账号
export const PICK_ACCOUNTS = [...DOUYIN_ACCOUNTS, ...VIDEO_ACCOUNTS]

// 发布计划可排的账号
export const PLAN_ACCOUNTS = [...PICK_ACCOUNTS]

// 可「记发布 / 记出单」的账号
export const PUBLISH_ACCOUNTS = [...PICK_ACCOUNTS]

// 是否属于视频号渠道（含历史旧代号）
export const isVideoAccount = (a) => VIDEO_ACCOUNTS.includes(a) || LEGACY_ACCOUNTS.includes(a)

// 历史旧代号「视频号」：不再出现在任何标签/选择器/统计分组里，归一阶段直接剔除
export const isLegacyAccount = (a) => LEGACY_ACCOUNTS.includes(a)

// 账号主题色（c=文字/边框色，bg=浅底圆角色），以新名为键
const COLORS = {
  '刘亦菲': { c: '#b45309', bg: 'rgba(245,158,11,0.18)' },      // 琥珀金
  '晚梨': { c: '#0d9488', bg: 'rgba(20,184,166,0.16)' },         // 青绿
  '富婆': { c: '#be185d', bg: 'rgba(244,114,182,0.18)' },        // 玫红
  '奶油': { c: '#2563eb', bg: 'rgba(37,99,235,0.16)' },          // 视频号·奶油（渠道蓝）
  '发財': { c: '#0891b2', bg: 'rgba(8,145,178,0.16)' },          // 视频号·发財（青蓝）
  '视频号': { c: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },      // 历史旧代号，弱化灰
}

// 旧名 / 旧代号 → 新名（历史数据兼容）
export const ACCOUNT_MAP = {
  '广东刘亦菲': '刘亦菲',
  '晚梨不吃梨': '晚梨',
  '努力成为富婆': '富婆',
  '大号': '刘亦菲',
  '小号': '晚梨',
  '小小号': '富婆',
}
export const mapAccount = (a) => (a && ACCOUNT_MAP[a]) || a || ''

// 颜色表：新名 + 旧名/旧代号都能取到同一颜色（老数据直接查表也不丢色）
export const ACCOUNT_COLOR = (() => {
  const out = { ...COLORS }
  for (const [oldName, newName] of Object.entries(ACCOUNT_MAP)) {
    if (COLORS[newName]) out[oldName] = COLORS[newName]
  }
  return out
})()

// 取色：先归一化名字再查表，兜底灰色
export function accountColor(a) {
  return ACCOUNT_COLOR[mapAccount(a)] || { c: '#8a8f98', bg: 'rgba(148,163,184,0.16)' }
}

// 取样品归属账号数组（兼容单 account 旧字段）
export function getAccounts(sample) {
  if (Array.isArray(sample?.accounts) && sample.accounts.length) return sample.accounts.map(mapAccount)
  if (sample?.account) return [mapAccount(sample.account)]
  return []
}

// 判断某账号是否属于该样品归属
export function hasAccount(sample, account) {
  return getAccounts(sample).includes(account)
}

// ── 隐藏账号 = **打星号**（不是筛选掉，用户明确「是账号显示星号，不是筛选」）──
// 规则：保留首字 + 其余用 * 代替，既能区分不同账号，又不会把名字露出来。传入 hidden 列表，命中即打码。
export function maskAccount(name, hidden) {
  if (!name) return name
  const n = mapAccount(name)
  if (!Array.isArray(hidden) || !hidden.includes(n)) return n
  const s = String(n)
  return s.slice(0, 1) + '*'.repeat(Math.max(2, s.length - 1))
}

// 便捷版：直接拿到用于展示的账号名
export function accountLabel(name, hidden) {
  return maskAccount(name, hidden)
}
