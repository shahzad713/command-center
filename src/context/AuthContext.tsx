import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSuperAdminEmail, type UserRole } from '../constants'
import { auth, db, firebaseEnabled } from '../services/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isDemoMode: boolean
  // Firebase Auth uid of the signed-in user, or null. This is the tenant id used
  // for every data read/write of a normal user.
  uid: string | null
  // The signed-in user's platform role, resolved from their users/{uid} doc.
  role: UserRole
  // True only when the signed-in user is a platform Super Admin (root email or role).
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Create/refresh the caller's own users/{uid} document and return their role. Rules
// allow a user to write their own doc as long as tenantId === their uid, so this is
// safe to run on every sign-in. It powers the Super Admin tenant directory.
// The root admin is always stamped super_admin; other users keep their stored role
// and never have it altered here (self-provision cannot escalate — see firestore.rules).
async function provisionUserDoc(user: User): Promise<UserRole> {
  const isRoot = isSuperAdminEmail(user.email)
  if (!firebaseEnabled || !db) return isRoot ? 'super_admin' : 'user'
  try {
    const ref = doc(db, 'users', user.uid)
    const existing = await getDoc(ref)
    const storedRole = (existing.data()?.role as UserRole | undefined) ?? 'user'
    const role: UserRole = isRoot ? 'super_admin' : storedRole
    await setDoc(
      ref,
      {
        tenantId: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        lastLoginAt: serverTimestamp(),
        // Only stamp createdAt on first provision; keep the original afterwards.
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        // Root is always super_admin. For everyone else only set role on first
        // create (default user); never overwrite an admin-assigned role on later logins.
        ...(isRoot ? { role: 'super_admin' } : existing.exists() ? {} : { role: 'user' }),
      },
      { merge: true },
    )
    return role
  } catch (error) {
    // Non-fatal: the app still works without the directory row. Log for diagnostics.
    console.warn('Could not provision user document', error)
    return isRoot ? 'super_admin' : 'user'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>('user')
  const [loading, setLoading] = useState(firebaseEnabled)

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        // Keep loading until the role resolves so route guards don't flip a
        // non-root super admin to the home page before their role is known.
        void provisionUserDoc(nextUser).then((resolved) => {
          setRole(resolved)
          setLoading(false)
        })
      } else {
        setRole('user')
        setLoading(false)
      }
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    isAuthenticated: !firebaseEnabled || Boolean(user),
    isDemoMode: !firebaseEnabled,
    uid: user?.uid ?? null,
    role,
    isSuperAdmin: isSuperAdminEmail(user?.email) || role === 'super_admin',
    login: async (email, password) => {
      if (!auth) return
      await signInWithEmailAndPassword(auth, email, password)
    },
    logout: async () => {
      if (!auth) return
      await signOut(auth)
    },
  }), [loading, user, role])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
