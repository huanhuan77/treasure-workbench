import { useEffect, useRef } from 'react'
// ECharts **按需引入**：只注册用得到的图表与组件，避免打进整个 echarts 包。
// 现在用到：柱状图（趋势/转化）、折线图（转化率）、饼图（分类占比）+ 坐标轴/提示框/图例/标题 + Canvas 渲染。
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart, LineChart, PieChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  CanvasRenderer,
])

// 通用容器：传 option 即可，自动 init / setOption / resize / dispose
export function EChart({ option, height = 260, style }) {
  const boxRef = useRef(null)
  const instRef = useRef(null)

  useEffect(() => {
    if (!boxRef.current) return undefined
    if (!instRef.current) instRef.current = echarts.init(boxRef.current, undefined, { renderer: 'canvas' })
    instRef.current.setOption(option || {}, true)

    // 容器尺寸变化（侧栏折叠 / 窗口缩放 / 移动端旋转）都要跟着 resize
    const onResize = () => { if (instRef.current) instRef.current.resize() }
    window.addEventListener('resize', onResize)
    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize)
      ro.observe(boxRef.current)
    }
    return () => {
      window.removeEventListener('resize', onResize)
      if (ro) ro.disconnect()
    }
  }, [option])

  useEffect(() => () => {
    if (instRef.current) { instRef.current.dispose(); instRef.current = null }
  }, [])

  return <div ref={boxRef} style={{ width: '100%', height, ...style }} />
}
