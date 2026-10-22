// ECharts option 构造器（PC 与手机端共用，避免两套配置漂移）
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
export function makeAccountOption(accounts = [], maskFn = (x) => x) {
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
      axisLabel: { color: AXIS, fontSize: 11 },
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

// 按账号出单数量对比：横向条形图（账号在左、件数在右，柱尾标数值）
export function makeAccountOrderOption(accounts = [], maskFn = (x) => x) {
  const rows = [...accounts].sort((a, b) => (b.orderQty || 0) - (a.orderQty || 0))
  return {
    grid: { left: 8, right: 48, top: 10, bottom: 6, containLabel: true },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        const p = ps[0]
        return `${p.name}<br/>${p.marker}出单件数：${p.value}`
      },
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
      axisLabel: { color: AXIS, fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: rows.map((r) => maskFn(r.account)),
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } },
      axisTick: { show: false },
      axisLabel: { color: '#4b5563', fontSize: 11 },
    },
    series: [{
      name: '出单件数', type: 'bar', barMaxWidth: 18,
      itemStyle: { color: ORD, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', fontSize: 11, color: ORD, fontWeight: 700 },
      data: rows.map((r) => r.orderQty || 0),
    }],
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
