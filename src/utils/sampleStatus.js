// 样品状态枚举（5 态）：物流 + 发布 统一用 status 表达
export const SAMPLE_STATUS = {
  un_arrived: { label: '未到货',       icon: '🚚', desc: '还在路上',       color: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },
  arrived:    { label: '已到货未拍摄', icon: '📦', desc: '收到货、还没拍',  color: '#f97316', bg: 'rgba(249,115,22,0.16)' },
  shot:       { label: '已拍摄未发布', icon: '🎬', desc: '已拍、还没发',   color: '#06b6d4', bg: 'rgba(6,182,212,0.16)' },
  published:  { label: '已发布',       icon: '✅', desc: '已发视频',       color: '#16a34a', bg: 'rgba(22,163,74,0.16)' },
  abandoned:  { label: '放弃',  icon: '🚫', desc: '不做了',    color: '#9ca3af', bg: 'rgba(156,163,175,0.16)' },
}

export const SAMPLE_STATUS_ORDER = [
  'un_arrived',
  'arrived',
  'shot',
  'published',
  'abandoned',
]

export const SAMPLE_STATUS_LIST = SAMPLE_STATUS_ORDER.map((k) => ({ key: k, ...SAMPLE_STATUS[k] }))

export function statusLabel(status) {
  return SAMPLE_STATUS[status]?.label || status || '未到货'
}

export function statusColor(status) {
  return SAMPLE_STATUS[status]?.color || '#94a3b8'
}

export function statusBg(status) {
  return SAMPLE_STATUS[status]?.bg || 'rgba(148,163,184,0.16)'
}
