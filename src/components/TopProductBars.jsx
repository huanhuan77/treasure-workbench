// 出单 Top N 产品：横向堆叠柱状图（PC 与手机端共用，样式一致）
// 每个账号一段（账号色），带坐标轴刻度 + 图例，悬停看分账号明细；右侧标签已带总数
import { useMemo } from 'react'
import { EChart } from './EChart'
import { makeTopProductOption } from '../utils/chartOptions'

export function TopProductBars({ rows = [], mask = (a) => a, height }) {
  const option = useMemo(() => makeTopProductOption(rows, { maskFn: mask }), [rows, mask])
  const h = height || Math.max(150, rows.length * 26 + 44)
  if (!rows.length) {
    return <div style={{ padding: '12px 4px', fontSize: 12, color: '#9aa0a9' }}>这个区间没有出单</div>
  }
  return <EChart option={option} height={h} />
}
