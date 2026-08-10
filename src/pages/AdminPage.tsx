import { Check, Database, FilePlus2, RefreshCcw, Save, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageIntro } from '../components/PageIntro'
import { StatusBadge } from '../components/StatusBadge'
import { useData } from '../context/DataContext'
import { teamMembers } from '../data/seed'
import type { EditableVideo, VideoStatus } from '../types'

const statuses: VideoStatus[] = ['Idea', 'Script Pending', 'Editing', 'Ready to Upload', 'Scheduled', 'Uploaded', 'Delayed']
const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Late Night']
const today = new Date().toISOString().slice(0, 10)

export function AdminPage() {
  const { accounts, videos, addVideo, updateVideo, addSnapshot, storageMode } = useData()
  const [activeTab, setActiveTab] = useState<'video' | 'followers' | 'quick'>('video')
  const [message, setMessage] = useState('')
  const firstAccount = accounts[0]
  const [videoForm, setVideoForm] = useState<EditableVideo>({
    accountId: firstAccount?.id ?? '',
    title: '',
    status: 'Editing',
    editor: 'Asad',
    uploader: 'Yasir',
    scheduledDate: today,
    scheduledTime: '19:00',
    uploadedAt: undefined,
    uploadTimeSlot: 'Evening',
    views: 0,
    followersBefore: firstAccount?.currentFollowers ?? 0,
    followersAfter: firstAccount?.currentFollowers ?? 0,
    notes: '',
  })
  const [snapshotAccountId, setSnapshotAccountId] = useState(firstAccount?.id ?? '')
  const [snapshotFollowers, setSnapshotFollowers] = useState(String(firstAccount?.currentFollowers ?? 0))
  const [snapshotDate, setSnapshotDate] = useState(today)

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts])

  useEffect(() => {
    if (!firstAccount) return
    if (!videoForm.accountId) {
      setVideoForm((form) => ({
        ...form,
        accountId: firstAccount.id,
        followersBefore: firstAccount.currentFollowers,
        followersAfter: firstAccount.currentFollowers,
      }))
    }
    if (!snapshotAccountId) {
      setSnapshotAccountId(firstAccount.id)
      setSnapshotFollowers(String(firstAccount.currentFollowers))
    }
  }, [firstAccount, snapshotAccountId, videoForm.accountId])

  const showMessage = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3000)
  }

  const selectAccount = (accountId: string) => {
    const account = accountMap.get(accountId)
    setVideoForm((form) => ({
      ...form,
      accountId,
      followersBefore: account?.currentFollowers ?? 0,
      followersAfter: account?.currentFollowers ?? 0,
    }))
  }

  const submitVideo = async (event: FormEvent) => {
    event.preventDefault()
    const uploadedAt = videoForm.status === 'Uploaded'
      ? `${videoForm.scheduledDate}T${videoForm.scheduledTime}:00`
      : undefined
    await addVideo({ ...videoForm, uploadedAt })
    showMessage('Video update saved successfully.')
    const account = accountMap.get(videoForm.accountId)
    setVideoForm((form) => ({
      ...form,
      title: '',
      status: 'Editing',
      views: 0,
      followersBefore: account?.currentFollowers ?? 0,
      followersAfter: account?.currentFollowers ?? 0,
      notes: '',
      uploadedAt: undefined,
    }))
  }

  const submitSnapshot = async (event: FormEvent) => {
    event.preventDefault()
    await addSnapshot({
      accountId: snapshotAccountId,
      date: snapshotDate,
      followers: Number(snapshotFollowers) || 0,
      source: 'Manual',
    })
    showMessage('Follower snapshot added and account total updated.')
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Admin daily updates"
        description="This is the only page your team needs for manual data entry: add videos, update progress, record views and enter follower totals."
        action={<span className="connection-pill large"><span className="status-dot" />{storageMode}</span>}
      />

      <div className="admin-tabs">
        <button className={activeTab === 'video' ? 'active' : ''} onClick={() => setActiveTab('video')}><FilePlus2 size={17} />Add video update</button>
        <button className={activeTab === 'followers' ? 'active' : ''} onClick={() => setActiveTab('followers')}><UserPlus size={17} />Follower snapshot</button>
        <button className={activeTab === 'quick' ? 'active' : ''} onClick={() => setActiveTab('quick')}><RefreshCcw size={17} />Quick status control</button>
      </div>

      {message && <div className="success-banner"><Check size={18} />{message}</div>}

      {activeTab === 'video' && (
        <section className="panel admin-panel">
          <div className="panel-head"><div><span className="panel-kicker">NEW PRODUCTION RECORD</span><h3>Add today’s video or upload result</h3></div><Database size={20} /></div>
          <form onSubmit={submitVideo} className="admin-form">
            <div className="form-grid three">
              <label><span>TikTok account</span><select value={videoForm.accountId} onChange={(event) => selectAccount(event.target.value)} required>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label className="span-two"><span>Video title</span><input value={videoForm.title} onChange={(event) => setVideoForm({ ...videoForm, title: event.target.value })} placeholder="Enter the working or uploaded video title" required /></label>
              <label><span>Production status</span><select value={videoForm.status} onChange={(event) => setVideoForm({ ...videoForm, status: event.target.value as VideoStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label><span>Editor</span><select value={videoForm.editor} onChange={(event) => setVideoForm({ ...videoForm, editor: event.target.value })}>{teamMembers.map((member) => <option key={member.id}>{member.name}</option>)}</select></label>
              <label><span>Uploader</span><select value={videoForm.uploader} onChange={(event) => setVideoForm({ ...videoForm, uploader: event.target.value })}>{teamMembers.map((member) => <option key={member.id}>{member.name}</option>)}</select></label>
              <label><span>Scheduled date</span><input type="date" value={videoForm.scheduledDate} onChange={(event) => setVideoForm({ ...videoForm, scheduledDate: event.target.value })} required /></label>
              <label><span>Upload time</span><input type="time" value={videoForm.scheduledTime} onChange={(event) => setVideoForm({ ...videoForm, scheduledTime: event.target.value })} required /></label>
              <label><span>Time slot</span><select value={videoForm.uploadTimeSlot} onChange={(event) => setVideoForm({ ...videoForm, uploadTimeSlot: event.target.value })}>{timeSlots.map((slot) => <option key={slot}>{slot}</option>)}</select></label>
              <label><span>Current / previous video views</span><input type="number" min="0" value={videoForm.views} onChange={(event) => setVideoForm({ ...videoForm, views: Number(event.target.value) })} /></label>
              <label><span>Followers before upload</span><input type="number" min="0" value={videoForm.followersBefore} onChange={(event) => setVideoForm({ ...videoForm, followersBefore: Number(event.target.value) })} /></label>
              <label><span>Followers after/current</span><input type="number" min="0" value={videoForm.followersAfter} onChange={(event) => setVideoForm({ ...videoForm, followersAfter: Number(event.target.value) })} /></label>
              <label className="span-three"><span>Manager notes / blocker</span><textarea rows={4} value={videoForm.notes} onChange={(event) => setVideoForm({ ...videoForm, notes: event.target.value })} placeholder="What is complete, what is pending, or why it is delayed?" /></label>
            </div>
            <div className="form-submit-row">
              <p>When status is <strong>Uploaded</strong>, the follower total will also update the selected account.</p>
              <button type="submit" className="button primary"><Save size={17} />Save video update</button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'followers' && (
        <section className="panel admin-panel narrow-form-panel">
          <div className="panel-head"><div><span className="panel-kicker">DAILY FOLLOWER LOG</span><h3>Record an account snapshot</h3></div><UserPlus size={20} /></div>
          <form onSubmit={submitSnapshot} className="admin-form">
            <div className="form-grid three">
              <label><span>TikTok account</span><select value={snapshotAccountId} onChange={(event) => { const id = event.target.value; setSnapshotAccountId(id); setSnapshotFollowers(String(accountMap.get(id)?.currentFollowers ?? 0)) }}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label><span>Date</span><input type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} /></label>
              <label><span>Total followers</span><input type="number" min="0" value={snapshotFollowers} onChange={(event) => setSnapshotFollowers(event.target.value)} /></label>
            </div>
            <div className="form-submit-row"><p>This creates a new point in the follower-growth charts.</p><button type="submit" className="button primary"><Save size={17} />Save follower snapshot</button></div>
          </form>
        </section>
      )}

      {activeTab === 'quick' && (
        <section className="panel table-panel">
          <div className="panel-head"><div><span className="panel-kicker">FAST DAILY CONTROL</span><h3>Change production status instantly</h3></div></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Video</th><th>Account</th><th>Current status</th><th>Editor</th><th>Uploader</th><th>Change status</th></tr></thead>
              <tbody>{videos.map((video) => (
                <tr key={video.id}>
                  <td><strong>{video.title}</strong></td>
                  <td>{accountMap.get(video.accountId)?.name}</td>
                  <td><StatusBadge status={video.status} /></td>
                  <td>{video.editor}</td>
                  <td>{video.uploader}</td>
                  <td><select className="inline-select" value={video.status} onChange={async (event) => { const nextStatus = event.target.value as VideoStatus; await updateVideo(video.id, { status: nextStatus, uploadedAt: nextStatus === 'Uploaded' ? `${video.scheduledDate}T${video.scheduledTime}:00` : video.uploadedAt }); showMessage(`Status changed to ${nextStatus}.`) }}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
