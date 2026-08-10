import { BarChart3, Clock4, TrendingUp, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { PageIntro } from '../components/PageIntro'
import { StatCard } from '../components/StatCard'
import { useData } from '../context/DataContext'
import { formatFullNumber, formatNumber, getFollowerGain, getTimePerformance, getUploaderPerformance } from '../utils/analytics'

const chartPalette = ['#22d3ee', '#a78bfa', '#34d399', '#f59e0b', '#fb7185', '#60a5fa', '#f472b6', '#2dd4bf']

export function AnalyticsPage() {
  const { accounts, videos } = useData()
  const uploaded = videos.filter((video) => video.status === 'Uploaded')
  const uploaderData = getUploaderPerformance(videos)
  const timeData = getTimePerformance(videos)
  const accountData = accounts.map((account) => {
    const items = uploaded.filter((video) => video.accountId === account.id)
    return {
      name: account.name,
      views: items.reduce((sum, video) => sum + video.views, 0),
      followerGain: items.reduce((sum, video) => sum + getFollowerGain(video), 0),
      uploads: items.length,
    }
  }).sort((a, b) => b.views - a.views)

  const topVideo = uploaded.slice().sort((a, b) => b.views - a.views)[0]
  const totalViews = uploaded.reduce((sum, video) => sum + video.views, 0)
  const totalGain = uploaded.reduce((sum, video) => sum + getFollowerGain(video), 0)
  const bestTime = timeData.slice().sort((a, b) => b.views - a.views)[0]

  return (
    <div className="page-stack">
      <PageIntro title="Performance analytics" description="Follower-first reporting: identify which account, uploader and upload time creates the strongest growth." />

      <section className="stats-grid four">
        <StatCard label="Tracked views" value={formatNumber(totalViews)} helper="Uploaded videos only" icon={BarChart3} tone="cyan" />
        <StatCard label="Follower gain" value={`+${formatFullNumber(totalGain)}`} helper="From tracked uploads" icon={Users} tone="green" />
        <StatCard label="Top video" value={topVideo ? formatNumber(topVideo.views) : '—'} helper={topVideo?.title ?? 'No upload yet'} icon={TrendingUp} tone="purple" />
        <StatCard label="Best upload time" value={bestTime?.time ?? '—'} helper={bestTime ? `${formatNumber(bestTime.views)} views` : 'More data required'} icon={Clock4} tone="amber" />
      </section>

      <section className="dashboard-grid equal">
        <article className="panel chart-panel">
          <div className="panel-head"><div><span className="panel-kicker">ACCOUNT COMPARISON</span><h3>Total views by account</h3></div></div>
          <div className="chart-box tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountData} margin={{ bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} />
                <XAxis dataKey="name" stroke="#8492aa" tickLine={false} axisLine={false} fontSize={11} angle={-25} textAnchor="end" interval={0} />
                <YAxis stroke="#8492aa" tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatNumber} />
                <Tooltip contentStyle={{ background: '#111a2b', border: '1px solid #263550', borderRadius: 12 }} formatter={(value) => formatFullNumber(Number(value))} />
                <Bar dataKey="views" radius={[8, 8, 0, 0]}>
                  {accountData.map((entry, index) => <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-head"><div><span className="panel-kicker">TIMING INTELLIGENCE</span><h3>Upload time vs views</h3></div></div>
          <div className="chart-box tall">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" />
                <XAxis type="number" dataKey="hour" name="Upload hour" domain={[0, 24]} ticks={[0, 4, 8, 12, 16, 20, 24]} stroke="#8492aa" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}:00`} />
                <YAxis type="number" dataKey="views" name="Views" stroke="#8492aa" tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                <ZAxis type="number" dataKey="followerGain" range={[80, 500]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#111a2b', border: '1px solid #263550', borderRadius: 12 }} formatter={(value, name) => name === 'Views' ? formatFullNumber(Number(value)) : value} />
                <Scatter data={timeData} fill="#22d3ee" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-footnote">Bubble size represents follower gain. More daily records will improve timing recommendations.</p>
        </article>
      </section>

      <section className="dashboard-grid equal">
        <article className="panel table-panel">
          <div className="panel-head"><div><span className="panel-kicker">UPLOADER SCOREBOARD</span><h3>Team contribution</h3></div></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Uploader</th><th>Uploads</th><th>Total views</th><th>Follower gain</th><th>Avg. views</th></tr></thead>
              <tbody>{uploaderData.map((row) => <tr key={row.uploader}><td><strong>{row.uploader}</strong></td><td>{row.uploads}</td><td>{formatNumber(row.views)}</td><td><span className="gain">+{formatFullNumber(row.followers)}</span></td><td>{formatNumber(row.uploads ? row.views / row.uploads : 0)}</td></tr>)}</tbody>
            </table>
          </div>
        </article>

        <article className="panel table-panel">
          <div className="panel-head"><div><span className="panel-kicker">FOLLOWER EFFICIENCY</span><h3>Growth by account</h3></div></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Account</th><th>Uploads</th><th>Views</th><th>Follower gain</th><th>Gain / upload</th></tr></thead>
              <tbody>{accountData.map((row) => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.uploads}</td><td>{formatNumber(row.views)}</td><td><span className="gain">+{formatFullNumber(row.followerGain)}</span></td><td>{row.uploads ? Math.round(row.followerGain / row.uploads) : 0}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}
