// 样品状态枚举（6 态）。「未到货/已到货」为到货流程，通过 isArrived 字段体现，
// 不纳入主状态枚举，避免与发布状态正交冲突。
export const SAMPLE_STATUS = {
  unpublished: { label: '未发布', desc: '未拍摄或已拍未发', color: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },
  shot: { label: '已拍摄', desc: '已拍、还没发', color: '#0ea5e9', bg: 'rgba(14,165,233,0.16)' },
  published_free: { label: '已发布·未出单', color: '#16a34a', bg: 'rgba(22,163,74,0.16)' },
  published_paid: { label: '已发布·出单', color: '#15803d', bg: 'rgba(21,128,61,0.16)' },
  hit: { label: '🔥爆单', color: '#dc2626', bg: 'rgba(220,38,38,0.16)' },
  abandoned: { label: '放弃', color: '#9ca3af', bg: 'rgba(156,163,175,0.16)' },
}

export const SAMPLE_STATUS_ORDER = [
  'unpublished',
  'shot',
  'published_free',
  'published_paid',
  'hit',
  'abandoned',
]

export const SAMPLE_STATUS_LIST = SAMPLE_STATUS_ORDER.map((k) => ({ key: k, ...SAMPLE_STATUS[k] }))

export function statusLabel(status) {
  return SAMPLE_STATUS[status]?.label || status || '未发布'
}

export function statusColor(status) {
  return SAMPLE_STATUS[status]?.color || '#94a3b8'
}

export function statusBg(status) {
  return SAMPLE_STATUS[status]?.bg || 'rgba(148,163,184,0.16)'
}
