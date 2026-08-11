// Single source of truth for the platform-wide Super Admin identity.
//
// SECURITY NOTE: This email is NOT a secret. The real enforcement lives in
// `firestore.rules` (isSuperAdmin) and the `deleteTenant` Cloud Function, both of
// which independently re-check the caller's verified auth token. This client-side
// constant only controls what the UI *shows*; it grants no data access on its own.
//
// If you change this value you MUST change it in ALL THREE places to stay in sync:
//   1. src/constants.ts        (this file — UI gating)
//   2. firestore.rules         (isSuperAdmin())
//   3. functions/src/index.ts  (SUPER_ADMIN_EMAIL)
//
// An optional env override lets you point a staging build at a different admin
// without editing code. Falls back to the production owner address.
export const SUPER_ADMIN_EMAIL =
  (import.meta.env.VITE_SUPER_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ||
  'munirshahzad044@gmail.com'

export const isSuperAdminEmail = (email: string | null | undefined): boolean =>
  Boolean(email) && email!.trim().toLowerCase() === SUPER_ADMIN_EMAIL
