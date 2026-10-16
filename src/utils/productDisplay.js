// 产品展示层的共用格式化与配色。
// PC 版（src/pc）与手机版页面共用这一份，避免两套 UI 各写一份导致口径漂移
// （这正是「PC 重写展示层、但数据与规则统一」这条路线要守住的边界）。

// 每个分类一个固定颜色 + 第一字作为图标文字
export const CATEGORY_STYLE = {
  '保健品': { bg: '#d1fae5', color: '#059669' },  // 绿
  '护肤':   { bg: '#fce7f3', color: '#ec4899' },  // 粉
  '美妆':   { bg: '#fee2e2', color: '#dc2626' },  // 红
  '饮品':   { bg: '#ffedd5', color: '#c2410c' },  // 橙
  '食品':   { bg: '#fef3c7', color: '#d97706' },  // 黄
  '洗护':   { bg: '#dbeafe', color: '#3b82f6' },  // 蓝
  '日用':   { bg: '#ede9fe', color: '#7c3aed' },  // 紫
  '其他':   { bg: '#f3f4f6', color: '#6b7280' },  // 灰
}

// 分类缩写（图标里的两个字）
export const CAT_SHORT = {
  '保健品': '保健',
  '护肤':   '护肤',
  '美妆':   '美妆',
  '饮品':   '饮品',
  '食品':   '食品',
  '洗护':   '洗护',
  '日用':   '日用',
  '其他':   '其他',
}

// 根据产品分类返回图标（显示分类缩写 + 配色）
export function getIconInfo(name, category) {
  const style = CATEGORY_STYLE[category] || CATEGORY_STYLE['其他']
  return { text: CAT_SHORT[category] || (category || '?').slice(0, 2), ...style }
}

// 品牌名 + 产品名 拼接显示（避免品牌重复，如「珀芙研冷膜」）
// 产品列表显示名：固定「品牌名 产品名」（前面品牌，后面产品）
export function displayTitle(p) {
  const brand = (p.brand || '').trim()
  const name = (p.name || '').trim()
  if (!brand) return name
  let core = name
  if (name.toLowerCase().startsWith(brand.toLowerCase())) {
    core = name.slice(brand.length).trim()
  }
  if (!core) core = name
  return `${brand} ${core}`
}
