// 出单 Top N 产品：竖向堆叠柱状图（PC 与手机端共用，样式一致）
//   · 每个产品一根竖柱，柱内按账号分段（账号色），x 轴标「产品名 + 合计件数」
//   · 手机端宽度不够，传 minWidth 让图横向可滑动，避免 10 个中文名挤成一团
import { useMemo } from 'react'
import { EChart } from './EChart'
import { makeTopProductOption } from '../utils/chartOptions'

export function TopProductBars({ rows = [], mask = (a) => a, height, rotate = 0, minWidth, shortLen = 8 }) {
  const option = useMemo(
    () => makeTopProductOption(rows, { maskFn: mask, rotate, shortLen }),
    [rows, mask, rotate, shortLen],
  )
  if (!rows.length) {
    return <div style={{ padding: '12px 4px', fontSize: 12, color: '#9aa0a9' }}>这个区间没有出单</div>
  }
  const h = height || (rotate ? 300 : 280)
  return (
    <div style={minWidth ? { overflowX: 'auto' } : undefined}>
      <div style={minWidth ? { width: minWidth, minWidth: '100%' } : undefined}>
        <EChart option={option} height={h} />
      </div>
    </div>
  )
}
