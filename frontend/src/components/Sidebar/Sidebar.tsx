import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { disconnectWs } from '@/socket/socket'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { path: '/chats/external', icon: '💬', label: 'Клиенты' },
  { path: '/chats/internal', icon: '👥', label: 'Команда' },
  { path: '/chats/archive', icon: '🗂', label: 'Архив' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  function handleLogout() {
    disconnectWs()
    clearAuth()
    navigate('/login')
  }

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>FC</div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`${styles.navItem} ${pathname.startsWith(item.path) ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.bottomSection}>
        <div className={styles.divider} />
        <div className={styles.avatarBtn} title={user?.name}>{initials}</div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Выйти">
          <span className={styles.logoutIcon}>🚪</span>
          Выйти
        </button>
      </div>
    </aside>
  )
}
