import { Fragment, useEffect, useRef, useState } from 'react'
import type { ExternalChat, ExternalMessage } from '@/types'
import MessageBubble from './MessageBubble'
import ChatHeader from './ChatHeader'
import MessageInput from '@/components/MessageInput/MessageInput'
import ForwardModal from '@/components/ForwardModal/ForwardModal'
import IconChatEmpty from '@/components/icons/IconChatEmpty'
import IconChevronDown from '@/components/icons/IconChevronDown'
import { useT } from '@/i18n'
import styles from './ChatWindow.module.css'

interface ScrollSignal {
  chatId: number
  unread: number
  ts: number
}

interface Props {
  chat: ExternalChat | null
  messages: ExternalMessage[]
  readOnly?: boolean
  scrollSignal?: ScrollSignal | null
  onSend: (content: string, fileId?: number) => Promise<void>
  onProfileClick: () => void
  onArchive: () => void
}

export default function ChatWindow({
  chat,
  messages,
  readOnly,
  scrollSignal,
  onSend,
  onProfileClick,
  onArchive,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const separatorRef = useRef<HTMLDivElement>(null)
  const [forwardTarget, setForwardTarget] = useState<{ content: string | null; fileId: number | null } | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [separatorIdx, setSeparatorIdx] = useState<number | null>(null)
  const t = useT()

  // Reset separator when chat changes
  useEffect(() => {
    setSeparatorIdx(null)
  }, [chat?.id])

  // Initial scroll driven by explicit signal from parent (fires only after history is loaded)
  useEffect(() => {
    if (!scrollSignal || scrollSignal.chatId !== chat?.id || !messages.length) return

    const unread = scrollSignal.unread
    if (unread > 0 && messages.length >= unread) {
      setSeparatorIdx(messages.length - unread)
      // separator useEffect will scroll to it
    } else {
      requestAnimationFrame(() => {
        const el = messagesRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  }, [scrollSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to separator after it renders in the DOM
  useEffect(() => {
    if (separatorIdx === null) return
    requestAnimationFrame(() => {
      separatorRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' })
    })
  }, [separatorIdx])

  // Smooth scroll to bottom when new messages arrive (only if already near bottom)
  useEffect(() => {
    if (!messages.length) return
    const el = messagesRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (isNearBottom) el.scrollTop = el.scrollHeight
  }, [messages.length])

  // Show/hide scroll button via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(!entry.isIntersecting),
      { root: messagesRef.current, threshold: 0.1 }
    )
    if (bottomRef.current) observer.observe(bottomRef.current)
    return () => observer.disconnect()
  }, [chat?.id])

  if (!chat) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}><IconChatEmpty size={56} /></span>
        {t.select_chat}
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

      <div className={styles.messages} ref={messagesRef}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><IconChatEmpty size={48} /></span>
            {t.no_messages}
          </div>
        )}
        {messages.map((msg, idx) => (
          <Fragment key={msg.id}>
            {separatorIdx !== null && idx === separatorIdx && (
              <div ref={separatorRef} className={styles.unreadSeparator}>
                <div className={styles.unreadSeparatorLine} />
                <span className={styles.unreadSeparatorLabel}>{t.unread_separator}</span>
                <div className={styles.unreadSeparatorLine} />
              </div>
            )}
            <MessageBubble
              message={msg}
              onForward={(content, fileId) => setForwardTarget({ content, fileId })}
            />
          </Fragment>
        ))}
        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <button
          className={styles.scrollDownBtn}
          onClick={() => {
            const el = messagesRef.current
            if (el) el.scrollTop = el.scrollHeight
          }}
          title="Вниз"
        >
          <IconChevronDown size={20} />
        </button>
      )}

      {!readOnly && <MessageInput chatId={chat.id} onSend={onSend} />}

      {forwardTarget && (
        <ForwardModal target={forwardTarget} onClose={() => setForwardTarget(null)} />
      )}
    </div>
  )
}
