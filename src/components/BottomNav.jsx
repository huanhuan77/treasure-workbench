import { useState, useMemo, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

// 简单线性图标（SVG，跟随文字颜色）
const iconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const HomeIcon = () => (<svg {...iconProps}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M10 21v-5h4v5" /></svg>)
const PenIcon = () => (<svg {...iconProps}><path d="M4 20l1-4L16.5 4.5a2.12 2.12 0 0 1 3 3L8 19l-4 1Z" /><path d="M14.5 6.5l3 3" /></svg>)
const TagIcon = () => (<svg {...iconProps}><path d="M20.6 12.4 12.4 20.6a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.4V5.2a2 2 0 0 1 2-2h7.8a2 2 0 0 1 1.4.6l6.6 6.6a2 2 0 0 1 0 2Z" /><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /></svg>)
const MoneyIcon = () => (<svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M14.6 9.6c-.5-.8-1.5-1.2-2.6-1.2-1.4 0-2.5.9-2.5 2s1.1 2 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.4-2.6-1.2" /></svg>)
const MoreIcon = () => (<svg {...iconProps}><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>)
const VideoIcon = () => (<svg {...iconProps}><rect x="3" y="6" width="14" height="12" rx="2" /><path d="M17 10l4-2v8l-4-2" /></svg>)

// 底部主 tab（5 个核心功能 + 更多）：按用户要求把「视频发布记录」独立出来，不再藏在「更多」里
const mainTabs = [
  { to: '/', label: '总览', Icon: HomeIcon, end: true },
  { to: '/products', label: '文案库', Icon: PenIcon },
  { to: '/samples', label: '样品', Icon: TagIcon },
  { to: '/publish-records', label: '发布', Icon: VideoIcon },
  { to: '/orders', label: '出单', Icon: MoneyIcon },
]

// 更多侧边栏 tab（总览已有入口的不重复列出）
// 「收支」「追剧」原先在总览页，按用户要求移到此处，总览不再占位
const sideTabs = [
  { to: '/finance', label: '收支', icon: '💰' },
  { to: '/dramas', label: '追剧', icon: '📺' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/daily', label: '每日计划', icon: '📋' },
  { to: '/reading', label: '读书成长', icon: '📚' },
  { to: '/brands', label: '品牌方', icon: '🤝' },
  { to: '/savings', label: '攒钱计划', icon: '🐷' },
  { to: '/investment', label: '投资跟踪', icon: '📈' },
  { to: '/sensitive', label: '违禁词', icon: '🚫' },
  { to: '/inspiration', label: '灵感搜索', icon: '🔍' },
]

// 桌面端断点：≥768px 改成左侧边栏导航，<768px 保持底部导航 + 「更多」抽屉。
// 必须与 index.css 里 @media (min-width: 768px) 的布局块保持一致，
// 否则会出现「导航是侧边栏、内容还是手机宽度」的错位。
const DESKTOP_QUERY = '(min-width: 768px)'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

function TabItem({ to, label, Icon, end, onClick, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      style={({ isActive }) => ({
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '10px 0 8px',
        textDecoration: 'none',
        color: isActive ? 'var(--primary)' : 'var(--gray-400)',
        fontSize: '11px',
        transition: 'all 0.2s',
        position: 'relative',
      })}
    >
      {({ isActive }) => (
        <>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{
              display: 'block',
              width: '22px', height: '22px',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.2s',
            }}><Icon /></span>
            {badge > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px', right: '-10px',
                minWidth: '18px', height: '18px',
                padding: '0 5px',
                borderRadius: '9px',
                background: '#ec4899', color: '#fff',
                fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.85)',
                lineHeight: 1,
              }}>{badge > 99 ? '99+' : badge}</span>
            )}
          </div>
          <span style={{ fontWeight: isActive ? 600 : 500 }}>{label}</span>
          {isActive && !badge && (
            <span style={{
              position: 'absolute',
              top: 4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'var(--primary)',
            }} />
          )}
        </>
      )}
    </NavLink>
  )
}

// 桌面侧边栏条目：整行可点，选中态为淡粉底 + 主色文字。
// emoji 版用于「更多」里的分类（沿用原抽屉里的 emoji 图标），
// Icon 版用于主 tab（沿用底部导航的线性图标）。
function SideItem({ to, label, Icon, end, badge, emoji }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        marginBottom: '2px',
        borderRadius: '10px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? 'var(--primary)' : 'var(--text-main)',
        background: isActive ? 'rgba(244, 114, 182, 0.10)' : 'transparent',
        transition: 'background 0.15s',
      })}
    >
      {({ isActive }) => (
        <>
          {emoji ? (
            <span style={{ width: '20px', textAlign: 'center', fontSize: '16px', flexShrink: 0 }}>{emoji}</span>
          ) : (
            <span style={{
              width: '20px', height: '20px', display: 'block', flexShrink: 0,
              transform: isActive ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.2s',
            }}><Icon /></span>
          )}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          {badge > 0 && (
            <span style={{
              marginLeft: 'auto',
              minWidth: '18px', height: '18px', padding: '0 5px',
              borderRadius: '9px',
              background: '#ec4899', color: '#fff',
              fontSize: '10px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>{badge > 99 ? '99+' : badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

// 桌面端左侧边栏：把底部导航的 5 个主 tab 与「更多」抽屉里的分类合并成一列。
// z-index 取 100：高于页面内容与页面内吸顶栏（多在 50 上下），
// 低于抽屉（200+）、全屏弹窗（2000+）和 Toast（9999），
// 这样储蓄抽屉等从左侧滑出的浮层仍能盖住它。
function DesktopSidebar({ badgeFor }) {
  return (
    <aside
      style={{
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        width: 'var(--sidebar-w)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.7)',
        boxShadow: '4px 0 20px rgba(244, 114, 182, 0.06)',
        zIndex: 100,
      }}
    >
      <div style={{ padding: 'calc(22px + var(--safe-top)) 18px 10px', flexShrink: 0 }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          📝 宝藏工作台
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 20px' }}>
        {mainTabs.map(({ Icon, ...tab }) => (
          <SideItem key={tab.to} {...tab} Icon={Icon} badge={badgeFor(tab.to)} />
        ))}

        <div style={{ height: '1px', margin: '10px 12px', background: 'rgba(236, 72, 153, 0.12)' }} />
        <div style={{ padding: '0 12px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--gray-400)', letterSpacing: '0.5px' }}>
          更多
        </div>
        {sideTabs.map((tab) => (
          <SideItem key={tab.to} to={tab.to} label={tab.label} emoji={tab.icon} />
        ))}
      </nav>
    </aside>
  )
}

export function BottomNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { samples } = useStore()
  const isDesktop = useIsDesktop()

  // 样品 Tab 角标：未到货 + 已到货未拍摄 + 已拍摄未发布（=未发布的合计，不含已放弃）
  const samplesBadge = useMemo(
    () => samples.filter((s) => s.status === 'un_arrived' || s.status === 'arrived' || s.status === 'shot').length,
    [samples]
  )

  const getBadge = (to) => (to === '/samples' ? samplesBadge : 0)

  const handleSideNav = (to) => {
    navigate(to)
    setSidebarOpen(false)
  }

  // 桌面端：所有分类都在侧边栏里，不需要底部导航和「更多」抽屉
  if (isDesktop) return <DesktopSidebar badgeFor={getBadge} />

  return (
    <>
      {/* 底部导航栏 */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.7)',
          display: 'flex',
          paddingBottom: 'var(--safe-bottom)',
          zIndex: 999,
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          boxShadow: '0 -4px 20px rgba(244, 114, 182, 0.06)',
        }}
      >
        {mainTabs.map(({ Icon, ...tab }) => (
          <TabItem key={tab.to} {...tab} Icon={Icon} badge={getBadge(tab.to)} onClick={() => setSidebarOpen(false)} />
        ))}
        {/* 更多按钮 */}
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '10px 0 8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--gray-400)',
            fontSize: '11px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <span style={{ display: 'block', width: '22px', height: '22px' }}><MoreIcon /></span>
          <span style={{ fontWeight: 500 }}>更多</span>
        </button>
      </nav>

      {/* 遮罩层 */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 199,
          }}
        />
      )}

      {/* 侧边栏 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '260px',
          maxWidth: '75vw',
          background: '#fff',
          zIndex: 200,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'calc(20px + var(--safe-top))',
        }}
      >
        <div style={{ padding: '16px 20px 8px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>更多功能</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {sideTabs.map((tab) => {
            const isActive = location.hash === `#${tab.to}` || location.hash.startsWith(`#${tab.to}?`)
            return (
              <button
                key={tab.to}
                onClick={() => handleSideNav(tab.to)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 12px',
                  marginBottom: '4px',
                  border: 'none',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(244, 114, 182, 0.10)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-main)',
                  fontSize: '15px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--primary)' }}>●</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
