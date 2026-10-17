import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useIsDesktop } from '../utils/useIsDesktop'
import {
  HomeIcon, PenIcon, TagIcon, MoneyIcon, VideoIcon,
  WalletIcon, TvIcon, CalendarIcon, ListIcon, BookIcon,
  CardIcon, PiggyIcon, ChartIcon, BanIcon,
} from '../components/navIcons'
import { CloudActions } from './components/CloudActions'
import { useDialogDrag } from './utils/dialogDrag'
import './pc.css'

// PC 版导航：一列到底，不分组。
// 手机版是因为屏高放不下才把后 9 项收进「更多」抽屉的；
// PC 侧边栏本身可滚动、竖向空间充足，所以不要「更多」这个分组标题。
// 图标全部用 components/navIcons 里的线性 SVG（22×22、线宽 1.8、stroke currentColor）：
// 原来只有前 5 项是线性图标、后 9 项是 emoji，同一列里一半描边一半彩色贴纸，画风割裂（用户要求统一）。
// 注意：**14 项已全部迁到 `/pc/...`**，点任何一项都留在 PC 壳里，不会再掉到手机版页面。
// 新增页面时记得同时在 App.jsx 的 `/pc` children 里注册，否则会 404。
// color：每个菜单固定的低饱和主题色（用户要求「每个菜单一个颜色」）。
// 只给图标上色，文字仍走中性色 —— 整列不会变成一排彩色文字。
const NAV = [
  { to: '/pc', label: '总览', end: true, Icon: HomeIcon, color: '#b8517f' },
  { to: '/pc/products', label: '文案库', Icon: PenIcon, color: '#2f7d93' },
  { to: '/pc/samples', label: '样品', Icon: TagIcon, badgeKey: 'samples', color: '#7a5ea8' },
  { to: '/pc/publish-records', label: '发布', Icon: VideoIcon, color: '#3f6fa8' },
  { to: '/pc/orders', label: '出单', Icon: MoneyIcon, color: '#4f8a6d' },
  { to: '/pc/finance', label: '收支', Icon: WalletIcon, color: '#a97c46' },
  { to: '/pc/dramas', label: '追剧', Icon: TvIcon, color: '#b96a66' },
  { to: '/pc/calendar', label: '日历', Icon: CalendarIcon, color: '#4f7f8f' },
  { to: '/pc/daily', label: '每日计划', Icon: ListIcon, color: '#6b7280' },
  { to: '/pc/reading', label: '读书成长', Icon: BookIcon, color: '#8a6d3b' },
  { to: '/pc/brands', label: '品牌方', Icon: CardIcon, color: '#7a8a4f' },
  { to: '/pc/savings', label: '攒钱计划', Icon: PiggyIcon, color: '#c08552' },
  { to: '/pc/investment', label: '投资跟踪', Icon: ChartIcon, color: '#4a7c59' },
  { to: '/pc/sensitive', label: '违禁词', Icon: BanIcon, color: '#a9504b' },
]

function NavItem({ to, label, end, Icon, emoji, badge, color }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `pcv-navitem${isActive ? ' on' : ''}`}>
      {/* 图标固定用各自的主题色（emoji 自带颜色，color 对它是空操作，无副作用） */}
      <span className={Icon ? 'pcv-navicon' : 'pcv-navemoji'} style={{ color }}>
        {Icon ? <Icon /> : emoji}
      </span>
      <span>{label}</span>
      {badge > 0 && <span className="pcv-navcount">{badge > 99 ? '99+' : badge}</span>}
    </NavLink>
  )
}

export function PcShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const { samples } = useStore()
  // 全站弹窗可拖动：文档级委托，挂一次对所有 .pcv-dialog 生效
  useDialogDrag()

  // 云备份按钮的挂载点：每页渲染完成后，把 host 插到该页顶栏（.pcv-bar）里
  // 第一个 .pcv-spacer 之后 —— 也就是「标题组」与「搜索框/新增按钮」之间的空位。
  // 换页时（pathname 变化）重新找一次，旧的 host 由 cleanup 移除。
  const [cloudHost, setCloudHost] = useState(null)
  useEffect(() => {
    const bar = document.querySelector('.pcv-main .pcv-bar')
    if (!bar) { setCloudHost(null); return }
    const host = document.createElement('div')
    host.className = 'pcv-cloudhost'
    const spacer = bar.querySelector('.pcv-spacer')
    if (spacer) spacer.after(host)
    else bar.appendChild(host)
    setCloudHost(host)
    return () => { host.remove() }
  }, [location.pathname])

  // 样品角标口径与手机版底部导航一致：未到货 + 已到货未拍 + 已拍未发
  const samplesBadge = (samples || []).filter(
    (s) => s.status === 'un_arrived' || s.status === 'arrived' || s.status === 'shot',
  ).length
  const badgeOf = (key) => (key === 'samples' ? samplesBadge : 0)

  // index.css 里给桌面宽度下的 #root 留了 232px 侧边栏内边距（手机版用），
  // 进 PC 版必须取消，否则整个壳会被推右 232px。
  useEffect(() => {
    document.body.classList.add('pcv-mode')
    // 留个标记：用户进过 PC 版。之后若点到还没迁移的手机版页面，
    // 手机版侧边栏会多一个「返回 PC 版」入口，不至于只能靠浏览器后退键回不来。
    try { sessionStorage.setItem('pc_mode_visited', '1') } catch (e) { /* 隐私模式忽略 */ }
    return () => document.body.classList.remove('pcv-mode')
  }, [])

  // PC 版只服务桌面宽度：窄屏（含手机误入 /pc）直接送回手机版
  useEffect(() => {
    if (!isDesktop) navigate('/', { replace: true })
  }, [isDesktop, navigate])

  // 切回手机版：本次会话内不再自动跳回 PC（sessionStorage，关掉标签页即失效）
  const backToMobile = () => {
    try { sessionStorage.setItem('pc_force_mobile', '1') } catch (e) { /* 隐私模式忽略 */ }
    navigate('/', { replace: true })
  }

  return (
    <div className="pcv-root">
      <aside className="pcv-side">
        <div className="pcv-brand">📝 宝藏工作台</div>
        <nav className="pcv-nav">
          {NAV.map((it) => (
            <NavItem key={it.to} {...it} badge={it.badgeKey ? badgeOf(it.badgeKey) : 0} />
          ))}
        </nav>
        <div className="pcv-sidefoot">
          <button className="pcv-btn pcv-btn-ghost" style={{ width: '100%' }} onClick={backToMobile}>
            切回手机版
          </button>
        </div>
      </aside>
      <main className="pcv-main">
        {/* 云备份三件套：portal 插进当前页顶栏的标题组后面（标题 → 24px 间隔 → 云备份 → 搜索框…），
            这样不额外占一条横条，也不会在标题和搜索框之间留出空白带。 */}
        {cloudHost && createPortal(<CloudActions />, cloudHost)}
        <Outlet />
      </main>
    </div>
  )
}
