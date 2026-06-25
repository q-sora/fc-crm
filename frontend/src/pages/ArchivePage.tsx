import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getArchive, getChatMessages, unarchiveChat, deleteExternalChat } from '@/api/externalChats'
import { useChatStore } from '@/store/chatStore'
import ChatList from '@/components/ChatList/ChatList'
import ChatWindow from '@/components/ChatWindow/ChatWindow'
import ClientProfile from '@/components/ClientProfile/ClientProfile'
import { useT } from '@/i18n'
import styles from './ArchivePage.module.css'

export default function ArchivePage() {
  const queryClient = useQueryClient()
  const t = useT()

  const activeId = useChatStore((s) => s.activeExternalChatId)
  const setActive = useChatStore((s) => s.setActiveExternalChat)
  const messages = useChatStore((s) => s.externalMessages)
  const setMessages = useChatStore((s) => s.setExternalMessages)
  const showProfile = useChatStore((s) => s.showClientProfile)
  const toggleProfile = useChatStore((s) => s.toggleClientProfile)

  const { data: chats = [] } = useQuery({
    queryKey: ['archive-chats'],
    queryFn: () => getArchive(),
  })

  useEffect(() => {
    if (!activeId || messages[activeId]) return
    getChatMessages(activeId).then((msgs) => setMessages(activeId, msgs))
  }, [activeId, messages, setMessages])

  const activeChat = chats.find((c) => c.id === activeId) ?? null

  async function handleUnarchive() {
    if (!activeId) return
    await unarchiveChat(activeId)
    queryClient.invalidateQueries({ queryKey: ['archive-chats'] })
    setActive(null)
  }

  async function handleDelete() {
    if (!activeId) return
    if (!confirm(t.delete_chat_confirm)) return
    await deleteExternalChat(activeId)
    setActive(null)
    queryClient.invalidateQueries({ queryKey: ['archive-chats'] })
  }

  return (
    <div className={styles.page}>
      <ChatList
        chats={chats}
        activeChatId={activeId}
        title={t.archive_title}
        onSelect={setActive}
      />
      <ChatWindow
        chat={activeChat}
        messages={activeId ? (messages[activeId] ?? []) : []}
        readOnly
        onSend={async () => {}}
        onProfileClick={toggleProfile}
        onArchive={handleUnarchive}
        onDelete={handleDelete}
      />
      {showProfile && activeChat && (
        <ClientProfile client={activeChat.client} onClose={toggleProfile} />
      )}
    </div>
  )
}
