import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
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
  { to: '/pc/summary', label: '周月总结', Icon: ChartIcon, color: '#4f7f8f' },
  { to: '/pc/dramas', label: '追剧', Icon: TvIcon, color: '#b96a66' },
  // 这一页已从「日历」改成日记本（用户要求），菜单名跟着改
  { to: '/pc/calendar', label: '日记', Icon: CalendarIcon, color: '#4f7f8f' },
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
  const outlet = useOutlet()
  const isDesktop = useIsDesktop()
  const { samples } = useStore()
  // 全站弹窗可拖动：文档级委托，挂一次对所有 .pcv-dialog 生效
  useDialogDrag()

  // ── 多标签（用户要求「增加 tab 显示打开过的页面 可切换 切换保留页面状态」）──
  // tabs：{ path, label } 列表；pages：path -> 该页面的 React 元素（常驻挂载，切走只改 display）。
  // 不用路由级 KeepAlive —— 那会把侧边栏一起复制一份。
  const [tabs, setTabs] = useState(() => {
    try {
      const raw = sessionStorage.getItem('pc_tabs_v1')
      const arr = raw ? JSON.parse(raw) : null
      if (Array.isArray(arr) && arr.length) return arr
    } catch (e) { /* 忽略 */ }
    // 不预置「总览」：首次进入哪个页面就只开哪个标签，避免出现一个点不开的空白标签
    return []
  })
  const [pages, setPages] = useState(() => new Map())
  const tabbarRef = useRef(null)

  // 访问新页面 → 补一个 tab + 把它的元素存起来（只存第一次，保持组件实例）
  useEffect(() => {
    const p = location.pathname
    if (!p.startsWith('/pc')) return
    setTabs((prev) => {
      if (prev.some((t) => t.path === p)) return prev
      const label = (NAV.find((n) => n.to === p) || {}).label || p.split('/').filter(Boolean).pop() || p
      return [...prev, { path: p, label }]
    })
    setPages((prev) => {
      if (prev.has(p)) return prev
      const next = new Map(prev)
      next.set(p, outlet)
      return next
    })
  }, [location.pathname, outlet])

  useEffect(() => {
    try { sessionStorage.setItem('pc_tabs_v1', JSON.stringify(tabs)) } catch (e) { /* 忽略 */ }
  }, [tabs])

  const closeTab = (e, path) => {
    e.stopPropagation()
    setTabs((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((t) => t.path === path)
      const next = prev.filter((t) => t.path !== path)
      if (path === location.pathname) {
        const to = next[Math.min(idx, next.length - 1)]
        if (to) navigate(to.path)
      }
      // 关掉的页面从缓存里移除，释放状态
      setPages((pg) => { const m = new Map(pg); m.delete(path); return m })
      return next
    })
  }

  // 云备份按钮已改为直接渲染在侧边栏底部，不再需要往页面顶栏插挂载点

  // 标签栏宽度 → CSS 变量：页面顶栏右侧留出同样宽度，标签就不会压在「为什么没提醒 / 隐藏账号」这些按钮上
  useEffect(() => {
    const el = tabbarRef.current
    if (!el) return undefined
    const apply = () => {
      const w = el.offsetWidth || 0
      document.documentElement.style.setProperty('--pcv-tabs-w', `${w}px`)
    }
    apply()
    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(apply)
      ro.observe(el)
    }
    return () => {
      if (ro) ro.disconnect()
      document.documentElement.style.setProperty('--pcv-tabs-w', '0px')
    }
  }, [tabs.length])

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

  return (
    <div className="pcv-root">
      <aside className="pcv-side">
        <div className="pcv-brand">📝 宝藏工作台</div>
        <nav className="pcv-nav">
          {NAV.map((it) => (
            <NavItem key={it.to} {...it} badge={it.badgeKey ? badgeOf(it.badgeKey) : 0} />
          ))}
        </nav>
        {/* 云备份三件套放在侧边栏底部（用户要求「放侧边栏」）：三个按钮竖排等宽。
            「切回手机版」已去掉（用户要求）—— 需要时直接访问站点根路径即可。 */}
        <div className="pcv-sidefoot">
          <CloudActions vertical />
        </div>
      </aside>
      <main className="pcv-main">
        {/* 打开过的页面：多标签，点标签切换；切换只改 display，页面状态（筛选/滚动/展开）全保留。
            tabbarRef 用来量宽度 → 写进 CSS 变量 --pcv-tabs-w，
            让页面顶栏（.pcv-bar）自动让出这段空间，避免标签和右上角按钮重叠。 */}
        <div className="pcv-tabbar" ref={tabbarRef}>
          {tabs.map((t) => {
            const on = t.path === location.pathname
            return (
              <div
                key={t.path}
                className={`pcv-tab${on ? ' on' : ''}`}
                onClick={() => { if (!on) navigate(t.path) }}
                title={t.label}
              >
                <span className="pcv-tab-label">{t.label}</span>
                {tabs.length > 1 && (
                  <button className="pcv-tab-x" title="关闭标签" onClick={(e) => closeTab(e, t.path)}>×</button>
                )}
              </div>
            )
          })}
        </div>

        <div className="pcv-tabpages">
          {tabs.map((t) => (
            <div
              key={t.path}
              className="pcv-tabpage"
              style={{ display: t.path === location.pathname ? 'flex' : 'none' }}
            >
              {pages.get(t.path) || null}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
