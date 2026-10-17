// 侧边栏 / 底部导航共用的图标。
//
// 【风格：双色调（duotone）】
//   每个图标 = 一层 12% 透明度的同色块（fill）+ 一层 1.8px 描边（stroke），
//   两块都用 currentColor，所以换主题色时整体一起变。
//   比纯线性更有体量感、又不像 emoji 那样自带彩色贴纸感。
//
// 【改动约定】
//   · 24 网格、stroke-width 1.8、圆角端点/拐角；
//   · 底色层只放「主体轮廓」，细节（门、指针、文字线）留给描边层，避免糊成一团；
//   · 不要混 emoji、不要用两块以上不同颜色 —— 会破坏这一套的一致性。
//
// 颜色由 PcShell 的 NAV.color 通过 currentColor 传下来。

const iconProps = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
}
// 底色层：同色 12%，无描边
const fillLayer = { fill: 'currentColor', stroke: 'none', opacity: 0.12 }

// 总览：房子
export const HomeIcon = () => (
  <svg {...iconProps}>
    <path {...fillLayer} d="M3 9.6 12 3l9 6.6V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    <path d="m3 9 9-7 9 7" /><path d="M9 21v-6h6v6" />
  </svg>
)
// 文案库：笔
export const PenIcon = () => (
  <svg {...iconProps}>
    <path {...fillLayer} d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /><path d="M12 20h9" />
  </svg>
)
// 样品：吊牌
export const TagIcon = () => (
  <svg {...iconProps}>
    <path {...fillLayer} d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" />
    <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" />
    <circle cx="7.5" cy="7.5" r="1" />
  </svg>
)
// 发布：摄像机
export const VideoIcon = () => (
  <svg {...iconProps}>
    <rect {...fillLayer} x="2" y="6" width="14" height="12" rx="2" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m16 10 6-3.5v11L16 14" />
  </svg>
)
// 出单：钞票
export const MoneyIcon = () => (
  <svg {...iconProps}>
    <rect {...fillLayer} x="2" y="6" width="20" height="12" rx="2" />
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01" /><path d="M18 12h.01" />
  </svg>
)
// 收支：钱包
export const WalletIcon = () => (
  <svg {...iconProps}>
    <rect {...fillLayer} x="2" y="5" width="20" height="14" rx="2" />
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" /><path d="M16 14.5h2" />
  </svg>
)
// 追剧：电视
export const TvIcon = () => (
  <svg {...iconProps}>
    <rect {...fillLayer} x="2" y="7" width="20" height="14" rx="2" />
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="m17 2-5 5-5-5" />
  </svg>
)
// 日历
export const CalendarIcon = () => (
  <svg {...iconProps}>
    <rect {...fillLayer} x="3" y="4" width="18" height="18" rx="2" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M8 2v4" /><path d="M16 2v4" /><path d="M3 10h18" />
  </svg>
)
// 每日计划：写字板
export const ListIcon = () => (
  <svg {...iconProps}>
    <rect {...fillLayer} x="4" y="4" width="16" height="18" rx="2" />
    <rect x="4" y="4" width="16" height="18" rx="2" />
    <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z" />
    <path d="M8 11h8" /><path d="M8 15h5" />
  </svg>
)
// 读书成长：摊开的书
export const BookIcon = () => (
  <svg {...iconProps}>
    <path {...fillLayer} d="M3 17a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z" />
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </svg>
)
// 品牌方：名片
export const CardIcon = () => (
  <svg {...iconProps}>
    <rect {...fillLayer} x="2" y="5" width="20" height="14" rx="2" />
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M5.5 16c.6-1.3 1.5-2 2.5-2s1.9.7 2.5 2" />
    <path d="M15 10h3" /><path d="M15 14h3" />
  </svg>
)
// 攒钱计划：存钱罐
export const PiggyIcon = () => (
  <svg {...iconProps}>
    <path {...fillLayer} d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5Z" />
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5Z" />
    <path d="M2 9v1c0 1.1.9 2 2 2h1" /><path d="M16 11h.01" />
  </svg>
)
// 投资跟踪：折线（没有闭合轮廓，底色层用曲线下的淡面）
export const ChartIcon = () => (
  <svg {...iconProps}>
    <path {...fillLayer} d="m3 19 6-7 4 3.5 5-7V19Z" />
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="m19 6-5 5.5-4-3.5-6 8" />
  </svg>
)
// 违禁词：禁止
export const BanIcon = () => (
  <svg {...iconProps}>
    <circle {...fillLayer} cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
)
// 手机版「更多」抽屉
export const MoreIcon = () => (
  <svg {...iconProps}>
    <circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" />
  </svg>
)
