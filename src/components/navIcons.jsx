// 侧边栏 / 底部导航共用的线性图标。
// 抽出来是因为手机版的 BottomNav 和 PC 版的 PcShell 用的是同一批图标，
// 两边各写一份迟早会画风不一致。

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
