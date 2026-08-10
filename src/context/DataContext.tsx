import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { seedAccounts, seedSnapshots, seedVideos } from '../data/seed'
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
  storageMode: 'Firebase' | 'Demo browser storage'
  addAccount: (account: EditableAccount) => Promise<void>
  updateAccount: (id: string, patch: Partial<TikTokAccount>) => Promise<void>
  addVideo: (video: EditableVideo) => Promise<void>
  updateVideo: (id: string, patch: Partial<VideoRecord>) => Promise<void>
  addSnapshot: (snapshot: EditableSnapshot) => Promise<void>
  seedDemoData: () => Promise<void>
  resetDemoData: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

const STORAGE_KEYS = {
  accounts: 'tcc_accounts_v1',
  videos: 'tcc_videos_v1',
  snapshots: 'tcc_snapshots_v1',
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

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [accounts, setAccounts] = useState<TikTokAccount[]>([])
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [snapshots, setSnapshots] = useState<DailyFollowerSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!firebaseEnabled || !db) {
      const localAccounts = loadLocal(STORAGE_KEYS.accounts, seedAccounts)
      const localVideos = loadLocal(STORAGE_KEYS.videos, seedVideos)
      const localSnapshots = loadLocal(STORAGE_KEYS.snapshots, seedSnapshots)
      setAccounts(localAccounts)
      setVideos(localVideos)
      setSnapshots(localSnapshots)
      saveLocal(STORAGE_KEYS.accounts, localAccounts)
      saveLocal(STORAGE_KEYS.videos, localVideos)
      saveLocal(STORAGE_KEYS.snapshots, localSnapshots)
      setLoading(false)
      return
    }

    if (!isAuthenticated) {
      setAccounts([])
      setVideos([])
      setSnapshots([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
      setAccounts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TikTokAccount))
      setLoading(false)
    })
    const unsubVideos = onSnapshot(query(collection(db, 'videos'), orderBy('scheduledDate', 'desc')), (snapshot) => {
      setVideos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as VideoRecord))
    })
    const unsubSnapshots = onSnapshot(query(collection(db, 'snapshots'), orderBy('date', 'asc')), (snapshot) => {
      setSnapshots(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as DailyFollowerSnapshot))
    })

    return () => {
      unsubAccounts()
      unsubVideos()
      unsubSnapshots()
    }
  }, [authLoading, isAuthenticated])

  const syncAccountFollower = useCallback(async (accountId: string, followers: number, source: DailyFollowerSnapshot['source']) => {
    const account = accounts.find((item) => item.id === accountId)
    if (!account || followers < 0) return

    const now = new Date().toISOString()
    const date = now.slice(0, 10)

    if (firebaseEnabled && db) {
      await updateDoc(doc(db, 'accounts', accountId), { currentFollowers: followers, updatedAt: now })
      await addDoc(collection(db, 'snapshots'), { accountId, date, followers, source, createdAt: now })
      return
    }

    const updatedAccounts = accounts.map((item) =>
      item.id === accountId ? { ...item, currentFollowers: followers, updatedAt: now } : item,
    )
    const newSnapshot: DailyFollowerSnapshot = {
      id: createId(),
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
  }, [accounts, snapshots])

  const addAccount = useCallback(async (input: EditableAccount) => {
    const now = new Date().toISOString()
    const id = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || createId()
    const account: TikTokAccount = { ...input, id, createdAt: now, updatedAt: now }

    if (firebaseEnabled && db) {
      await setDoc(doc(db, 'accounts', id), account)
      return
    }
    const next = [...accounts, account]
    setAccounts(next)
    saveLocal(STORAGE_KEYS.accounts, next)
  }, [accounts])

  const updateAccount = useCallback(async (id: string, patch: Partial<TikTokAccount>) => {
    const updatedAt = new Date().toISOString()
    if (firebaseEnabled && db) {
      await updateDoc(doc(db, 'accounts', id), { ...patch, updatedAt })
      return
    }
    const next = accounts.map((item) => item.id === id ? { ...item, ...patch, updatedAt } : item)
    setAccounts(next)
    saveLocal(STORAGE_KEYS.accounts, next)
  }, [accounts])

  const addVideo = useCallback(async (input: EditableVideo) => {
    const now = new Date().toISOString()
    const id = createId()
    const video: VideoRecord = { ...input, id, createdAt: now, updatedAt: now }

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
  }, [syncAccountFollower, videos])

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
    const snapshot: DailyFollowerSnapshot = { ...input, id: createId(), createdAt: new Date().toISOString() }
    if (firebaseEnabled && db) {
      await addDoc(collection(db, 'snapshots'), snapshot)
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
  }, [accounts, snapshots])

  const seedDemoData = useCallback(async () => {
    if (!firebaseEnabled || !db) return
    const batch = writeBatch(db)
    seedAccounts.forEach((item) => batch.set(doc(db!, 'accounts', item.id), item))
    seedVideos.forEach((item) => batch.set(doc(db!, 'videos', item.id), item))
    seedSnapshots.forEach((item) => batch.set(doc(db!, 'snapshots', item.id), item))
    await batch.commit()
  }, [])

  const resetDemoData = useCallback(() => {
    if (firebaseEnabled) return
    setAccounts(seedAccounts)
    setVideos(seedVideos)
    setSnapshots(seedSnapshots)
    saveLocal(STORAGE_KEYS.accounts, seedAccounts)
    saveLocal(STORAGE_KEYS.videos, seedVideos)
    saveLocal(STORAGE_KEYS.snapshots, seedSnapshots)
  }, [])

  const value = useMemo<DataContextValue>(() => ({
    accounts,
    videos,
    snapshots,
    loading,
    storageMode: firebaseEnabled ? 'Firebase' : 'Demo browser storage',
    addAccount,
    updateAccount,
    addVideo,
    updateVideo,
    addSnapshot,
    seedDemoData,
    resetDemoData,
  }), [accounts, videos, snapshots, loading, addAccount, updateAccount, addVideo, updateVideo, addSnapshot, seedDemoData, resetDemoData])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}
