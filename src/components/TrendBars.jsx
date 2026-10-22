// 近 N 周柱状图（纯 CSS 实现，不引第三方图表库）
// 两组柱子：发布条数（蓝）/ 出单件数（绿），柱子顶部标数值，底部标区间与「本周」。
// PC 与手机端共用（尺寸由参数控制）。
const PUB = '#3f6fa8'
const ORD = '#4f8a6d'

function Bar({ value, max, height, color, title }) {
  const h = max > 0 ? Math.max(value > 0 ? 3 : 0, Math.round((value / max) * height)) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={title}>
      <span style={{ fontSize: 10, color, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{value}</span>
      <div style={{
        width: '100%', height: h, minHeight: value > 0 ? 3 : 0,
        background: color, borderRadius: '3px 3px 0 0',
        transition: 'height .2s ease',
      }} />
    </div>
  )
}

export function TrendBars({ data = [], height = 130, barWidth = 18 }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.publish || 0, d.orderQty || 0)))
  return (
    <div>
      {/* 图例 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: '#8a8f98', padding: '0 2px 6px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: PUB }} />发布条数
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: ORD }} />出单件数
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        {data.map((d) => (
          <div key={d.key} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height }}>
              <div style={{ width: barWidth }}>
                <Bar value={d.publish || 0} max={max} height={height - 16} color={PUB} title={`${d.label} 发布 ${d.publish || 0} 条`} />
              </div>
              <div style={{ width: barWidth }}>
                <Bar value={d.orderQty || 0} max={max} height={height - 16} color={ORD} title={`${d.label} 出单 ${d.orderQty || 0} 件`} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#8a8f98', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</div>
            <div style={{ fontSize: 10, color: d.isThisWeek ? '#b8517f' : '#c9cdd4', fontWeight: d.isThisWeek ? 700 : 400 }}>
              {d.isThisWeek ? '本周' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
