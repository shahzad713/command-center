import { collection, deleteDoc, doc, getDoc, getDocs, query, where, writeBatch, type Timestamp } from 'firebase/firestore'
import { isSuperAdminEmail } from '../constants'
import { db, firebaseEnabled } from './firebase'

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

// Collections that hold per-tenant data, all scoped by a `tenantId` field.
const TENANT_COLLECTIONS = ['accounts', 'videos', 'snapshots'] as const
// Firestore caps a batch at 500 writes; stay well under.
const BATCH_LIMIT = 400

// Delete every document in `collectionName` owned by `targetUid`, in batches.
async function deleteTenantDocs(collectionName: string, targetUid: string): Promise<number> {
  if (!db) return 0
  const scoped = query(collection(db, collectionName), where('tenantId', '==', targetUid))
  const snap = await getDocs(scoped)
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((docSnap) => batch.delete(docSnap.ref))
    await batch.commit()
  }
  return snap.size
}

/**
 * Permanently delete a tenant's Firestore data (accounts, videos, snapshots) and
 * their directory row, directly via the client SDK. Allowed because firestore.rules
 * grant the Super Admin full write/delete access; a non-admin caller is rejected by
 * those rules server-side.
 *
 * LIMITATION: the client SDK cannot delete another user's Firebase Auth login — that
 * requires the Admin SDK (the `deleteTenant` Cloud Function, which needs the Blaze
 * plan). Until that is deployed, a deleted tenant can still sign in again and will be
 * re-provisioned with an empty workspace. This function only removes their data.
 */
export async function deleteTenant(targetUid: string): Promise<DeleteTenantResult> {
  if (!firebaseEnabled || !db) throw new Error('Firebase is not configured.')

  // Never allow the Super Admin account to be deleted, regardless of caller.
  const userRef = doc(db, 'users', targetUid)
  const userSnap = await getDoc(userRef)
  if (userSnap.exists() && isSuperAdminEmail(userSnap.data().email as string | undefined)) {
    throw new Error('The Super Admin account cannot be deleted.')
  }

  const deleted: Record<string, number> = {}
  for (const collectionName of TENANT_COLLECTIONS) {
    deleted[collectionName] = await deleteTenantDocs(collectionName, targetUid)
  }

  // Finally remove the directory row itself.
  if (userSnap.exists()) {
    await deleteDoc(userRef)
    deleted.users = 1
  } else {
    deleted.users = 0
  }

  return { ok: true, targetUid, deleted }
}
