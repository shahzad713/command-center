import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import type { DailyFollowerSnapshot, TikTokAccount, VideoRecord, VideoStatus } from '../types'

export const statusColors: Record<VideoStatus, string> = {
  Idea: '#7c8aa6',
  'Script Pending': '#a78bfa',
  Editing: '#f59e0b',
  'Ready to Upload': '#22d3ee',
  Scheduled: '#60a5fa',
  Uploaded: '#34d399',
  Delayed: '#fb7185',
}

export const getToday = () => new Date().toISOString().slice(0, 10)

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)

export const formatFullNumber = (value: number) => new Intl.NumberFormat('en-US').format(value)

export const getFollowerGain = (video: VideoRecord) => Math.max(0, video.followersAfter - video.followersBefore)

export const getAccountProgress = (account: TikTokAccount) =>
  Math.min(100, Math.round((account.currentFollowers / account.followerGoal) * 100))

export const getDashboardStats = (accounts: TikTokAccount[], videos: VideoRecord[]) => {
  const today = getToday()
  const todayVideos = videos.filter((video) => video.scheduledDate === today)
  const activeAccounts = accounts.filter((account) => account.active)
  const totalGoal = activeAccounts.reduce((sum, account) => sum + account.followerGoal, 0)
  const totalFollowers = activeAccounts.reduce((sum, account) => sum + account.currentFollowers, 0)

  return {
    activeAccounts: activeAccounts.length,
    uploadedToday: todayVideos.filter((video) => video.status === 'Uploaded').length,
    pendingToday: todayVideos.filter((video) => !['Uploaded', 'Scheduled'].includes(video.status)).length,
    readyToUpload: videos.filter((video) => video.status === 'Ready to Upload').length,
    delayed: videos.filter((video) => video.status === 'Delayed').length,
    totalFollowers,
    followersToGoal: Math.max(0, totalGoal - totalFollowers),
    monetizedAccounts: accounts.filter((account) => account.monetizationStatus === 'Monetized').length,
  }
}

export const getStatusDistribution = (videos: VideoRecord[]) => {
  const counts = videos.reduce<Record<string, number>>((acc, video) => {
    acc[video.status] = (acc[video.status] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts).map(([name, value]) => ({ name, value, color: statusColors[name as VideoStatus] }))
}

export const getFollowerSeries = (snapshots: DailyFollowerSnapshot[], accounts: TikTokAccount[]) => {
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]))
  const byDate = new Map<string, Record<string, string | number>>()

  snapshots
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((snapshot) => {
      const row = byDate.get(snapshot.date) ?? { date: snapshot.date, label: format(parseISO(snapshot.date), 'MMM d') }
      row[accountMap.get(snapshot.accountId) ?? snapshot.accountId] = snapshot.followers
      byDate.set(snapshot.date, row)
    })

  return Array.from(byDate.values())
}

export const getUploaderPerformance = (videos: VideoRecord[]) => {
  const uploaded = videos.filter((video) => video.status === 'Uploaded')
  const map = new Map<string, { uploader: string; uploads: number; views: number; followers: number }>()
  uploaded.forEach((video) => {
    const row = map.get(video.uploader) ?? { uploader: video.uploader, uploads: 0, views: 0, followers: 0 }
    row.uploads += 1
    row.views += video.views
    row.followers += getFollowerGain(video)
    map.set(video.uploader, row)
  })
  return Array.from(map.values()).sort((a, b) => b.uploads - a.uploads)
}

export const getTimePerformance = (videos: VideoRecord[]) => {
  const uploaded = videos.filter((video) => video.status === 'Uploaded' && video.uploadedAt)
  return uploaded.map((video) => {
    const time = video.uploadedAt?.split('T')[1]?.slice(0, 5) ?? video.scheduledTime
    const [hour, minute] = time.split(':').map(Number)
    return {
      title: video.title,
      uploader: video.uploader,
      hour: hour + minute / 60,
      views: video.views,
      followerGain: getFollowerGain(video),
      time,
    }
  })
}

export const getWeeklyUploads = (videos: VideoRecord[]) => {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date: date.toISOString().slice(0, 10),
      day: format(date, 'EEE'),
      uploaded: 0,
      planned: 0,
    }
  })
  videos.forEach((video) => {
    const date = parseISO(video.scheduledDate)
    if (date >= start && date <= end) {
      const row = days.find((item) => item.date === video.scheduledDate)
      if (row) {
        row.planned += 1
        if (video.status === 'Uploaded') row.uploaded += 1
      }
    }
  })
  return days
}

export const getAccountVideoSummary = (accounts: TikTokAccount[], videos: VideoRecord[]) =>
  accounts.map((account) => {
    const accountVideos = videos.filter((video) => video.accountId === account.id)
    const uploaded = accountVideos.filter((video) => video.status === 'Uploaded')
    const lastUploaded = uploaded.sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''))[0]
    return {
      ...account,
      uploadedCount: uploaded.length,
      pendingCount: accountVideos.filter((video) => !['Uploaded'].includes(video.status)).length,
      lastVideoViews: lastUploaded?.views ?? 0,
      lastUpload: lastUploaded?.uploadedAt ?? '',
    }
  })
