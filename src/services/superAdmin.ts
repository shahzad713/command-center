import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Timestamp } from 'firebase/firestore'
import { DEFAULT_ROLE, isSuperAdminEmail, type UserRole } from '../constants'
import { db, firebaseConfig, firebaseEnabled } from './firebase'

export interface TenantRow {
  uid: string
  email: string
  displayName?: string
  role: UserRole
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
        role: (data.role as UserRole) ?? DEFAULT_ROLE,
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

  // Never allow the root Super Admin account to be deleted, regardless of caller.
  // Other super admins CAN be removed — only the permanent root is protected.
  const userRef = doc(db, 'users', targetUid)
  const userSnap = await getDoc(userRef)
  if (userSnap.exists() && isSuperAdminEmail(userSnap.data().email as string | undefined)) {
    throw new Error('The root Super Admin account cannot be deleted.')
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

/**
 * Create a brand-new login + directory row and assign it a role. Only a super admin
 * may call this (enforced by firestore.rules on the users write).
 *
 * The auth account is created on an ISOLATED secondary Firebase app so that
 * createUserWithEmailAndPassword does not replace the current admin's session on the
 * primary app. Works on the Spark plan — no Cloud Function / Admin SDK required.
 * The root email always resolves to super_admin regardless of the requested role.
 */
export async function createUser(email: string, password: string, role: UserRole): Promise<TenantRow> {
  if (!firebaseEnabled || !db) throw new Error('Firebase is not configured.')
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) throw new Error('Email is required.')
  if (password.length < 6) throw new Error('Password must be at least 6 characters.')

  // Isolated app instance keeps the new sign-in off the primary auth session.
  const secondaryApp = initializeApp(firebaseConfig, `user-provision-${crypto.randomUUID()}`)
  let newUid: string
  try {
    const secondaryAuth = getAuth(secondaryApp)
    const credential = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password)
    newUid = credential.user.uid
    await signOut(secondaryAuth)
  } finally {
    await deleteApp(secondaryApp)
  }

  const finalRole: UserRole = isSuperAdminEmail(cleanEmail) ? 'super_admin' : role
  await setDoc(doc(db, 'users', newUid), {
    tenantId: newUid,
    email: cleanEmail,
    displayName: '',
    role: finalRole,
    createdAt: serverTimestamp(),
    lastLoginAt: null,
  })

  return { uid: newUid, email: cleanEmail, role: finalRole, createdAt: '—', lastLoginAt: '—' }
}

/**
 * Promote or demote an existing tenant. The root Super Admin can never be demoted.
 * Enforced client-side here for a clear error, and server-side by firestore.rules.
 */
export async function setUserRole(targetUid: string, role: UserRole): Promise<void> {
  if (!firebaseEnabled || !db) throw new Error('Firebase is not configured.')
  const ref = doc(db, 'users', targetUid)
  const snap = await getDoc(ref)
  if (snap.exists() && isSuperAdminEmail(snap.data().email as string | undefined) && role !== 'super_admin') {
    throw new Error('The root Super Admin role cannot be changed.')
  }
  await updateDoc(ref, { role })
}
