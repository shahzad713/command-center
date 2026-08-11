import { AlertTriangle, Eye, RefreshCcw, ShieldAlert, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageIntro } from '../components/PageIntro'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { deleteTenant, listTenants, type TenantRow } from '../services/superAdmin'

export function SuperAdminPage() {
  const { uid } = useAuth()
  const { setActiveTenant } = useData()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyUid, setBusyUid] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTenants(await listTenants())
    } catch {
      setError('Could not load the tenant directory. Confirm you are signed in as the Super Admin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const impersonate = (targetUid: string) => {
    setActiveTenant(targetUid)
    navigate('/')
  }

  const removeTenant = async (row: TenantRow) => {
    // Irreversible: warn explicitly and require confirmation before the cascade delete.
    const confirmed = window.confirm(
      `Permanently delete tenant "${row.email || row.uid}"?\n\n` +
        'This deletes their login AND every account, video and follower snapshot they own. ' +
        'This action cannot be undone.',
    )
    if (!confirmed) return

    setBusyUid(row.uid)
    setError('')
    try {
      await deleteTenant(row.uid)
      // Silent by design: no success notification, just refresh the directory.
      setTenants((prev) => prev.filter((item) => item.uid !== row.uid))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.'
      setError(`Delete failed: ${message}. Ensure the deleteTenant Cloud Function is deployed.`)
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Super Admin control"
        description="Platform-wide tenant administration. Every action here is re-verified server-side by Firestore rules and the deleteTenant function."
        action={<span className="superadmin-badge"><ShieldAlert size={13} /> SUPER ADMIN</span>}
      />

      <div className="admin-warn">
        <AlertTriangle size={18} />
        <span>
          Deleting a tenant is permanent and silent — it removes their Firebase Auth account and all of their
          Firestore data (accounts, videos, snapshots). The Super Admin account is protected and cannot be deleted.
        </span>
      </div>

      {error && <div className="form-error">{error}</div>}

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <span className="panel-kicker">TENANT DIRECTORY</span>
            <h3>{loading ? 'Loading…' : `${tenants.length} registered ${tenants.length === 1 ? 'tenant' : 'tenants'}`}</h3>
          </div>
          <button className="button ghost tiny" onClick={() => void load()} disabled={loading}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        <div className="table-scroll">
          <table className="tenant-table">
            <thead>
              <tr><th>Tenant</th><th>UID</th><th>Created</th><th>Last login</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {!loading && tenants.length === 0 && (
                <tr><td colSpan={5}><p className="empty-copy">No tenants registered yet.</p></td></tr>
              )}
              {tenants.map((row) => {
                const isSelf = row.uid === uid
                return (
                  <tr key={row.uid}>
                    <td>
                      <div className="account-cell">
                        <span className="tenant-email">{row.email || '(no email)'}</span>
                        {isSelf && <span className="you-pill">You · Super Admin</span>}
                      </div>
                    </td>
                    <td><span className="tenant-uid">{row.uid}</span></td>
                    <td>{row.createdAt}</td>
                    <td>{row.lastLoginAt}</td>
                    <td>
                      <div className="row-actions">
                        <button className="button ghost tiny" onClick={() => impersonate(row.uid)} title="View this tenant's dashboard">
                          <Eye size={14} /> View
                        </button>
                        <button
                          className="button danger tiny"
                          onClick={() => void removeTenant(row)}
                          disabled={isSelf || busyUid === row.uid}
                          title={isSelf ? 'The Super Admin cannot be deleted' : 'Permanently delete this tenant'}
                        >
                          <Trash2 size={14} /> {busyUid === row.uid ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="admin-note">
        <Users size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Use <strong>View</strong> to inspect any tenant's dashboard read-only. A banner at the top lets you exit
        impersonation and return to your own workspace.
      </p>
    </div>
  )
}
