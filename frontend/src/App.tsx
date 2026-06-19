import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ExternalChatsPage from './pages/ExternalChatsPage'
import InternalChatsPage from './pages/InternalChatsPage'
import ArchivePage from './pages/ArchivePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/chats/external" element={<ExternalChatsPage />} />
      <Route path="/chats/internal" element={<InternalChatsPage />} />
      <Route path="/chats/archive" element={<ArchivePage />} />
      <Route path="*" element={<Navigate to="/chats/external" replace />} />
    </Routes>
  )
}
