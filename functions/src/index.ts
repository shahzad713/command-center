/**
 * Cloud Functions — Super Admin server-side operations.
 *
 * These run with the Firebase Admin SDK (full privileges), so EVERY function
 * re-verifies the caller's identity from the trusted auth token. The client
 * never gets to delete another user's Auth account directly; it can only ask
 * this trusted backend to do it, and only if the caller is the Super Admin.
 *
 * Deploy:  firebase deploy --only functions   (requires the Blaze billing plan)
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

// Must match src/constants.ts and firestore.rules. Not a secret.
const SUPER_ADMIN_EMAIL = 'munirshahzad044@gmail.com'

// Firestore collections whose documents carry a tenantId and belong to a tenant.
const TENANT_COLLECTIONS = ['accounts', 'videos', 'snapshots'] as const

const db = getFirestore()
const auth = getAuth()

function normalizeEmail(email: string | undefined | null): string {
  return (email ?? '').trim().toLowerCase()
}

/** Delete every doc in `collection` whose tenantId == tenantId, in batches of 400. */
async function deleteTenantDocs(collection: string, tenantId: string): Promise<number> {
  let deleted = 0
  // Loop until the query returns nothing — each pass grabs up to 400 docs.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db.collection(collection).where('tenantId', '==', tenantId).limit(400).get()
    if (snap.empty) break
    const batch = db.batch()
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    deleted += snap.size
    if (snap.size < 400) break
  }
  return deleted
}

/**
 * deleteTenant — permanently removes a tenant: their Auth account, their
 * users/{uid} directory row, and every accounts/videos/snapshots document they
 * own. Callable only by the Super Admin. Silent by design (no notification is
 * sent to the deleted user).
 *
 * data: { targetUid: string }
 */
export const deleteTenant = onCall(async (request) => {
  const callerEmail = normalizeEmail(request.auth?.token.email as string | undefined)

  // 1. Caller must be authenticated AND the Super Admin.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.')
  }
  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Only the Super Admin may delete tenants.')
  }

  const targetUid = (request.data?.targetUid ?? '').toString().trim()
  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'targetUid is required.')
  }

  // 2. The Super Admin can never be deleted — not self, not by email match.
  if (targetUid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'You cannot delete your own Super Admin account.')
  }
  let targetEmail = ''
  try {
    const targetUser = await auth.getUser(targetUid)
    targetEmail = normalizeEmail(targetUser.email)
  } catch {
    // Auth user may already be gone; still allow Firestore cleanup below.
    targetEmail = ''
  }
  if (targetEmail && targetEmail === SUPER_ADMIN_EMAIL) {
    throw new HttpsError('failed-precondition', 'The Super Admin account is protected and cannot be deleted.')
  }

  // 3. Cascade delete all tenant-owned Firestore documents.
  const counts: Record<string, number> = {}
  for (const collection of TENANT_COLLECTIONS) {
    counts[collection] = await deleteTenantDocs(collection, targetUid)
  }

  // 4. Delete the directory row.
  await db.collection('users').doc(targetUid).delete().catch(() => undefined)

  // 5. Finally delete the Auth account (ignore "user not found").
  try {
    await auth.deleteUser(targetUid)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code !== 'auth/user-not-found') throw error
  }

  return { ok: true, targetUid, deleted: counts }
})
