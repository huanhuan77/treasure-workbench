import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useIsDesktop } from '../utils/useIsDesktop'
import { HomeIcon, PenIcon, TagIcon, MoneyIcon, VideoIcon } from '../components/navIcons'
import './pc.css'

// PC 版导航：一列到底，不分组。
// 手机版是因为屏高放不下才把后 9 项收进「更多」抽屉的；
// PC 侧边栏本身可滚动、竖向空间充足，所以不要「更多」这个分组标题。
// 图标与手机版底部导航共用同一批（主 5 项是线性 SVG，其余是 emoji），避免两边画风不一致。
// 注意：**14 项已全部迁到 `/pc/...`**，点任何一项都留在 PC 壳里，不会再掉到手机版页面。
// 新增页面时记得同时在 App.jsx 的 `/pc` children 里注册，否则会 404。
const NAV = [
  { to: '/pc', label: '总览', end: true, Icon: HomeIcon },
  { to: '/pc/products', label: '文案库', Icon: PenIcon },
  { to: '/pc/samples', label: '样品', Icon: TagIcon, badgeKey: 'samples' },
  { to: '/pc/publish-records', label: '发布', Icon: VideoIcon },
  { to: '/pc/orders', label: '出单', Icon: MoneyIcon },
  { to: '/pc/finance', label: '收支', emoji: '💰' },
  { to: '/pc/dramas', label: '追剧', emoji: '📺' },
  { to: '/pc/calendar', label: '日历', emoji: '📅' },
  { to: '/pc/daily', label: '每日计划', emoji: '📋' },
  { to: '/pc/reading', label: '读书成长', emoji: '📚' },
  { to: '/pc/brands', label: '品牌方', emoji: '🤝' },
  { to: '/pc/savings', label: '攒钱计划', emoji: '🐷' },
  { to: '/pc/investment', label: '投资跟踪', emoji: '📈' },
  { to: '/pc/sensitive', label: '违禁词', emoji: '🚫' },
]

function NavItem({ to, label, end, Icon, emoji, badge }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `pcv-navitem${isActive ? ' on' : ''}`}>
      <span className={Icon ? 'pcv-navicon' : 'pcv-navemoji'}>
        {Icon ? <Icon /> : emoji}
      </span>
      <span>{label}</span>
      {badge > 0 && <span className="pcv-navcount">{badge > 99 ? '99+' : badge}</span>}
    </NavLink>
  )
}

export function PcShell() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { samples } = useStore()

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
        <Outlet />
      </main>
    </div>
  )
}
