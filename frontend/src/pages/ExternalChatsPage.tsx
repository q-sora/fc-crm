import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getExternalChats, getChatMessages, sendExternalMessage, archiveChat, deleteExternalChat } from '@/api/externalChats'
import { useChatStore } from '@/store/chatStore'
import { subscribeWs } from '@/socket/socket'
import ChatList from '@/components/ChatList/ChatList'
import ChatWindow from '@/components/ChatWindow/ChatWindow'
import ClientProfile from '@/components/ClientProfile/ClientProfile'
import { useT } from '@/i18n'
import styles from './ExternalChatsPage.module.css'

interface ScrollSignal {
  chatId: number
  unread: number
  ts: number
}

export default function ExternalChatsPage() {
  const queryClient = useQueryClient()
  const t = useT()
  const unreadAtOpenRef = useRef(0)
  const [scrollSignal, setScrollSignal] = useState<ScrollSignal | null>(null)
  const setActiveNavPage = useChatStore((s) => s.setActiveNavPage)
  useEffect(() => { setActiveNavPage('external'); return () => setActiveNavPage(null) }, [setActiveNavPage])
  const loadedChatsRef = useRef<Set<number>>(new Set())

  const activeId = useChatStore((s) => s.activeExternalChatId)
  const setActive = useChatStore((s) => s.setActiveExternalChat)
  // Use store for chat list so WS-triggered re-sorts are visible immediately
  const storeChats = useChatStore((s) => s.externalChats)
  const setExternalChats = useChatStore((s) => s.setExternalChats)
  const messages = useChatStore((s) => s.externalMessages)
  const setMessages = useChatStore((s) => s.setExternalMessages)
  const appendMsg = useChatStore((s) => s.appendExternalMessage)
  const showProfile = useChatStore((s) => s.showClientProfile)
  const toggleProfile = useChatStore((s) => s.toggleClientProfile)
  const unreadExternal = useChatStore((s) => s.unreadExternal)
  const updateLastMsg = useChatStore((s) => s.updateExternalChatLastMessage)

  const { data: fetchedChats = [] } = useQuery({
    queryKey: ['external-chats'],
    queryFn: () => getExternalChats({ status: 'active' }),
  })

  // Populate store from React Query (query invalidation also re-syncs store)
  useEffect(() => {
    if (fetchedChats.length > 0) setExternalChats(fetchedChats)
  }, [fetchedChats, setExternalChats])

  // Load messages when active chat changes, then fire scroll signal
  useEffect(() => {
    if (!activeId) return
    const capturedUnread = unreadAtOpenRef.current
    if (loadedChatsRef.current.has(activeId)) {
      // Already cached — signal scroll immediately with what's in store
      setScrollSignal({ chatId: activeId, unread: capturedUnread, ts: Date.now() })
      return
    }
    loadedChatsRef.current.add(activeId)
    getChatMessages(activeId).then((msgs) => {
      setMessages(activeId, msgs)
      setScrollSignal({ chatId: activeId, unread: capturedUnread, ts: Date.now() })
    })
  }, [activeId, setMessages])

  // Invalidate chat list on new onboarding done event
  useEffect(() => {
    return subscribeWs((event) => {
      if (event.type === 'client:onboarding:done') {
        queryClient.invalidateQueries({ queryKey: ['external-chats'] })
      }
    })
  }, [queryClient])

  const activeChat = storeChats.find((c) => c.id === activeId) ?? null

  function handleSelectChat(chatId: number) {
    unreadAtOpenRef.current = useChatStore.getState().unreadExternal[chatId] ?? 0
    setActive(chatId)
  }

  async function handleSend(content: string, fileId?: number) {
    if (!activeId) return
    const msg = await sendExternalMessage(activeId, { content, fileId })
    appendMsg(activeId, msg)
    updateLastMsg(activeId)
  }

  async function handleArchive() {
    if (!activeId) return
    await archiveChat(activeId)
    queryClient.invalidateQueries({ queryKey: ['external-chats'] })
    setActive(null)
  }

  async function handleDelete() {
    if (!activeId) return
    if (!confirm(t.delete_chat_confirm)) return
    await deleteExternalChat(activeId)
    setExternalChats(storeChats.filter((c) => c.id !== activeId))
    setActive(null)
    queryClient.invalidateQueries({ queryKey: ['external-chats'] })
  }

  return (
    <div className={styles.page}>
      <ChatList
        chats={storeChats}
        activeChatId={activeId}
        title={t.external_chats_title}
        unreadCounts={unreadExternal}
        onSelect={handleSelectChat}
      />
      <ChatWindow
        chat={activeChat}
        messages={activeId ? (messages[activeId] ?? []) : []}
        scrollSignal={scrollSignal}
        onSend={handleSend}
        onProfileClick={toggleProfile}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />
      {showProfile && activeChat && (
        <ClientProfile client={activeChat.client} onClose={toggleProfile} />
      )}
    </div>
  )
}
