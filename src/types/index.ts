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
  // Owning tenant. Always equals the Firebase Auth uid of the account's creator.
  // Every read query filters on this and every write injects it (see DataContext).
  tenantId: string
  name: string
  handle: string
  // Email address tied to this social account. Optional so existing documents that
  // predate the field keep working untouched.
  email?: string
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
  // Owning tenant (Firebase Auth uid of creator). See TikTokAccount.tenantId.
  tenantId: string
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
  // Owning tenant (Firebase Auth uid of creator). See TikTokAccount.tenantId.
  tenantId: string
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

// One document per registered platform user, keyed by Firebase Auth uid.
// Provisioned/updated on every login (see AuthContext). Powers the Super Admin
// tenant directory. For a normal user, `tenantId === id === their own uid`.
export interface UserRecord {
  id: string
  tenantId: string
  email: string
  displayName?: string
  // When true, Firestore rules + the app lock this tenant out of all data.
  disabled?: boolean
  createdAt: string
  lastLoginAt: string
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

// `tenantId` is injected server-side-style by DataContext on write, so forms never
// supply it (nor id/createdAt/updatedAt).
export type EditableAccount = Omit<TikTokAccount, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
export type EditableVideo = Omit<VideoRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
export type EditableSnapshot = Omit<DailyFollowerSnapshot, 'id' | 'tenantId' | 'createdAt'>
