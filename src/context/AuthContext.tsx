import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSuperAdminEmail } from '../constants'
import { auth, db, firebaseEnabled } from '../services/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isDemoMode: boolean
  // Firebase Auth uid of the signed-in user, or null. This is the tenant id used
  // for every data read/write of a normal user.
  uid: string | null
  // True only when the signed-in user is the platform Super Admin.
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Create/refresh the caller's own users/{uid} document. Rules allow a user to
// write their own doc as long as tenantId === their uid, so this is safe to run
// on every sign-in. It powers the Super Admin tenant directory.
async function provisionUserDoc(user: User) {
  if (!firebaseEnabled || !db) return
  try {
    const ref = doc(db, 'users', user.uid)
    const existing = await getDoc(ref)
    await setDoc(
      ref,
      {
        tenantId: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        lastLoginAt: serverTimestamp(),
        // Only stamp createdAt on first provision; keep the original afterwards.
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    )
  } catch (error) {
    // Non-fatal: the app still works without the directory row. Log for diagnostics.
    console.warn('Could not provision user document', error)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseEnabled)

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
      if (nextUser) void provisionUserDoc(nextUser)
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    isAuthenticated: !firebaseEnabled || Boolean(user),
    isDemoMode: !firebaseEnabled,
    uid: user?.uid ?? null,
    isSuperAdmin: isSuperAdminEmail(user?.email),
    login: async (email, password) => {
      if (!auth) return
      await signInWithEmailAndPassword(auth, email, password)
    },
    logout: async () => {
      if (!auth) return
      await signOut(auth)
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
