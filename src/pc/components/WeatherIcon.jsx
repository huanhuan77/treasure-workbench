// 天气图标（日历日记用）。
//
// 为什么不用 emoji：⛅🌧⛈🌨🌫 在 13~16px 下几乎糊成一团灰点，雨/雪/雾根本分不出来，
// 而且 emoji 自带颜色、不受主题控制。这里改成和侧边栏同一套「双色调」线性图标：
// 12% 同色实形底 + 1.6px 描边，每档一个语义色。
//
// 存储格式保持不变（仍是 emoji 字符串），这样手机版、历史数据、云备份都不用迁移。

const ICON_COLOR = {
  '☀️': '#e0a020',
  '🌤': '#c98a2e',
  '☁️': '#7c8a99',
  '🌧': '#3f7fbf',
  '⛈': '#7a5ea8',
  '🌨': '#4f9bb5',
  '🌫': '#8a9199',
}

export const WEATHER_LIST = [
  { emoji: '☀️', label: '晴' },
  { emoji: '🌤', label: '多云' },
  { emoji: '☁️', label: '阴' },
  { emoji: '🌧', label: '雨' },
  { emoji: '⛈', label: '雷雨' },
  { emoji: '🌨', label: '雪' },
  { emoji: '🌫', label: '雾' },
]

const svgProps = {
  viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
}
const fillLayer = { fill: 'currentColor', stroke: 'none', opacity: 0.12 }

// 太阳（晴 / 多云共用）
function Sun({ rays = true }) {
  return (
    <>
      <circle {...fillLayer} cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="4.2" />
      {rays && (
        <>
          <path d="M12 3v2" /><path d="M12 19v2" />
          <path d="M3 12h2" /><path d="M19 12h2" />
          <path d="m5.6 5.6 1.4 1.4" /><path d="m17 17 1.4 1.4" />
          <path d="m18.4 5.6-1.4 1.4" /><path d="m7 17-1.4 1.4" />
        </>
      )}
    </>
  )
}

// 云朵（多云 / 阴 / 雨 / 雷 / 雪 / 雾共用）
function Cloud({ cx = 12, cy = 13, scale = 1 }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
      <path {...fillLayer} d="M7 17h10a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.6 10.1 3.45 3.45 0 0 0 7 17Z" />
      <path d="M7 17h10a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.6 10.1 3.45 3.45 0 0 0 7 17Z" />
    </g>
  )
}

export function WeatherIcon({ value, size = 16 }) {
  const color = ICON_COLOR[value] || '#9aa0a9'
  const inner = (() => {
    switch (value) {
      case '☀️':
        return <Sun />
      case '🌤':
        return (<><g transform="translate(-3 -3) scale(.8) translate(3 3)"><Sun /></g><Cloud cx={15} cy={15} scale={0.85} /></>)
      case '☁️':
        return <Cloud />
      case '🌧':
        return (<><Cloud cy={11} scale={0.9} /><path d="M8.5 18v2" /><path d="M12 18.5v2" /><path d="M15.5 18v2" /></>)
      case '⛈':
        return (<><Cloud cy={10.5} scale={0.9} /><path d="m12.6 16.5-2 3h2.4l-1.4 2.6" /></>)
      case '🌨':
        return (<><Cloud cy={10.5} scale={0.9} /><path d="M8.5 18v2" /><path d="M12 18v2" /><path d="M15.5 18v2" /><path d="M7.7 19h1.6" /><path d="M11.2 19h1.6" /><path d="M14.7 19h1.6" /></>)
      case '🌫':
        return (<><path d="M4 9h16" /><path d="M6 13h12" /><path d="M8 17h8" /></>)
      default:
        return <Cloud />
    }
  })()

  return (
    <svg {...svgProps} width={size} height={size} style={{ color, flexShrink: 0 }} aria-hidden="true">
      {inner}
    </svg>
  )
}
