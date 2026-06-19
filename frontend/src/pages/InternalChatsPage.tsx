import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInternalChats, getInternalMessages, sendInternalMessage } from '@/api/internalChats'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { subscribeWs } from '@/socket/socket'
import MessageInput from '@/components/MessageInput/MessageInput'
import styles from './InternalChatsPage.module.css'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

export default function InternalChatsPage() {
  const currentUser = useAuthStore((s) => s.user)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeId = useChatStore((s) => s.activeInternalChatId)
  const setActive = useChatStore((s) => s.setActiveInternalChat)
  const allChats = useChatStore((s) => s.internalChats)
  const setChats = useChatStore((s) => s.setInternalChats)
  const messages = useChatStore((s) => s.internalMessages)
  const setMessages = useChatStore((s) => s.setInternalMessages)
  const appendMsg = useChatStore((s) => s.appendInternalMessage)

  const { data: chats = [] } = useQuery({
    queryKey: ['internal-chats'],
    queryFn: getInternalChats,
  })

  useEffect(() => { setChats(chats) }, [chats, setChats])

  useEffect(() => {
    if (!activeId || messages[activeId]) return
    getInternalMessages(activeId).then((msgs) => setMessages(activeId, msgs))
  }, [activeId, messages, setMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages[activeId ?? 0]?.length])

  useEffect(() => {
    return subscribeWs((event) => {
      if (event.type === 'internal:message:new') {
        appendMsg(event.chatId, event.message)
      }
    })
  }, [appendMsg])

  const activeChat = allChats.find((c) => c.id === activeId) ?? null
  const activeMsgs = activeId ? (messages[activeId] ?? []) : []

  function getChatLabel(chat: typeof chats[0]) {
    if (chat.type === 'group') return chat.name ?? 'Группа'
    const other = chat.members.find((m) => m.id !== currentUser?.id)
    return other?.name ?? 'Чат'
  }

  async function handleSend(content: string, fileId?: number) {
    if (!activeId) return
    const msg = await sendInternalMessage(activeId, { content, fileId })
    appendMsg(activeId, msg)
  }

  return (
    <div className={styles.page}>
      {/* Chat list */}
      <div className={styles.chatListPanel}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Команда</span>
        </div>
        <div className={styles.chatItems}>
          {chats.length === 0 && (
            <div className={styles.empty}>Нет чатов</div>
          )}
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`${styles.chatItem} ${chat.id === activeId ? styles.active : ''}`}
              onClick={() => setActive(chat.id)}
            >
              <div className={styles.chatAvatar}>
                {chat.type === 'group' ? '👥' : '👤'}
              </div>
              <div className={styles.chatInfo}>
                <div className={styles.chatName}>{getChatLabel(chat)}</div>
                <div className={styles.chatMembers}>
                  {chat.members.map((m) => m.name).join(', ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className={styles.window}>
        {!activeChat ? (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>👥</span>
            Выберите чат
          </div>
        ) : (
          <>
            <div className={styles.windowHeader}>
              <span className={styles.windowTitle}>{getChatLabel(activeChat)}</span>
            </div>

            <div className={styles.windowMessages}>
              {activeMsgs.map((msg) => {
                const isMine = msg.senderId === currentUser?.id
                return (
                  <div
                    key={msg.id}
                    className={`${styles.internalBubbleWrapper} ${isMine ? styles.mine : styles.theirs}`}
                  >
                    {!isMine && (
                      <span className={styles.senderName}>{msg.senderName}</span>
                    )}
                    <div className={`${styles.internalBubble} ${isMine ? styles.mine : styles.theirs}`}>
                      {msg.content}
                      <div className={styles.bubbleTime}>{formatTime(msg.sentAt)}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <MessageInput chatId={activeChat.id} onSend={handleSend} />
          </>
        )}
      </div>
    </div>
  )
}
