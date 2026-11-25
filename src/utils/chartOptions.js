// ECharts option 构造器（PC 与手机端共用，避免两套配置漂移）
import { ACCOUNT_COLOR } from './accounts'
const AXIS = '#94a3b8'
const PUB = '#3f6fa8'
const ORD = '#4f8a6d'
const RATE = '#b8517f'

// 期间趋势：分组柱（发布 / 出单）
export function makePeriodOption(bars = [], { rotate = 0 } = {}) {
  return {
    grid: { left: 8, right: 12, top: 34, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#6b7280', fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: bars.map((b) => b.label),
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } },
      axisTick: { show: false },
      axisLabel: { color: AXIS, fontSize: 10, interval: 0, rotate: rotate || (bars.length > 8 ? 30 : 0) },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
      axisLabel: { color: AXIS, fontSize: 10 },
    },
    series: [
      { name: '发布条数', type: 'bar', data: bars.map((b) => b.publish), itemStyle: { color: PUB, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 22 },
      { name: '出单件数', type: 'bar', data: bars.map((b) => b.orderQty), itemStyle: { color: ORD, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 22 },
    ],
  }
}

// 近 N 个月：柱（发布 / 出单）+ 折线（转化率 %，右轴）
export function makeMonthlyOption(monthly = []) {
  return {
    grid: { left: 8, right: 8, top: 38, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => {
        const rows = ps.map((p) => `${p.marker}${p.seriesName}：${p.value}${p.seriesName === '转化率' ? '%' : ''}`)
        return `${ps[0].axisValue}<br/>${rows.join('<br/>')}`
      },
    },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#6b7280', fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: monthly.map((m) => m.label),
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } },
      axisTick: { show: false },
      axisLabel: { color: AXIS, fontSize: 10 },
    },
    yAxis: [
      { type: 'value', splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } }, axisLabel: { color: AXIS, fontSize: 10 } },
      { type: 'value', name: '转化率', nameTextStyle: { color: AXIS, fontSize: 10 }, splitLine: { show: false }, axisLabel: { color: AXIS, fontSize: 10, formatter: '{value}%' } },
    ],
    series: [
      { name: '发布条数', type: 'bar', data: monthly.map((m) => m.publish), itemStyle: { color: PUB, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 },
      { name: '出单件数', type: 'bar', data: monthly.map((m) => m.orderQty), itemStyle: { color: ORD, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 },
      { name: '转化率', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 6, data: monthly.map((m) => m.rate), lineStyle: { color: RATE, width: 2 }, itemStyle: { color: RATE } },
    ],
  }
}

// 分账号对比：分组柱（发布条数 / 出单件数 / 新增产品数），柱顶标数值
export function makeAccountOption(accounts = [], maskFn = (x) => x, { rotate = 0 } = {}) {
  const labels = accounts.map((r) => maskFn(r.account))
  return {
    grid: { left: 8, right: 12, top: 34, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#6b7280', fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } },
      axisTick: { show: false },
      // interval 0：所有账号名都要显示（默认 auto 会隔一个藏一个，看着像少了账号）
      axisLabel: { color: AXIS, fontSize: 11, interval: 0, rotate, margin: 8 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
      axisLabel: { color: AXIS, fontSize: 10 },
    },
    series: [
      {
        name: '发布条数', type: 'bar', barMaxWidth: 26, itemStyle: { color: PUB, borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', fontSize: 10, color: PUB },
        data: accounts.map((r) => r.publish),
      },
      {
        name: '出单件数', type: 'bar', barMaxWidth: 26, itemStyle: { color: ORD, borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', fontSize: 10, color: ORD },
        data: accounts.map((r) => r.orderQty),
      },
      {
        name: '新增产品数', type: 'bar', barMaxWidth: 26, itemStyle: { color: '#a97c46', borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', fontSize: 10, color: '#a97c46' },
        data: accounts.map((r) => r.newProducts || 0),
      },
    ],
  }
}

// 按账号出单量对比：**竖向柱状图**（账号在 X 轴、柱顶标数值）
// metric: 'qty' = 出单件数（qty 合计）｜'count' = 出单笔数（记录条数）
export function makeAccountOrderOption(accounts = [], maskFn = (x) => x, metric = 'qty') {
  const val = (r) => (metric === 'count' ? (r.orderCount || 0) : (r.orderQty || 0))
  const rows = [...accounts].sort((a, b) => val(b) - val(a))
  return {
    grid: { left: 8, right: 12, top: 28, bottom: 6, containLabel: true },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        const p = ps[0]
        const d = p.data || {}
        return `${p.name}<br/>${p.marker}出单件数：${d.qty != null ? d.qty : p.value}<br/>出单笔数：${d.count != null ? d.count : '-'}`
      },
    },
    xAxis: {
      type: 'category',
      data: rows.map((r) => maskFn(r.account)),
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } },
      axisTick: { show: false },
      axisLabel: { color: '#4b5563', fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
      axisLabel: { color: AXIS, fontSize: 10 },
    },
    series: [{
      name: metric === 'count' ? '出单笔数' : '出单件数', type: 'bar', barMaxWidth: 42,
      itemStyle: { color: ORD, borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', fontSize: 11, color: ORD, fontWeight: 700 },
      data: rows.map((r) => ({ value: val(r), qty: r.orderQty || 0, count: r.orderCount || 0 })),
    }],
  }
}

// 出单 Top N 产品：竖向堆叠柱状图（每个产品一根柱，柱内按账号分段，可按账号筛选）
//   rows: [{ name, total, parts: [{ account, qty }] }]（由 buildTopProductRows 生成）
//   rotate：x 轴产品名旋转角度（宽屏 0，手机 40 避免重叠）
export function makeTopProductOption(rows = [], { maskFn = (x) => x, rotate = 0, shortLen = 6, layout = 'grouped' } = {}) {
  // 按「显示宽度」截断：中文/全角算 2 个单位，英文/数字/符号算 1 个
  // （原来按字符数截，英文名只有一半宽度却同样截 6 个字符，看起来短得莫名）
  const short = (s) => {
    const str = String(s)
    const limit = shortLen * 2
    let w = 0
    let out = ''
    for (const ch of str) {
      const wide = /[\u3000-\u303f\u4e00-\u9fff\uff01-\uff60]/.test(ch)
      const cw = wide ? 2 : 1
      if (w + cw > limit) return out + '…'
      w += cw
      out += ch
    }
    return str
  }
  const totalOf = new Map(rows.map((r) => [r.name, r.total]))
  const accList = [...new Set(rows.flatMap((r) => r.parts.filter((p) => p.qty > 0).map((p) => p.account)))]
  // 横向条形（手机端用）：每个产品一行，条内按账号分段，左边产品名+合计，条形右侧标合计
  if (layout === 'horizontal') {
    const ordered = [...rows].reverse() // y 轴自下而上，第一行在最上面
    const maxTotal = Math.max(1, ...rows.map((r) => r.total))
    return {
      grid: { left: 6, right: 10, top: 6, bottom: accList.length > 1 ? 26 : 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (ps) => {
          const name = ps[0] && ps[0].name
          const lines = ps
            .filter((p) => Number(p.value) > 0)
            .map((p) => `${p.marker}${p.seriesName}：${p.value} 件`)
          return `<b>${name}</b><br/>${lines.join('<br/>')}<br/>合计：${totalOf.get(name) || 0} 件`
        },
      },
      legend: {
        show: accList.length > 1, bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10,
        textStyle: { color: '#6b7280', fontSize: 11 },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: ordered.map((r) => r.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11, margin: 10,
          formatter: (v) => `{n|${short(v)}} {t|· ${totalOf.get(v) || 0}}`,
          rich: {
            n: { color: '#4b5563', fontSize: 11 },
            t: { color: '#a5abb4', fontSize: 10 },
          },
        },
      },
      series: accList.map((a) => ({
        name: maskFn(a),
        type: 'bar',
        stack: 'qty',
        barMaxWidth: 16,
        itemStyle: { color: (ACCOUNT_COLOR[a] || {}).c || '#8a8f98' },
        label: { show: true, position: 'inside', fontSize: 10, color: '#fff' },
        data: ordered.map((r) => {
          const hit = r.parts.find((p) => p.account === a)
          const v = hit ? hit.qty : 0
          // 按「全图最大值」算占比：条形太短（不到总量 10%）就不标数字，避免被裁
          const pct = v / maxTotal
          return {
            value: v,
            pct,
            label: pct >= 0.1 ? { show: true } : { show: false, formatter: () => '' },
          }
        }),
      })),
    }
  }
  return {
    grid: { left: 8, right: 12, top: 30, bottom: 10, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        const name = ps[0] && ps[0].name
        const lines = ps
          .filter((p) => Number(p.value) > 0)
          .map((p) => `${p.marker}${p.seriesName}：${p.value} 件`)
        return `<b>${name}</b><br/>${lines.join('<br/>')}<br/>合计：${totalOf.get(name) || 0} 件`
      },
    },
    // 图例放左上（和「分账号明细」一致）
    legend: {
      show: accList.length > 1, top: 2, left: 0, itemWidth: 10, itemHeight: 10,
      textStyle: { color: '#6b7280', fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: rows.map((r) => r.name),
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } },
      axisTick: { show: false },
      axisLabel: {
        interval: 0, rotate, margin: 8, fontSize: 11,
        // 产品名一行 + 合计件数一行
        formatter: (v) => `{n|${short(v)}}\n{t|${totalOf.get(v) || 0} 件}`,
        rich: {
          n: { color: '#4b5563', fontSize: 11, lineHeight: 15 },
          t: { color: '#a5abb4', fontSize: 10, lineHeight: 13 },
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    // 分组柱（每个产品下，各账号并排一根柱，柱顶标数值）——用户要求「改成这种」
    series: accList.map((a) => ({
      name: maskFn(a),
      type: 'bar',
      barMaxWidth: 24,
      barGap: '18%',
      itemStyle: { color: (ACCOUNT_COLOR[a] || {}).c || '#8a8f98', borderRadius: [3, 3, 0, 0] },
      label: {
        show: true, position: 'top', fontSize: 10,
        color: (ACCOUNT_COLOR[a] || {}).c || '#6b7280',
        formatter: (p) => (Number(p.value) > 0 ? p.value : ''),
      },
      data: rows.map((r) => {
        const hit = r.parts.find((p) => p.account === a)
        return hit ? hit.qty : 0
      }),
    })),
  }
}

// 分类占比：环形饼图
export function makePieOption(share = []) {
  return {
    tooltip: { trigger: 'item', formatter: '{b}：{c}（{d}%）' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#6b7280', fontSize: 11 } },
    color: ['#b8517f', '#3f6fa8', '#4f8a6d', '#a97c46', '#7a5ea8', '#b96a66', '#6b7280', '#4f7f8f'],
    series: [{
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 700 } },
      data: share,
    }],
  }
}
