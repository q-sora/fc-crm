import { useEffect, useRef } from 'react'
import type { ExternalChat, ExternalMessage } from '@/types'
import MessageBubble from './MessageBubble'
import ChatHeader from './ChatHeader'
import MessageInput from '@/components/MessageInput/MessageInput'
import styles from './ChatWindow.module.css'

interface Props {
  chat: ExternalChat | null
  messages: ExternalMessage[]
  readOnly?: boolean
  onSend: (content: string, fileId?: number) => Promise<void>
  onProfileClick: () => void
  onArchive: () => void
}

export default function ChatWindow({
  chat,
  messages,
  readOnly,
  onSend,
  onProfileClick,
  onArchive,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!chat) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}>💬</span>
        Выберите чат для начала работы
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <ChatHeader
        chat={chat}
        onProfileClick={onProfileClick}
        onArchive={onArchive}
        isArchived={chat.status === 'archived'}
      />

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📭</span>
            Нет сообщений
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {!readOnly && <MessageInput chatId={chat.id} onSend={onSend} />}
    </div>
  )
}
