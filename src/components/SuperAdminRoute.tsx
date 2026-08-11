import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

/**
 * Gate for /super-admin. Only the Super Admin may enter; everyone else is sent home.
 * This is UI gating only — real protection is enforced by Firestore rules and the
 * deleteTenant Cloud Function, both of which re-check the auth token server-side.
 */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { isSuperAdmin, loading } = useAuth()

  if (loading) return <div className="loading-panel">Checking access…</div>
  if (!isSuperAdmin) return <Navigate to="/" replace />
  return children
}
