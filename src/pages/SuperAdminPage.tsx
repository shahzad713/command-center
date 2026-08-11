import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Eye, RefreshCcw, ShieldAlert, Trash2, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageIntro } from '../components/PageIntro'
import { isSuperAdminEmail, ROLE_LABELS, type UserRole } from '../constants'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { createUser, deleteTenant, listTenants, setUserRole, type TenantRow } from '../services/superAdmin'

const emptyCreateForm = { email: '', password: '', role: 'user' as UserRole }

export function SuperAdminPage() {
  const { uid } = useAuth()
  const { setActiveTenant } = useData()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyUid, setBusyUid] = useState<string | null>(null)

  // Add-user modal
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createError, setCreateError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    setCreateError('')
    setSubmitting(true)
    try {
      const row = await createUser(createForm.email, createForm.password, createForm.role)
      setTenants((prev) => [...prev.filter((item) => item.uid !== row.uid), row].sort((a, b) => a.email.localeCompare(b.email)))
      setCreating(false)
      setCreateForm(emptyCreateForm)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create the user.'
      setCreateError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const changeRole = async (row: TenantRow, role: UserRole) => {
    setBusyUid(row.uid)
    setError('')
    try {
      await setUserRole(row.uid, role)
      setTenants((prev) => prev.map((item) => item.uid === row.uid ? { ...item, role } : item))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not change the role.'
      setError(message)
    } finally {
      setBusyUid(null)
    }
  }

  const removeTenant = async (row: TenantRow) => {
    // Irreversible: warn explicitly and require confirmation before the cascade delete.
    const confirmed = window.confirm(
      `Permanently delete all data for tenant "${row.email || row.uid}"?\n\n` +
        'This deletes every account, video and follower snapshot they own, and their directory entry. ' +
        'Their login is not removed (that needs the Cloud Function), so they could sign in again with an empty workspace. ' +
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
      setError(`Delete failed: ${message}. Confirm you are signed in as the Super Admin.`)
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Super Admin control"
        description="Platform-wide tenant administration. Every action here is re-verified server-side by Firestore rules."
        action={<span className="superadmin-badge"><ShieldAlert size={13} /> SUPER ADMIN</span>}
      />

      <div className="admin-warn">
        <AlertTriangle size={18} />
        <span>
          You can add users, assign roles, and promote or remove other super admins. The root Super Admin
          (<strong>munirshahzad044@gmail.com</strong>) is permanent — it cannot be demoted or deleted. Deleting a tenant
          is permanent: it removes all of their Firestore data and directory entry (their Firebase Auth login is not
          removed by this action).
        </span>
      </div>

      {error && <div className="form-error">{error}</div>}

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <span className="panel-kicker">TENANT DIRECTORY</span>
            <h3>{loading ? 'Loading…' : `${tenants.length} registered ${tenants.length === 1 ? 'tenant' : 'tenants'}`}</h3>
          </div>
          <div className="row-actions">
            <button className="button primary tiny" onClick={() => { setCreateForm(emptyCreateForm); setCreateError(''); setCreating(true) }}>
              <UserPlus size={14} /> Add user
            </button>
            <button className="button ghost tiny" onClick={() => void load()} disabled={loading}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="tenant-table">
            <thead>
              <tr><th>Tenant</th><th>Role</th><th>UID</th><th>Created</th><th>Last login</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {!loading && tenants.length === 0 && (
                <tr><td colSpan={6}><p className="empty-copy">No tenants registered yet.</p></td></tr>
              )}
              {tenants.map((row) => {
                const isSelf = row.uid === uid
                const isRoot = isSuperAdminEmail(row.email)
                const busy = busyUid === row.uid
                return (
                  <tr key={row.uid}>
                    <td>
                      <div className="account-cell">
                        <span className="tenant-email">{row.email || '(no email)'}</span>
                        {isSelf && <span className="you-pill">You</span>}
                      </div>
                    </td>
                    <td><span className={`badge ${row.role === 'super_admin' ? 'active' : ''}`}>{ROLE_LABELS[row.role]}</span></td>
                    <td><span className="tenant-uid">{row.uid}</span></td>
                    <td>{row.createdAt}</td>
                    <td>{row.lastLoginAt}</td>
                    <td>
                      <div className="row-actions">
                        <button className="button ghost tiny" onClick={() => impersonate(row.uid)} title="View this tenant's dashboard">
                          <Eye size={14} /> View
                        </button>
                        {row.role === 'super_admin' ? (
                          <button
                            className="button ghost tiny"
                            onClick={() => void changeRole(row, 'user')}
                            disabled={isRoot || isSelf || busy}
                            title={isRoot ? 'The root Super Admin cannot be demoted' : isSelf ? 'You cannot demote yourself' : 'Demote to User'}
                          >
                            <ArrowDownCircle size={14} /> Demote
                          </button>
                        ) : (
                          <button
                            className="button ghost tiny"
                            onClick={() => void changeRole(row, 'super_admin')}
                            disabled={busy}
                            title="Promote to Super Admin"
                          >
                            <ArrowUpCircle size={14} /> Make admin
                          </button>
                        )}
                        <button
                          className="button danger tiny"
                          onClick={() => void removeTenant(row)}
                          disabled={isRoot || isSelf || busy}
                          title={isRoot ? 'The root Super Admin cannot be deleted' : isSelf ? 'You cannot delete yourself' : 'Permanently delete this tenant'}
                        >
                          <Trash2 size={14} /> {busy ? 'Working…' : 'Delete'}
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
        Use <strong>View</strong> to inspect any tenant's dashboard. <strong>Make admin</strong> / <strong>Demote</strong>
        change a tenant's role; new logins are created with <strong>Add user</strong>.
      </p>

      {creating && (
        <div className="modal-backdrop" onMouseDown={() => !submitting && setCreating(false)}>
          <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <span className="panel-kicker">NEW USER</span>
            <h3>Add a user</h3>
            <form onSubmit={submitCreate}>
              <div className="form-grid">
                <label><span>Email</span><input type="email" value={createForm.email} onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} placeholder="person@example.com" autoComplete="off" required /></label>
                <label><span>Temporary password</span><input type="text" value={createForm.password} onChange={(event) => setCreateForm((form) => ({ ...form, password: event.target.value }))} placeholder="At least 6 characters" autoComplete="off" required /></label>
                <label><span>Role</span>
                  <select value={createForm.role} onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value as UserRole }))}>
                    <option value="user">User</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </label>
              </div>
              {createError && <p className="form-error">{createError}</p>}
              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setCreating(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="button primary" disabled={submitting}><UserPlus size={16} />{submitting ? 'Creating…' : 'Create user'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
