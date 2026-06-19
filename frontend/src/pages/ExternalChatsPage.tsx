import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getExternalChats, getChatMessages, sendExternalMessage, archiveChat } from '@/api/externalChats'
import { useChatStore } from '@/store/chatStore'
import { subscribeWs } from '@/socket/socket'
import ChatList from '@/components/ChatList/ChatList'
import ChatWindow from '@/components/ChatWindow/ChatWindow'
import ClientProfile from '@/components/ClientProfile/ClientProfile'
import styles from './ExternalChatsPage.module.css'

export default function ExternalChatsPage() {
  const queryClient = useQueryClient()

  const activeId = useChatStore((s) => s.activeExternalChatId)
  const setActive = useChatStore((s) => s.setActiveExternalChat)
  const messages = useChatStore((s) => s.externalMessages)
  const setMessages = useChatStore((s) => s.setExternalMessages)
  const appendMsg = useChatStore((s) => s.appendExternalMessage)
  const showProfile = useChatStore((s) => s.showClientProfile)
  const toggleProfile = useChatStore((s) => s.toggleClientProfile)

  const { data: chats = [] } = useQuery({
    queryKey: ['external-chats'],
    queryFn: () => getExternalChats({ status: 'active' }),
  })

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeId) return
    if (messages[activeId]) return
    getChatMessages(activeId).then((msgs) => setMessages(activeId, msgs))
  }, [activeId, messages, setMessages])

  // Invalidate chat list on new onboarding done event
  useEffect(() => {
    return subscribeWs((event) => {
      if (event.type === 'client:onboarding:done') {
        queryClient.invalidateQueries({ queryKey: ['external-chats'] })
      }
      if (event.type === 'external:message:new') {
        appendMsg(event.chatId, event.message)
      }
    })
  }, [queryClient, appendMsg])

  const activeChat = chats.find((c) => c.id === activeId) ?? null

  async function handleSend(content: string, fileId?: number) {
    if (!activeId) return
    const msg = await sendExternalMessage(activeId, { content, fileId })
    appendMsg(activeId, msg)
  }

  async function handleArchive() {
    if (!activeId) return
    await archiveChat(activeId)
    queryClient.invalidateQueries({ queryKey: ['external-chats'] })
    setActive(null)
  }

  return (
    <div className={styles.page}>
      <ChatList
        chats={chats}
        activeChatId={activeId}
        title="Чаты с клиентами"
        onSelect={setActive}
      />
      <ChatWindow
        chat={activeChat}
        messages={activeId ? (messages[activeId] ?? []) : []}
        onSend={handleSend}
        onProfileClick={toggleProfile}
        onArchive={handleArchive}
      />
      {showProfile && activeChat && (
        <ClientProfile client={activeChat.client} onClose={toggleProfile} />
      )}
    </div>
  )
}
