import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

// 底部主 tab（4 个核心功能）
const mainTabs = [
  { to: '/', label: '总览', icon: '🏠', end: true },
  { to: '/products', label: '文案库', icon: '📝' },
  { to: '/samples', label: '样品', icon: '🏷️' },
  { to: '/orders', label: '出单', icon: '🧾' },
]

// 更多侧边栏 tab
const sideTabs = [
  { to: '/finance', label: '收支', icon: '💳' },
  { to: '/publish-reminders', label: '发布提醒', icon: '⏰' },
  { to: '/publish-records', label: '视频发布记录', icon: '🎬' },
  { to: '/daily', label: '每日计划', icon: '📋' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/reading', label: '读书成长', icon: '📚' },
  { to: '/brands', label: '品牌方', icon: '🤝' },
  { to: '/savings', label: '攒钱计划', icon: '🐷' },
  { to: '/investment', label: '投资跟踪', icon: '📈' },
  { to: '/backup', label: '数据备份', icon: '💾' },
  { to: '/sensitive', label: '词库', icon: '📚' },
  { to: '/sensitive-check', label: '违禁词检测', icon: '🚫' },
]

function TabItem({ to, label, icon, end, onClick, badge }) {
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
              fontSize: '22px',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.2s',
              display: 'block',
            }}>{icon}</span>
            {badge > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px', right: '-10px',
                minWidth: '18px', height: '18px',
                padding: '0 5px',
                borderRadius: '9px',
                background: '#ef4444', color: '#fff',
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

export function BottomNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const handleSideNav = (to) => {
    navigate(to)
    setSidebarOpen(false)
  }

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
          zIndex: 100,
          boxShadow: '0 -4px 20px rgba(244, 114, 182, 0.06)',
        }}
      >
        {mainTabs.map((tab) => (
          <TabItem key={tab.to} {...tab} badge={0} />
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
          <span style={{ fontSize: '22px', display: 'block' }}>☰</span>
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
