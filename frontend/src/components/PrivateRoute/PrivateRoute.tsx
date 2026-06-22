import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getMe } from '@/api/auth'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function PrivateRoute({ children }: Props) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [loading, setLoading] = useState(!user && !!token)

  useEffect(() => {
    if (!token || user) return
    getMe()
      .then((me) => setAuth(token, me))
      .catch(() => clearAuth())
      .finally(() => setLoading(false))
  }, [token, user, setAuth, clearAuth])

  if (!token) return <Navigate to="/login" replace />
  if (loading) return null

  return <>{children}</>
}
