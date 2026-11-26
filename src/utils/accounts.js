// 账号体系统一来源：消除各页面重复定义
//
// 两级概念（2026-11-26 新增视频号的两个具体号「奶油」「发財」后引入）：
//   ACCOUNTS      —— 展示/统计全集，含历史旧代号「视频号」。所有「按账号汇总」的循环都用它，
//                    否则以前记在「视频号」名下的老记录会在统计里被跳过。
//   PICK_ACCOUNTS —— 新建/编辑记录时真正可选的账号（三个抖音达人 + 视频号两个具体号）。
//                    「视频号」这个笼统账号只用于历史数据展示，不再出现在选择器里。
export const DOUYIN_ACCOUNTS = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
// 视频号下的两个具体号（用户 2026-11-26 新增）
export const VIDEO_ACCOUNTS = ['奶油', '发財']
// 历史旧代号：不再新建，但老数据里有它，展示与统计要照常
export const LEGACY_ACCOUNTS = ['视频号']

// 展示/统计全集（顺序 = 账号排序顺序，旧代号固定排最后）
export const ACCOUNTS = [...DOUYIN_ACCOUNTS, ...VIDEO_ACCOUNTS, ...LEGACY_ACCOUNTS]

// 新建/编辑记录时可选的账号
export const PICK_ACCOUNTS = [...DOUYIN_ACCOUNTS, ...VIDEO_ACCOUNTS]

// 发布计划可排的账号 = 三个达人 + 视频号两个具体号
export const PLAN_ACCOUNTS = [...PICK_ACCOUNTS]

// 可「记发布 / 记出单」的账号 = 同上
export const PUBLISH_ACCOUNTS = [...PICK_ACCOUNTS]

// 是否属于视频号渠道（含历史旧代号）
export const isVideoAccount = (a) => VIDEO_ACCOUNTS.includes(a) || LEGACY_ACCOUNTS.includes(a)

// 账号主题色（c=文字/边框色，bg=浅底圆角色）
export const ACCOUNT_COLOR = {
  '广东刘亦菲': { c: '#b45309', bg: 'rgba(245,158,11,0.18)' },      // 琥珀金
  '晚梨不吃梨': { c: '#0d9488', bg: 'rgba(20,184,166,0.16)' },      // 青绿
  '努力成为富婆': { c: '#be185d', bg: 'rgba(244,114,182,0.18)' },   // 玫红
  '奶油': { c: '#2563eb', bg: 'rgba(37,99,235,0.16)' },            // 视频号·奶油（渠道蓝）
  '发財': { c: '#0891b2', bg: 'rgba(8,145,178,0.16)' },             // 视频号·发財（青蓝）
  '视频号': { c: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },         // 历史旧代号，弱化灰
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
