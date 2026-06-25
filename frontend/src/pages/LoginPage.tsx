import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/i18n'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { accessToken } = await login({ email, password })
      localStorage.setItem('token', accessToken)
      const user = await getMe()
      setAuth(accessToken, user)
      navigate('/chats/external')
    } catch {
      setError(t.login_error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoText}>FC CRM</div>
          <div className={styles.logoSub}>{t.login_subtitle}</div>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@fc-crm.local"
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t.login_password}</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t.login_loading : t.login_submit}
          </button>
        </form>
      </div>
    </div>
  )
}
