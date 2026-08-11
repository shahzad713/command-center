import { CalendarDays, CircleDollarSign, Edit3, Globe2, KeyRound, Mail, Plus, Target, UserRound } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { AccountProgress } from '../components/AccountProgress'
import { PageIntro } from '../components/PageIntro'
import { useData } from '../context/DataContext'
import { teamMembers } from '../data/seed'
import { PLATFORM_PRESETS } from '../types'
import type { EditableAccount, MonetizationStatus } from '../types'
import { formatFullNumber, formatNumber, getAccountVideoSummary } from '../utils/analytics'

const monetizationOptions: MonetizationStatus[] = ['Monetized', 'Not Monetized', 'Under Review']

// Split a stored platform string into the select choice + free-text ("Other") parts.
const splitPlatform = (platform: string | undefined): { choice: string; other: string } => {
  const preset = PLATFORM_PRESETS.find((item) => item !== 'Other' && item === platform)
  if (preset) return { choice: preset, other: '' }
  if (platform) return { choice: 'Other', other: platform }
  return { choice: '', other: '' }
}

// Resolve the select choice + free text back into the single platform value we persist.
const resolvePlatform = (choice: string, other: string) => (choice === 'Other' ? other.trim() : choice)

// Today's local date as YYYY-MM-DD for the <input type="date"> default on new accounts.
const todayDate = () => {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

const emptyCreateForm = {
  name: '',
  handle: '',
  email: '',
  niche: '',
  owner: 'Yasir',
  assignedTo: teamMembers[0]?.name ?? '',
  targetCountry: '',
  followers: '0',
  goal: '10000',
  monetizationStatus: 'Not Monetized' as MonetizationStatus,
  dailyTarget: '1',
  platformChoice: 'TikTok',
  platformOther: '',
  twoFactorCode: '',
  // Blank at module load; openCreate() fills today's date so it reflects the day the form opens.
  accountCreationDate: '',
}

export function AccountsPage() {
  const { accounts, videos, addAccount, updateAccount } = useData()

  // Edit modal state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [followers, setFollowers] = useState('')
  const [goal, setGoal] = useState('10000')
  const [assignedTo, setAssignedTo] = useState('Yasir')
  const [monetizationStatus, setMonetizationStatus] = useState<MonetizationStatus>('Not Monetized')
  const [dailyTarget, setDailyTarget] = useState('1')
  const [editPlatformChoice, setEditPlatformChoice] = useState('')
  const [editPlatformOther, setEditPlatformOther] = useState('')
  const [editTwoFactor, setEditTwoFactor] = useState('')
  const [editCreationDate, setEditCreationDate] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState('')

  // Create modal state
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createError, setCreateError] = useState('')

  const summaries = useMemo(() => getAccountVideoSummary(accounts, videos), [accounts, videos])

  const beginEdit = (account: (typeof summaries)[number]) => {
    setEditingId(account.id)
    setFollowers(String(account.currentFollowers))
    setGoal(String(account.followerGoal))
    setAssignedTo(account.assignedTo)
    setMonetizationStatus(account.monetizationStatus)
    setDailyTarget(String(account.dailyUploadTarget))
    const platform = splitPlatform(account.platform)
    setEditPlatformChoice(platform.choice)
    setEditPlatformOther(platform.other)
    setEditTwoFactor(account.twoFactorCode ?? '')
    setEditCreationDate(account.accountCreationDate ?? '')
    setEditEmail(account.email ?? '')
    setEditError('')
  }

  const save = async () => {
    if (!editingId) return
    const platform = resolvePlatform(editPlatformChoice, editPlatformOther)
    if (!platform) {
      setEditError('Platform is required. Choose a platform or type a name for "Other".')
      return
    }
    // twoFactorCode is optional: persist the trimmed value ('' clears it, never undefined for Firestore).
    await updateAccount(editingId, {
      currentFollowers: Number(followers) || 0,
      followerGoal: Number(goal) || 10000,
      assignedTo,
      monetizationStatus,
      dailyUploadTarget: Number(dailyTarget) || 1,
      platform,
      twoFactorCode: editTwoFactor.trim(),
      // Persist the trimmed date ('' clears it, never undefined for Firestore).
      accountCreationDate: editCreationDate.trim(),
      // Persist the trimmed email ('' clears it, never undefined for Firestore).
      email: editEmail.trim(),
    })
    setEditingId(null)
  }

  const updateCreate = (patch: Partial<typeof emptyCreateForm>) => setCreateForm((form) => ({ ...form, ...patch }))

  const openCreate = () => {
    // Default the creation date to today whenever the form opens.
    setCreateForm({ ...emptyCreateForm, accountCreationDate: todayDate() })
    setCreateError('')
    setCreating(true)
  }

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    const platform = resolvePlatform(createForm.platformChoice, createForm.platformOther)
    if (!createForm.name.trim()) {
      setCreateError('Account name is required.')
      return
    }
    if (!platform) {
      setCreateError('Platform is required. Choose a platform or type a name for "Other".')
      return
    }
    const code = createForm.twoFactorCode.trim()
    const email = createForm.email.trim()
    if (!email) {
      setCreateError('Linked email is required.')
      return
    }
    const payload: EditableAccount = {
      name: createForm.name.trim(),
      handle: createForm.handle.trim(),
      niche: createForm.niche.trim(),
      owner: createForm.owner.trim() || 'Yasir',
      assignedTo: createForm.assignedTo,
      targetCountry: createForm.targetCountry.trim(),
      currentFollowers: Number(createForm.followers) || 0,
      followerGoal: Number(createForm.goal) || 10000,
      monetizationStatus: createForm.monetizationStatus,
      dailyUploadTarget: Number(createForm.dailyTarget) || 1,
      platform,
      active: true,
      // Auto-set to today by openCreate; fall back to today if the field was cleared.
      accountCreationDate: createForm.accountCreationDate || todayDate(),
      // Required in the form, so always persisted for new accounts.
      email,
      // Only attach 2FA when provided so Firestore never receives an undefined field.
      ...(code ? { twoFactorCode: code } : {}),
    }
    await addAccount(payload)
    setCreating(false)
    setCreateForm(emptyCreateForm)
  }

  return (
    <div className="page-stack">
      <PageIntro title="TikTok accounts" description="Ownership, niche, monetization, follower target and latest upload performance for all eight channels." />

      <section className="account-progress-grid wide">
        {accounts.map((account) => <AccountProgress key={account.id} account={account} />)}
      </section>

      <section className="panel table-panel">
        <div className="panel-head">
          <div><span className="panel-kicker">MASTER ACCOUNT TABLE</span><h3>Account control</h3></div>
          <button className="button primary" onClick={openCreate}><Plus size={16} />Add account</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Account</th><th>Platform</th><th>Country</th><th>Owner</th><th>Assigned</th><th>Followers</th><th>Goal</th><th>Last views</th><th>Monetization</th><th>Created</th><th /></tr>
            </thead>
            <tbody>
              {summaries.map((account) => (
                <tr key={account.id}>
                  <td><div className="account-cell"><strong>{account.name}</strong><span>{account.handle} · {account.niche}</span></div></td>
                  <td>{account.platform || '—'}</td>
                  <td><span className="icon-text"><Globe2 size={15} />{account.targetCountry}</span></td>
                  <td><span className="icon-text"><UserRound size={15} />{account.owner}</span></td>
                  <td>{account.assignedTo}</td>
                  <td>{formatFullNumber(account.currentFollowers)}</td>
                  <td><span className="icon-text"><Target size={15} />{formatFullNumber(account.followerGoal)}</span></td>
                  <td>{formatNumber(account.lastVideoViews)}</td>
                  <td><span className={`plain-pill ${account.monetizationStatus === 'Monetized' ? 'success' : ''}`}><CircleDollarSign size={14} />{account.monetizationStatus}</span></td>
                  <td>{account.accountCreationDate || '—'}</td>
                  <td><button className="icon-button" onClick={() => beginEdit(account)} aria-label={`Edit ${account.name}`}><Edit3 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingId && (
        <div className="modal-backdrop" onMouseDown={() => setEditingId(null)}>
          <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <span className="panel-kicker">QUICK ACCOUNT UPDATE</span>
            <h3>Update account details</h3>
            <div className="form-grid two">
              <label><span>Platform</span>
                <select value={editPlatformChoice} onChange={(event) => setEditPlatformChoice(event.target.value)} required>
                  <option value="" disabled>Select platform</option>
                  {PLATFORM_PRESETS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              {editPlatformChoice === 'Other' && (
                <label><span>Platform name</span><input value={editPlatformOther} onChange={(event) => setEditPlatformOther(event.target.value)} placeholder="Enter platform name" /></label>
              )}
              <label className="span-two"><span className="icon-text"><Mail size={14} />Linked email</span><input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} placeholder="account@example.com" autoComplete="off" /></label>
              <label><span>Current followers</span><input type="number" value={followers} onChange={(event) => setFollowers(event.target.value)} /></label>
              <label><span>Follower goal</span><input type="number" value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
              <label><span>Assigned team member</span><select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>{teamMembers.map((member) => <option key={member.id}>{member.name}</option>)}</select></label>
              <label><span>Monetization status</span><select value={monetizationStatus} onChange={(event) => setMonetizationStatus(event.target.value as MonetizationStatus)}>{monetizationOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span>Daily upload target</span><input type="number" min="1" value={dailyTarget} onChange={(event) => setDailyTarget(event.target.value)} /></label>
              <label><span>2FA code <em>(optional)</em></span><input value={editTwoFactor} onChange={(event) => setEditTwoFactor(event.target.value)} placeholder="Leave blank if none" autoComplete="off" /></label>
              <label><span className="icon-text"><CalendarDays size={14} />Account creation date</span><input type="date" value={editCreationDate} onChange={(event) => setEditCreationDate(event.target.value)} /></label>
            </div>
            {editError && <p className="form-error">{editError}</p>}
            <div className="modal-actions"><button className="button secondary" onClick={() => setEditingId(null)}>Cancel</button><button className="button primary" onClick={save}>Save account</button></div>
          </div>
        </div>
      )}

      {creating && (
        <div className="modal-backdrop" onMouseDown={() => setCreating(false)}>
          <div className="modal-card wide" onMouseDown={(event) => event.stopPropagation()}>
            <span className="panel-kicker">NEW ACCOUNT</span>
            <h3>Add a social account</h3>
            <form onSubmit={submitCreate}>
              <div className="form-grid two">
                <label><span>Account name</span><input value={createForm.name} onChange={(event) => updateCreate({ name: event.target.value })} placeholder="e.g. Fruit Drama DE" required /></label>
                <label><span>Handle</span><input value={createForm.handle} onChange={(event) => updateCreate({ handle: event.target.value })} placeholder="@handle" /></label>
                <label className="span-two"><span className="icon-text"><Mail size={14} />Linked email</span><input type="email" value={createForm.email} onChange={(event) => updateCreate({ email: event.target.value })} placeholder="account@example.com" autoComplete="off" required /></label>
                <label><span>Platform</span>
                  <select value={createForm.platformChoice} onChange={(event) => updateCreate({ platformChoice: event.target.value })} required>
                    <option value="" disabled>Select platform</option>
                    {PLATFORM_PRESETS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                {createForm.platformChoice === 'Other' && (
                  <label><span>Platform name</span><input value={createForm.platformOther} onChange={(event) => updateCreate({ platformOther: event.target.value })} placeholder="Enter platform name" /></label>
                )}
                <label><span>Niche</span><input value={createForm.niche} onChange={(event) => updateCreate({ niche: event.target.value })} placeholder="Content niche" /></label>
                <label><span>Target country</span><input value={createForm.targetCountry} onChange={(event) => updateCreate({ targetCountry: event.target.value })} placeholder="e.g. United States" /></label>
                <label><span>Owner</span><input value={createForm.owner} onChange={(event) => updateCreate({ owner: event.target.value })} /></label>
                <label><span>Assigned team member</span><select value={createForm.assignedTo} onChange={(event) => updateCreate({ assignedTo: event.target.value })}>{teamMembers.map((member) => <option key={member.id}>{member.name}</option>)}</select></label>
                <label><span>Current followers</span><input type="number" min="0" value={createForm.followers} onChange={(event) => updateCreate({ followers: event.target.value })} /></label>
                <label><span>Follower goal</span><input type="number" min="0" value={createForm.goal} onChange={(event) => updateCreate({ goal: event.target.value })} /></label>
                <label><span>Monetization status</span><select value={createForm.monetizationStatus} onChange={(event) => updateCreate({ monetizationStatus: event.target.value as MonetizationStatus })}>{monetizationOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>Daily upload target</span><input type="number" min="1" value={createForm.dailyTarget} onChange={(event) => updateCreate({ dailyTarget: event.target.value })} /></label>
                <label><span className="icon-text"><KeyRound size={14} />2FA code <em>(optional)</em></span><input value={createForm.twoFactorCode} onChange={(event) => updateCreate({ twoFactorCode: event.target.value })} placeholder="Leave blank if none" autoComplete="off" /></label>
                <label><span className="icon-text"><CalendarDays size={14} />Account creation date</span><input type="date" value={createForm.accountCreationDate} onChange={(event) => updateCreate({ accountCreationDate: event.target.value })} /></label>
              </div>
              {createError && <p className="form-error">{createError}</p>}
              <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setCreating(false)}>Cancel</button><button type="submit" className="button primary"><Plus size={16} />Create account</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
