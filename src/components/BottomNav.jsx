import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '首页', icon: '🏠', end: true },
  { to: '/finance', label: '财务', icon: '💰' },
  { to: '/sensitive', label: '词库', icon: '📚' },
  { to: '/extract', label: '提取', icon: '📝' },
]

export function BottomNav() {
  return (
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
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
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
              <span style={{
                fontSize: '22px',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s',
                display: 'block',
              }}>{tab.icon}</span>
              <span style={{ fontWeight: isActive ? 600 : 500 }}>{tab.label}</span>
              {isActive && (
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
      ))}
    </nav>
  )
}