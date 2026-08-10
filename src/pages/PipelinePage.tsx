import { Filter, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageIntro } from '../components/PageIntro'
import { StatusBadge } from '../components/StatusBadge'
import { useData } from '../context/DataContext'
import type { VideoStatus } from '../types'
import { formatNumber, getFollowerGain } from '../utils/analytics'

const allStatuses: Array<'All' | VideoStatus> = ['All', 'Idea', 'Script Pending', 'Editing', 'Ready to Upload', 'Scheduled', 'Uploaded', 'Delayed']

export function PipelinePage() {
  const { accounts, videos } = useData()
  const [status, setStatus] = useState<'All' | VideoStatus>('All')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => videos.filter((video) => {
    const account = accounts.find((item) => item.id === video.accountId)
    const matchesStatus = status === 'All' || video.status === status
    const haystack = `${video.title} ${account?.name ?? ''} ${video.editor} ${video.uploader}`.toLowerCase()
    return matchesStatus && haystack.includes(search.toLowerCase())
  }), [accounts, videos, search, status])

  return (
    <div className="page-stack">
      <PageIntro title="Content pipeline" description="Track every video from idea to upload, with its editor, uploader, schedule, views and follower result." />

      <section className="panel filter-bar">
        <div className="search-box"><Search size={17} /><input placeholder="Search video, account or team member" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="filter-select"><Filter size={16} /><select value={status} onChange={(event) => setStatus(event.target.value as 'All' | VideoStatus)}>{allStatuses.map((item) => <option key={item}>{item}</option>)}</select></div>
      </section>

      <section className="panel table-panel">
        <div className="panel-head"><div><span className="panel-kicker">PRODUCTION CONTROL</span><h3>{filtered.length} video records</h3></div></div>
        <div className="table-scroll">
          <table className="pipeline-table">
            <thead><tr><th>Video</th><th>Status</th><th>Editor</th><th>Uploader</th><th>Schedule</th><th>Upload slot</th><th>Views</th><th>Follower gain</th></tr></thead>
            <tbody>
              {filtered.map((video) => {
                const account = accounts.find((item) => item.id === video.accountId)
                return (
                  <tr key={video.id}>
                    <td><div className="account-cell"><strong>{video.title}</strong><span>{account?.name ?? 'Unknown account'}</span></div></td>
                    <td><StatusBadge status={video.status} /></td>
                    <td>{video.editor}</td>
                    <td>{video.uploader}</td>
                    <td><div className="date-cell"><strong>{video.scheduledDate}</strong><span>{video.scheduledTime}</span></div></td>
                    <td>{video.uploadTimeSlot}</td>
                    <td>{video.views ? formatNumber(video.views) : '—'}</td>
                    <td><span className={getFollowerGain(video) > 0 ? 'gain' : ''}>{getFollowerGain(video) ? `+${getFollowerGain(video)}` : '—'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
