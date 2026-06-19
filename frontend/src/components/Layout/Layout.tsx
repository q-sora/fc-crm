import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar/Sidebar'
import { connectWs } from '@/socket/socket'
import { useWsEvents } from '@/socket/useWsEvents'
import { useAuthStore } from '@/store/authStore'
import { getMe } from '@/api/auth'
import styles from './Layout.module.css'

export default function Layout() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)

  // Load current user if we have a token but no user (page refresh)
  useEffect(() => {
    if (token && !user) {
      getMe().then((u) => setAuth(token, u)).catch(() => {})
    }
  }, [token, user, setAuth])

  // Connect WebSocket
  useEffect(() => {
    if (token) connectWs(token)
  }, [token])

  // Subscribe to WS events and update store
  useWsEvents()

  return (
    <div className={styles.root}>
      <Sidebar />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
