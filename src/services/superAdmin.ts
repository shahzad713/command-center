import { collection, getDocs, type Timestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db, firebaseEnabled } from './firebase'

export interface TenantRow {
  uid: string
  email: string
  displayName?: string
  disabled?: boolean
  createdAt: string
  lastLoginAt: string
}

// Firestore serverTimestamp() comes back as a Timestamp; normalise to an ISO date string.
function toDateString(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString().slice(0, 10)
  }
  if (typeof value === 'string' && value) return value.slice(0, 10)
  return '—'
}

/** Read the full tenant directory. Firestore rules only allow this for the Super Admin. */
export async function listTenants(): Promise<TenantRow[]> {
  if (!firebaseEnabled || !db) return []
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map((doc) => {
      const data = doc.data()
      return {
        uid: doc.id,
        email: (data.email as string) ?? '',
        displayName: (data.displayName as string) || undefined,
        disabled: Boolean(data.disabled),
        createdAt: toDateString(data.createdAt),
        lastLoginAt: toDateString(data.lastLoginAt),
      }
    })
    .sort((a, b) => a.email.localeCompare(b.email))
}

export interface DeleteTenantResult {
  ok: boolean
  targetUid: string
  deleted: Record<string, number>
}

/**
 * Ask the trusted backend to permanently delete a tenant (Auth account + all
 * Firestore data). Throws if the caller is not the Super Admin (enforced server-side).
 */
export async function deleteTenant(targetUid: string): Promise<DeleteTenantResult> {
  if (!firebaseEnabled || !app) throw new Error('Firebase is not configured.')
  const functions = getFunctions(app)
  const callable = httpsCallable<{ targetUid: string }, DeleteTenantResult>(functions, 'deleteTenant')
  const response = await callable({ targetUid })
  return response.data
}
