import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/PrivateRoute/PrivateRoute'
import Layout from '@/components/Layout/Layout'
import LoginPage from '@/pages/LoginPage'
import ExternalChatsPage from '@/pages/ExternalChatsPage'
import InternalChatsPage from '@/pages/InternalChatsPage'
import ArchivePage from '@/pages/ArchivePage'
import AdminPage from '@/pages/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="chats/external" element={<ExternalChatsPage />} />
        <Route path="chats/internal" element={<InternalChatsPage />} />
        <Route path="chats/archive" element={<ArchivePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route index element={<Navigate to="chats/external" replace />} />
        <Route path="*" element={<Navigate to="chats/external" replace />} />
      </Route>
    </Routes>
  )
}
