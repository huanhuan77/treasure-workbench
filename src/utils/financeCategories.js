// 收支分类（全站唯一来源）
//
// 原来这份表在 4 个文件里各抄了一遍：PcFinance.jsx（PC 弹窗）、FinancePage.jsx、
// NewTransactionPage.jsx、EditTransactionPage.jsx（手机端三页）。加一个分类要改 4 处，
// 很容易出现「PC 能选、手机选不到」的漂移 —— 这里统一成公共模块。
//
// 字段：label 显示名 / type income|expense / color 文字色 / bg 选中时的浅底。
// 新增分类时记得同时加进下面的 INCOME_TYPES / EXPENSE_TYPES（顺序即按钮顺序）。
export const CATEGORIES = {
  // ── 收入类 ──
  sample: { label: '样品收入', type: 'income', color: '#0d9488', bg: 'rgba(204, 251, 241, 0.8)' },
  haitao: { label: '海淘', type: 'income', color: '#0284c7', bg: 'rgba(224, 242, 254, 0.8)' },
  xingchuan: { label: '星川', type: 'income', color: '#c2410c', bg: 'rgba(255, 237, 213, 0.8)' },
  withdraw: { label: '钱包提现', type: 'income', color: '#7c3aed', bg: 'rgba(237, 233, 254, 0.8)' },
  // 其他收入：用户要求补的兜底项，中性灰，不参与任何统计口径
  other_income: { label: '其他收入', type: 'income', color: '#6b7280', bg: 'rgba(243, 244, 246, 0.9)' },
  // ── 支出类 ──
  prop: { label: '拍摄道具', type: 'expense', color: '#e11d48', bg: 'rgba(254, 226, 226, 0.8)' },
  other_expense: { label: '其他支出', type: 'expense', color: '#c2410c', bg: 'rgba(255, 237, 213, 0.8)' },
  ad: { label: '投流推广', type: 'expense', color: '#be123c', bg: 'rgba(255, 228, 230, 0.8)' },
}

export const INCOME_TYPES = ['sample', 'haitao', 'xingchuan', 'withdraw', 'other_income']
export const EXPENSE_TYPES = ['prop', 'other_expense', 'ad']

// 未知分类（历史数据里的旧 key）显示成中性的「其他」
export const FALLBACK_CATEGORY = { label: '其他', type: 'expense', color: '#6b7280', bg: 'rgba(243, 244, 246, 0.9)' }
