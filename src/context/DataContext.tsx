import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { db, firebaseEnabled } from '../services/firebase'
import { useAuth } from './AuthContext'
import type {
  DailyFollowerSnapshot,
  EditableAccount,
  EditableSnapshot,
  EditableVideo,
  TikTokAccount,
  VideoRecord,
} from '../types'

interface DataContextValue {
  accounts: TikTokAccount[]
  videos: VideoRecord[]
  snapshots: DailyFollowerSnapshot[]
  loading: boolean
  storageMode: 'Firebase' | 'Browser storage'
  // Tenant whose data is currently loaded. Normal users: their own uid.
  // Super Admin: their uid, or an impersonated tenant id.
  activeTenantId: string | null
  // True when a Super Admin is viewing someone else's data.
  isImpersonating: boolean
  // Super-Admin-only: switch the loaded tenant. No-op for normal users.
  setActiveTenant: (tenantId: string) => void
  // Return to viewing your own tenant.
  resetTenant: () => void
  addAccount: (account: EditableAccount) => Promise<void>
  updateAccount: (id: string, patch: Partial<TikTokAccount>) => Promise<void>
  addVideo: (video: EditableVideo) => Promise<void>
  updateVideo: (id: string, patch: Partial<VideoRecord>) => Promise<void>
  addSnapshot: (snapshot: EditableSnapshot) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const STORAGE_KEYS = {
  accounts: 'tcc_accounts_v1',
  videos: 'tcc_videos_v1',
  snapshots: 'tcc_snapshots_v1',
}

// Tenant id used only in offline mode (no Firebase configured). Real tenants use
// their Firebase Auth uid. No demo data is ever preloaded under this id.
const LOCAL_TENANT_ID = 'local'

// Per-tenant collections, all scoped by a `tenantId` field.
const TENANT_COLLECTIONS = ['accounts', 'videos', 'snapshots'] as const

/**
 * One-time legacy migration. Documents created before multi-tenancy have no
 * `tenantId`, so the tenant-scoped queries filter them out. Firestore cannot query
 * for a missing field, so we read each collection in full (allowed for the Super
 * Admin by firestore.rules) and stamp any doc lacking a tenantId with the Super
 * Admin's uid. Runs only for the Super Admin, once per session.
 */
async function migrateLegacyDocs(ownerUid: string): Promise<void> {
  if (!firebaseEnabled || !db) return
  for (const collectionName of TENANT_COLLECTIONS) {
    const snap = await getDocs(collection(db, collectionName))
    const legacy = snap.docs.filter((docSnap) => {
      const tenantId = (docSnap.data() as { tenantId?: unknown }).tenantId
      return tenantId == null || tenantId === ''
    })
    for (let i = 0; i < legacy.length; i += 400) {
      const batch = writeBatch(db)
      legacy.slice(i, i + 400).forEach((docSnap) => batch.update(docSnap.ref, { tenantId: ownerUid }))
      await batch.commit()
    }
  }
}

const loadLocal = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

const saveLocal = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const createId = () => crypto.randomUUID()

const byScheduledDateDesc = (a: VideoRecord, b: VideoRecord) => b.scheduledDate.localeCompare(a.scheduledDate)
const byDateAsc = (a: DailyFollowerSnapshot, b: DailyFollowerSnapshot) => a.date.localeCompare(b.date)

export function DataProvider({ children }: { children: ReactNode }) {
  const { uid, isSuperAdmin, isDemoMode, loading: authLoading } = useAuth()
  const [accounts, setAccounts] = useState<TikTokAccount[]>([])
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [snapshots, setSnapshots] = useState<DailyFollowerSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantOverride, setTenantOverride] = useState<string | null>(null)

  // The tenant this user genuinely owns. Offline mode has no auth, so it uses a fixed id.
  const ownTenantId = isDemoMode ? LOCAL_TENANT_ID : uid

  // Impersonation is a Super-Admin-only privilege. A normal user's override is ignored.
  const activeTenantId = isSuperAdmin && tenantOverride ? tenantOverride : ownTenantId
  const isImpersonating = isSuperAdmin && tenantOverride != null && tenantOverride !== uid

  // Drop any impersonation when the signed-in identity changes (e.g. logout).
  useEffect(() => {
    setTenantOverride(null)
  }, [uid])

  const setActiveTenant = useCallback((tenantId: string) => {
    if (!isSuperAdmin) return
    setTenantOverride(tenantId)
  }, [isSuperAdmin])

  const resetTenant = useCallback(() => setTenantOverride(null), [])

  // Auto-migrate legacy (pre-multi-tenant) documents to the Super Admin, once per session.
  const migratedRef = useRef(false)
  useEffect(() => {
    if (!firebaseEnabled || !db || !isSuperAdmin || !uid || migratedRef.current) return
    migratedRef.current = true
    migrateLegacyDocs(uid).catch((error) => {
      // Non-fatal: surfacing failures here would only confuse; the tenant filter still works.
      migratedRef.current = false
      console.warn('Legacy tenant migration failed', error)
    })
  }, [isSuperAdmin, uid])

  useEffect(() => {
    if (authLoading) return

    // ---- Offline mode: browser storage only. Starts empty — no demo/seed data. ----
    if (!firebaseEnabled || !db) {
      setAccounts(loadLocal<TikTokAccount[]>(STORAGE_KEYS.accounts, []))
      setVideos(loadLocal<VideoRecord[]>(STORAGE_KEYS.videos, []))
      setSnapshots(loadLocal<DailyFollowerSnapshot[]>(STORAGE_KEYS.snapshots, []))
      setLoading(false)
      return
    }

    // ---- Firebase mode: nothing loads until we know which tenant to scope to. ----
    if (!activeTenantId) {
      setAccounts([])
      setVideos([])
      setSnapshots([])
      setLoading(false)
      return
    }

    setLoading(true)
    // Every query is hard-scoped to the active tenant. Sorting is done client-side
    // so we avoid requiring a composite index for (tenantId + orderBy).
    const accountsQuery = query(collection(db, 'accounts'), where('tenantId', '==', activeTenantId))
    const videosQuery = query(collection(db, 'videos'), where('tenantId', '==', activeTenantId))
    const snapshotsQuery = query(collection(db, 'snapshots'), where('tenantId', '==', activeTenantId))

    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TikTokAccount))
      setLoading(false)
    })
    const unsubVideos = onSnapshot(videosQuery, (snapshot) => {
      setVideos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as VideoRecord).sort(byScheduledDateDesc))
    })
    const unsubSnapshots = onSnapshot(snapshotsQuery, (snapshot) => {
      setSnapshots(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as DailyFollowerSnapshot).sort(byDateAsc))
    })

    return () => {
      unsubAccounts()
      unsubVideos()
      unsubSnapshots()
    }
  }, [authLoading, activeTenantId])

  const syncAccountFollower = useCallback(async (accountId: string, followers: number, source: DailyFollowerSnapshot['source']) => {
    const account = accounts.find((item) => item.id === accountId)
    if (!account || followers < 0) return

    const now = new Date().toISOString()
    const date = now.slice(0, 10)
    const tenantId = activeTenantId ?? account.tenantId

    if (firebaseEnabled && db) {
      await updateDoc(doc(db, 'accounts', accountId), { currentFollowers: followers, updatedAt: now })
      await addDoc(collection(db, 'snapshots'), { tenantId, accountId, date, followers, source, createdAt: now })
      return
    }

    const updatedAccounts = accounts.map((item) =>
      item.id === accountId ? { ...item, currentFollowers: followers, updatedAt: now } : item,
    )
    const newSnapshot: DailyFollowerSnapshot = {
      id: createId(),
      tenantId,
      accountId,
      date,
      followers,
      source,
      createdAt: now,
    }
    const updatedSnapshots = [...snapshots, newSnapshot]
    setAccounts(updatedAccounts)
    setSnapshots(updatedSnapshots)
    saveLocal(STORAGE_KEYS.accounts, updatedAccounts)
    saveLocal(STORAGE_KEYS.snapshots, updatedSnapshots)
  }, [accounts, snapshots, activeTenantId])

  const addAccount = useCallback(async (input: EditableAccount) => {
    if (!activeTenantId) throw new Error('No active tenant — cannot create account.')
    const now = new Date().toISOString()
    const id = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || createId()
    const account: TikTokAccount = { ...input, id, tenantId: activeTenantId, createdAt: now, updatedAt: now }

    if (firebaseEnabled && db) {
      await setDoc(doc(db, 'accounts', id), account)
      return
    }
    const next = [...accounts, account]
    setAccounts(next)
    saveLocal(STORAGE_KEYS.accounts, next)
  }, [accounts, activeTenantId])

  const updateAccount = useCallback(async (id: string, patch: Partial<TikTokAccount>) => {
    const updatedAt = new Date().toISOString()
    // tenantId is deliberately never part of an update — ownership is immutable here.
    if (firebaseEnabled && db) {
      await updateDoc(doc(db, 'accounts', id), { ...patch, updatedAt })
      return
    }
    const next = accounts.map((item) => item.id === id ? { ...item, ...patch, updatedAt } : item)
    setAccounts(next)
    saveLocal(STORAGE_KEYS.accounts, next)
  }, [accounts])

  const addVideo = useCallback(async (input: EditableVideo) => {
    if (!activeTenantId) throw new Error('No active tenant — cannot create video.')
    const now = new Date().toISOString()
    const id = createId()
    const video: VideoRecord = { ...input, id, tenantId: activeTenantId, createdAt: now, updatedAt: now }

    if (firebaseEnabled && db) {
      await setDoc(doc(db, 'videos', id), video)
    } else {
      const next = [video, ...videos]
      setVideos(next)
      saveLocal(STORAGE_KEYS.videos, next)
    }

    if (video.status === 'Uploaded') {
      await syncAccountFollower(video.accountId, video.followersAfter, 'Video upload')
    }
  }, [syncAccountFollower, videos, activeTenantId])

  const updateVideo = useCallback(async (id: string, patch: Partial<VideoRecord>) => {
    const current = videos.find((item) => item.id === id)
    if (!current) return
    const updatedAt = new Date().toISOString()
    const nextVideo = { ...current, ...patch, updatedAt }

    if (firebaseEnabled && db) {
      await updateDoc(doc(db, 'videos', id), { ...patch, updatedAt })
    } else {
      const next = videos.map((item) => item.id === id ? nextVideo : item)
      setVideos(next)
      saveLocal(STORAGE_KEYS.videos, next)
    }

    if (nextVideo.status === 'Uploaded' && (current.status !== 'Uploaded' || patch.followersAfter !== undefined)) {
      await syncAccountFollower(nextVideo.accountId, nextVideo.followersAfter, 'Video upload')
    }
  }, [syncAccountFollower, videos])

  const addSnapshot = useCallback(async (input: EditableSnapshot) => {
    if (!activeTenantId) throw new Error('No active tenant — cannot create snapshot.')
    const snapshot: DailyFollowerSnapshot = { ...input, id: createId(), tenantId: activeTenantId, createdAt: new Date().toISOString() }
    if (firebaseEnabled && db) {
      await addDoc(collection(db, 'snapshots'), { ...input, tenantId: activeTenantId, createdAt: snapshot.createdAt })
      await updateDoc(doc(db, 'accounts', input.accountId), {
        currentFollowers: input.followers,
        updatedAt: new Date().toISOString(),
      })
      return
    }
    const nextSnapshots = [...snapshots, snapshot]
    const nextAccounts = accounts.map((account) =>
      account.id === input.accountId
        ? { ...account, currentFollowers: input.followers, updatedAt: new Date().toISOString() }
        : account,
    )
    setSnapshots(nextSnapshots)
    setAccounts(nextAccounts)
    saveLocal(STORAGE_KEYS.snapshots, nextSnapshots)
    saveLocal(STORAGE_KEYS.accounts, nextAccounts)
  }, [accounts, snapshots, activeTenantId])

  const value = useMemo<DataContextValue>(() => ({
    accounts,
    videos,
    snapshots,
    loading,
    storageMode: firebaseEnabled ? 'Firebase' : 'Browser storage',
    activeTenantId,
    isImpersonating,
    setActiveTenant,
    resetTenant,
    addAccount,
    updateAccount,
    addVideo,
    updateVideo,
    addSnapshot,
  }), [accounts, videos, snapshots, loading, activeTenantId, isImpersonating, setActiveTenant, resetTenant, addAccount, updateAccount, addVideo, updateVideo, addSnapshot])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}
