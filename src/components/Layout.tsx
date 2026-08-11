import { BarChart3, Film, Gauge, LogOut, Settings, ShieldCheck, UserCog, UsersRound, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Command Center', icon: Gauge },
  { to: '/accounts', label: 'Accounts', icon: UsersRound },
  { to: '/pipeline', label: 'Content Pipeline', icon: Film },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin', label: 'Admin Updates', icon: ShieldCheck },
  { to: '/settings', label: 'Setup', icon: Settings },
]

export function Layout() {
  const { storageMode, isImpersonating, activeTenantId, resetTenant } = useData()
  const { user, logout, isDemoMode, isSuperAdmin } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">TC</div>
          <div>
            <strong>TikTok Command</strong>
            <span>Multi-tenant control room</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          {isSuperAdmin && (
            <NavLink to="/super-admin" className={({ isActive }) => isActive ? 'nav-link danger active' : 'nav-link danger'}>
              <UserCog size={18} />
              <span>Super Admin</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="connection-pill">
            <span className="status-dot" />
            {storageMode}
          </div>
          <p>Zero-trust multi-tenant platform</p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">OPERATIONS DASHBOARD</span>
            <h1>TikTok Command Center</h1>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <NavLink to="/admin" className="button primary compact">Add daily update</NavLink>
            {user && <button className="icon-button top-logout" onClick={logout} title="Sign out"><LogOut size={17} /></button>}
            {isDemoMode && <span className="demo-chip">Demo</span>}
          </div>
        </header>
        <div className="page-wrap">
          {isImpersonating && (
            <div className="impersonation-banner">
              <div className="imp-left">
                <UserCog size={16} />
                <span>Viewing tenant <strong>{activeTenantId}</strong> as Super Admin</span>
              </div>
              <button className="button danger" onClick={resetTenant}><X size={14} /> Exit impersonation</button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
