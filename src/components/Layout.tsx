import { BarChart3, Film, Gauge, LogOut, Settings, ShieldCheck, UsersRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
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
  const { storageMode } = useData()
  const { user, logout, isDemoMode } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">TC</div>
          <div>
            <strong>TikTok Command</strong>
            <span>8-account control room</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="connection-pill">
            <span className="status-dot" />
            {storageMode}
          </div>
          <p>Built for Yasir’s content team</p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">OPERATIONS DASHBOARD</span>
            <h1>TikTok Command Center</h1>
          </div>
          <div className="topbar-actions">
            <div className="team-stack" aria-label="Team members">
              {['Y', 'A', 'R', 'S'].map((letter, index) => <span key={letter} style={{ zIndex: 10 - index }}>{letter}</span>)}
            </div>
            <NavLink to="/admin" className="button primary compact">Add daily update</NavLink>
            {user && <button className="icon-button top-logout" onClick={logout} title="Sign out"><LogOut size={17} /></button>}
            {isDemoMode && <span className="demo-chip">Demo</span>}
          </div>
        </header>
        <div className="page-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
