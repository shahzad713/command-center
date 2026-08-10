import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Goal,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AccountProgress } from '../components/AccountProgress'
import { PageIntro } from '../components/PageIntro'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { useData } from '../context/DataContext'
import {
  formatFullNumber,
  formatNumber,
  getAccountVideoSummary,
  getDashboardStats,
  getFollowerSeries,
  getStatusDistribution,
  getUploaderPerformance,
  getWeeklyUploads,
} from '../utils/analytics'

export function DashboardPage() {
  const { accounts, videos, snapshots, loading } = useData()

  if (loading) return <div className="loading-panel">Loading command center…</div>

  const stats = getDashboardStats(accounts, videos)
  const followerSeries = getFollowerSeries(snapshots, accounts)
  const statusData = getStatusDistribution(videos)
  const uploaderData = getUploaderPerformance(videos)
  const weeklyData = getWeeklyUploads(videos)
  const accountSummary = getAccountVideoSummary(accounts, videos)
  const today = new Date().toISOString().slice(0, 10)
  const todayQueue = videos
    .filter((video) => video.scheduledDate === today || video.status === 'Delayed')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

  const lineAccounts = accounts.slice(0, 4)

  return (
    <div className="page-stack">
      <PageIntro
        title="Today at a glance"
        description="One live view of production, uploads, follower growth, ownership and the first 10,000-follower target."
        action={<div className="date-chip"><Clock3 size={15} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>}
      />

      <section className="stats-grid">
        <StatCard label="Active accounts" value={stats.activeAccounts} helper={`${stats.monetizedAccounts} monetized`} icon={UsersRound} tone="purple" />
        <StatCard label="Uploaded today" value={stats.uploadedToday} helper={`${stats.pendingToday} still pending`} icon={CheckCircle2} tone="green" />
        <StatCard label="Ready to upload" value={stats.readyToUpload} helper="Final file complete" icon={Sparkles} tone="cyan" />
        <StatCard label="Delayed items" value={stats.delayed} helper="Needs immediate action" icon={AlertTriangle} tone="pink" />
        <StatCard label="Total followers" value={formatNumber(stats.totalFollowers)} helper={`${formatFullNumber(stats.followersToGoal)} to all first goals`} icon={Goal} tone="amber" />
        <StatCard label="Monetized" value={`${stats.monetizedAccounts}/${accounts.length}`} helper="Account eligibility" icon={CircleDollarSign} tone="green" />
      </section>

      <section className="dashboard-grid two-one">
        <article className="panel chart-panel">
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
                      <stop offset="5%" stopColor={['#22d3ee', '#a78bfa', '#34d399', '#fb7185'][index]} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={['#22d3ee', '#a78bfa', '#34d399', '#fb7185'][index]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} />
                <XAxis dataKey="label" stroke="#8492aa" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="#8492aa" tickLine={false} axisLine={false} fontSize={12} width={45} tickFormatter={formatNumber} />
                <Tooltip contentStyle={{ background: '#111a2b', border: '1px solid #263550', borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                {lineAccounts.map((account, index) => (
                  <Area
                    key={account.id}
                    type="monotone"
                    dataKey={account.name}
                    stroke={['#22d3ee', '#a78bfa', '#34d399', '#fb7185'][index]}
                    fill={`url(#gradient-${index})`}
                    strokeWidth={2.5}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">WORKFLOW HEALTH</span>
              <h3>Content status</h3>
            </div>
          </div>
          <div className="chart-box donut-box">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} innerRadius={58} outerRadius={84} paddingAngle={4} dataKey="value" nameKey="name">
                  {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111a2b', border: '1px solid #263550', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><strong>{videos.length}</strong><span>videos</span></div>
          </div>
          <div className="mini-legend">
            {statusData.slice(0, 5).map((entry) => (
              <div key={entry.name}><span style={{ background: entry.color }} />{entry.name}<b>{entry.value}</b></div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid equal">
        <article className="panel chart-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">CONSISTENCY</span>
              <h3>This week: planned vs uploaded</h3>
            </div>
          </div>
          <div className="chart-box medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} />
                <XAxis dataKey="day" stroke="#8492aa" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} stroke="#8492aa" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={{ background: '#111a2b', border: '1px solid #263550', borderRadius: 12 }} />
                <Bar dataKey="planned" fill="#334155" radius={[6, 6, 0, 0]} />
                <Bar dataKey="uploaded" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">TEAM OUTPUT</span>
              <h3>Uploads by team member</h3>
            </div>
          </div>
          <div className="chart-box medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uploaderData} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="#8492aa" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis dataKey="uploader" type="category" stroke="#8492aa" tickLine={false} axisLine={false} fontSize={12} width={70} />
                <Tooltip contentStyle={{ background: '#111a2b', border: '1px solid #263550', borderRadius: 12 }} />
                <Bar dataKey="uploads" fill="#a78bfa" radius={[0, 7, 7, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="panel-kicker">10K MILESTONE</span>
            <h3>Follower goal by account</h3>
          </div>
          <span className="text-note">Goal can be changed per account</span>
        </div>
        <div className="account-progress-grid">
          {accounts.map((account) => <AccountProgress key={account.id} account={account} />)}
        </div>
      </section>

      <section className="dashboard-grid two-one reverse-mobile">
        <article className="panel queue-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">TODAY’S CONTROL LIST</span>
              <h3>Upload queue and blockers</h3>
            </div>
          </div>
          <div className="queue-list">
            {todayQueue.length === 0 ? <p className="empty-copy">No videos scheduled for today.</p> : todayQueue.map((video) => {
              const account = accounts.find((item) => item.id === video.accountId)
              return (
                <div className="queue-row" key={video.id}>
                  <div className="time-block"><strong>{video.scheduledTime}</strong><span>{video.uploadTimeSlot}</span></div>
                  <div className="queue-main">
                    <strong>{video.title}</strong>
                    <span>{account?.name} · Editor: {video.editor} · Uploader: {video.uploader}</span>
                  </div>
                  <StatusBadge status={video.status} />
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel insight-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">MANAGER SIGNALS</span>
              <h3>What needs attention</h3>
            </div>
            <Activity size={19} />
          </div>
          <div className="signal-list">
            <div className="signal critical"><AlertTriangle size={18} /><div><strong>{stats.delayed} delayed video</strong><span>Resolve before adding new production work.</span></div></div>
            <div className="signal positive"><Sparkles size={18} /><div><strong>{stats.readyToUpload} video ready</strong><span>Review caption and schedule the best time.</span></div></div>
            <div className="signal neutral"><Goal size={18} /><div><strong>{formatFullNumber(stats.followersToGoal)} followers remaining</strong><span>Across all first 10K account goals.</span></div></div>
          </div>
        </article>
      </section>

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <span className="panel-kicker">ACCOUNT PULSE</span>
            <h3>Latest account performance</h3>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Account</th><th>Assigned</th><th>Followers</th><th>Last video views</th><th>Pending</th><th>Monetization</th></tr></thead>
            <tbody>
              {accountSummary.map((account) => (
                <tr key={account.id}>
                  <td><div className="account-cell"><strong>{account.name}</strong><span>{account.niche}</span></div></td>
                  <td>{account.assignedTo}</td>
                  <td>{formatFullNumber(account.currentFollowers)}</td>
                  <td>{formatNumber(account.lastVideoViews)}</td>
                  <td>{account.pendingCount}</td>
                  <td><span className={`plain-pill ${account.monetizationStatus === 'Monetized' ? 'success' : ''}`}>{account.monetizationStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
