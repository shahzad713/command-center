export type VideoStatus =
  | 'Idea'
  | 'Script Pending'
  | 'Editing'
  | 'Ready to Upload'
  | 'Scheduled'
  | 'Uploaded'
  | 'Delayed'

export type MonetizationStatus = 'Monetized' | 'Not Monetized' | 'Under Review'

export const PLATFORM_PRESETS = ['Facebook', 'TikTok', 'Instagram', 'X', 'Other'] as const

export interface TikTokAccount {
  id: string
  name: string
  handle: string
  niche: string
  owner: string
  assignedTo: string
  targetCountry: string
  currentFollowers: number
  followerGoal: number
  monetizationStatus: MonetizationStatus
  dailyUploadTarget: number
  platform: string
  twoFactorCode?: string
  // User-facing account creation date (YYYY-MM-DD). Distinct from the system `createdAt`
  // timestamp: this one defaults to today on new accounts but is editable. Optional so
  // existing documents that predate the field keep working untouched.
  accountCreationDate?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface VideoRecord {
  id: string
  accountId: string
  title: string
  status: VideoStatus
  editor: string
  uploader: string
  scheduledDate: string
  scheduledTime: string
  uploadedAt?: string
  uploadTimeSlot: string
  views: number
  followersBefore: number
  followersAfter: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface DailyFollowerSnapshot {
  id: string
  accountId: string
  date: string
  followers: number
  source: 'Manual' | 'Video upload'
  createdAt: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
}

export interface DashboardStats {
  activeAccounts: number
  uploadedToday: number
  pendingToday: number
  readyToUpload: number
  delayed: number
  totalFollowers: number
  followersToGoal: number
  monetizedAccounts: number
}

export type EditableAccount = Omit<TikTokAccount, 'id' | 'createdAt' | 'updatedAt'>
export type EditableVideo = Omit<VideoRecord, 'id' | 'createdAt' | 'updatedAt'>
export type EditableSnapshot = Omit<DailyFollowerSnapshot, 'id' | 'createdAt'>
