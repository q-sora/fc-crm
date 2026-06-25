import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useLangStore } from '@/store/langStore'
import { useT } from '@/i18n'
import { disconnectWs } from '@/socket/socket'
import IconChats from '@/components/icons/IconChats'
import IconTeam from '@/components/icons/IconTeam'
import IconArchive from '@/components/icons/IconArchive'
import IconAdmin from '@/components/icons/IconAdmin'
import IconLogout from '@/components/icons/IconLogout'
import IconUser from '@/components/icons/IconUser'
import IconLogo from '@/components/icons/IconLogo'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const isAdmin = user?.role === 'admin'
  const lang = useLangStore((s) => s.lang)
  const toggleLang = useLangStore((s) => s.toggleLang)
  const t = useT()

  const unreadExternal = useChatStore((s) => s.unreadExternal)
  const unreadInternal = useChatStore((s) => s.unreadInternal)

  const totalExternal = Object.values(unreadExternal).reduce((a, b) => a + b, 0)
  const totalInternal = Object.values(unreadInternal).reduce((a, b) => a + b, 0)

  function handleLogout() {
    disconnectWs()
    clearAuth()
    navigate('/login')
  }

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || null

  const NAV_ITEMS = [
    { path: '/chats/external', icon: <IconChats />, label: t.nav_clients, badge: totalExternal },
    { path: '/chats/internal', icon: <IconTeam />, label: t.nav_team, badge: totalInternal },
    { path: '/chats/archive', icon: <IconArchive />, label: t.nav_archive, badge: 0 },
  ]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}><IconLogo size={50} /></div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`${styles.navItem} ${pathname.startsWith(item.path) ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <span className={styles.navIconWrap}>
              <span className={styles.navIcon}>{item.icon}</span>
              {item.badge > 0 && (
                <span className={styles.navBadge}>{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </span>
            {item.label}
          </button>
        ))}
        {isAdmin && (
          <button
            className={`${styles.navItem} ${pathname.startsWith('/admin') ? styles.active : ''}`}
            onClick={() => navigate('/admin')}
            title={t.nav_admin}
          >
            <span className={styles.navIconWrap}>
              <span className={styles.navIcon}><IconAdmin /></span>
            </span>
            {t.nav_admin}
          </button>
        )}
      </nav>

      <div className={styles.bottomSection}>
        <div className={styles.divider} />
        <div className={styles.avatarBtn} title={user?.name}>
          {initials ?? <IconUser size={20} />}
        </div>
        <div className={styles.langToggle}>
          <button
            className={`${styles.langOpt} ${lang === 'ru' ? styles.langOptActive : ''}`}
            onClick={() => lang !== 'ru' && toggleLang()}
          >RU</button>
          <button
            className={`${styles.langOpt} ${lang === 'kz' ? styles.langOptActive : ''}`}
            onClick={() => lang !== 'kz' && toggleLang()}
          >KZ</button>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title={t.nav_logout}>
          <span className={styles.logoutIcon}><IconLogout /></span>
          {t.nav_logout}
        </button>
      </div>
    </aside>
  )
}
