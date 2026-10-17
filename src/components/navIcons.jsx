// 侧边栏 / 底部导航共用的线性图标。
// 抽出来是因为手机版的 BottomNav 和 PC 版的 PcShell 用的是同一批图标，
// 两边各写一份迟早会画风不一致。
//
// 统一规格：22×22、viewBox 24、fill none、stroke currentColor、线宽 1.8、圆头。
// 后 9 个（收支/追剧/日历/每日计划/读书/品牌方/攒钱/投资/违禁词）原来用 emoji，
// 与前面 5 个线性图标混在一列里画风割裂（用户要求统一），现全部改成同规格线性图标；
// 每个菜单仍由 PcShell 的 NAV.color 决定颜色。

const iconProps = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
}

export const HomeIcon = () => (<svg {...iconProps}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M10 21v-5h4v5" /></svg>)
export const PenIcon = () => (<svg {...iconProps}><path d="M4 20l1-4L16.5 4.5a2.12 2.12 0 0 1 3 3L8 19l-4 1Z" /><path d="M14.5 6.5l3 3" /></svg>)
export const TagIcon = () => (<svg {...iconProps}><path d="M20.6 12.4 12.4 20.6a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.4V5.2a2 2 0 0 1 2-2h7.8a2 2 0 0 1 1.4.6l6.6 6.6a2 2 0 0 1 0 2Z" /><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /></svg>)
export const MoneyIcon = () => (<svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M14.6 9.6c-.5-.8-1.5-1.2-2.6-1.2-1.4 0-2.5.9-2.5 2s1.1 2 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.4-2.6-1.2" /></svg>)
export const VideoIcon = () => (<svg {...iconProps}><rect x="3" y="6" width="14" height="12" rx="2" /><path d="M17 10l4-2v8l-4-2" /></svg>)
export const MoreIcon = () => (<svg {...iconProps}><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>)

// 收支：钱包
export const WalletIcon = () => (<svg {...iconProps}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18" /><circle cx="16.5" cy="14.8" r="1.2" fill="currentColor" stroke="none" /></svg>)
// 追剧：显示器
export const TvIcon = () => (<svg {...iconProps}><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8 20h8" /><path d="M12 16.5V20" /></svg>)
// 日历
export const CalendarIcon = () => (<svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></svg>)
// 每日计划：清单
export const ListIcon = () => (<svg {...iconProps}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 9h8" /><path d="M8 13h8" /><path d="M8 17h5" /></svg>)
// 读书成长：书
export const BookIcon = () => (<svg {...iconProps}><path d="M5 4.5A2 2 0 0 1 7 2.5h12v15H7a2 2 0 0 0-2 2v-15Z" /><path d="M5 19.5a2 2 0 0 0 2 2h12" /><path d="M9 6.5h6" /></svg>)
// 品牌方：名片
export const CardIcon = () => (<svg {...iconProps}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2" /><path d="M15 10h3" /><path d="M15 13.5h3" /></svg>)
// 攒钱计划：存钱罐
export const PiggyIcon = () => (<svg {...iconProps}><circle cx="12" cy="13" r="7" /><path d="M9 13h6" /><path d="M12 6V3.5" /><path d="M19 13h2" /></svg>)
// 投资跟踪：折线
export const ChartIcon = () => (<svg {...iconProps}><path d="M4 4v16h16" /><path d="M7 15l3.5-4 3 2.6L20 7" /></svg>)
// 违禁词：禁止
export const BanIcon = () => (<svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M6.2 17.8 17.8 6.2" /></svg>)
