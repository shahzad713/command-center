import { AlertTriangle, CheckCircle2, Clock3, Goal, UsersRound } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageIntro } from '../components/PageIntro'
import { StatCard } from '../components/StatCard'
import { useData } from '../context/DataContext'
import { useTheme } from '../context/ThemeContext'
import {
  formatFullNumber,
  formatNumber,
  getDashboardStats,
  getFollowerSeries,
  getWeeklyUploads,
} from '../utils/analytics'

const AREA_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fb7185']

export function DashboardPage() {
  const { accounts, videos, snapshots, loading } = useData()
  const { theme } = useTheme()

  if (loading) return <div className="loading-panel">Loading command center…</div>

  const stats = getDashboardStats(accounts, videos)
  const followerSeries = getFollowerSeries(snapshots, accounts)
  const weeklyData = getWeeklyUploads(videos)
  const lineAccounts = accounts.slice(0, 4)

  // Theme-aware chart chrome so both light and dark read cleanly.
  const axisColor = theme === 'light' ? '#64748b' : '#8492aa'
  const gridColor = theme === 'light' ? 'rgba(15,23,42,.08)' : 'rgba(148,163,184,.12)'
  const tooltipStyle = theme === 'light'
    ? { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#1e293b' }
    : { background: '#111a2b', border: '1px solid #263550', borderRadius: 12 }

  return (
    <div className="page-stack">
      <PageIntro
        title="Today at a glance"
        description="A clean, focused read on follower momentum and how consistently content is shipping."
        action={<div className="date-chip"><Clock3 size={15} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>}
      />

      <section className="stats-grid four">
        <StatCard label="Active accounts" value={stats.activeAccounts} helper={`${stats.monetizedAccounts} monetized`} icon={UsersRound} tone="purple" />
        <StatCard label="Total followers" value={formatNumber(stats.totalFollowers)} helper={`${formatFullNumber(stats.followersToGoal)} to goals`} icon={Goal} tone="cyan" />
        <StatCard label="Uploaded today" value={stats.uploadedToday} helper={`${stats.pendingToday} still pending`} icon={CheckCircle2} tone="green" />
        <StatCard label="Delayed items" value={stats.delayed} helper="Needs attention" icon={AlertTriangle} tone="pink" />
      </section>

      {accounts.length === 0 ? (
        <section className="panel">
          <div className="panel-head"><div><span className="panel-kicker">GETTING STARTED</span><h3>No data yet</h3></div></div>
          <p className="empty-copy">Add your first account and daily updates to see follower growth and upload performance here.</p>
        </section>
      ) : (
        <>
          <section className="panel chart-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">FOLLOWER MOMENTUM</span>
                <h3>7-day follower growth</h3>
              </div>
              <span className="live-label"><span /> Live data</span>
            </div>
            <div className="chart-box tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={followerSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {lineAccounts.map((account, index) => (
                      <linearGradient key={account.id} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={AREA_COLORS[index]} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={AREA_COLORS[index]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} width={45} tickFormatter={formatNumber} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  {lineAccounts.map((account, index) => (
                    <Area
                      key={account.id}
                      type="monotone"
                      dataKey={account.name}
                      stroke={AREA_COLORS[index]}
                      fill={`url(#gradient-${index})`}
                      strokeWidth={2.5}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel chart-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">CONTENT PERFORMANCE</span>
                <h3>Uploads efficiency — planned vs uploaded (this week)</h3>
              </div>
            </div>
            <div className="chart-box medium">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="day" stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Bar dataKey="planned" name="Planned" fill={theme === 'light' ? '#cbd5e1' : '#334155'} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="uploaded" name="Uploaded" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
