import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  if (isAuthenticated) return <Navigate to={from} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setError('Login failed. Check the Firebase admin email and password.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark large">TC</div>
        <span className="panel-kicker">PRIVATE ADMIN AREA</span>
        <h1>Sign in to update operations</h1>
        <p>Your dashboards, account data and daily updates stay protected for your team.</p>
        <form onSubmit={submit}>
          <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="button primary wide" type="submit"><LockKeyhole size={17} />Sign in</button>
        </form>
      </div>
    </div>
  )
}
