import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInternalChats, sendInternalMessage } from '@/api/internalChats'
import { getExternalChats, sendExternalMessage } from '@/api/externalChats'
import { useAuthStore } from '@/store/authStore'
import type { InternalChat, ExternalChat } from '@/types'
import styles from './ForwardModal.module.css'

interface ForwardTarget {
  content: string | null
  fileId: number | null
}

interface Props {
  target: ForwardTarget
  onClose: () => void
}

type Tab = 'internal' | 'external'

function getChatLabel(chat: InternalChat, myId: number): string {
  if (chat.type === 'group') return chat.name ?? 'Группа'
  const other = chat.members.find((m) => m.id !== myId)
  return other?.name ?? 'Чат'
}

function getExternalLabel(chat: ExternalChat): string {
  const name = chat.client?.fullName ?? 'Клиент'
  const channel = chat.channel === 'telegram' ? 'TG' : 'WA'
  return `${name} (${channel})`
}

export default function ForwardModal({ target, onClose }: Props) {
  const me = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('internal')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  const { data: internalChats = [] } = useQuery({
    queryKey: ['internal-chats'],
    queryFn: getInternalChats,
  })

  const { data: externalChats = [] } = useQuery({
    queryKey: ['external-chats-forward'],
    queryFn: () => getExternalChats({ status: 'active' }),
  })

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function forwardToInternal(chat: InternalChat) {
    if (sending) return
    setSending(true)
    try {
      await sendInternalMessage(chat.id, {
        content: target.content ?? undefined,
        fileId: target.fileId ?? undefined,
        isForwarded: true,
      })
      setSent(getChatLabel(chat, me?.id ?? 0))
      setTimeout(onClose, 1200)
    } finally {
      setSending(false)
    }
  }

  async function forwardToExternal(chat: ExternalChat) {
    if (sending) return
    setSending(true)
    try {
      await sendExternalMessage(chat.id, {
        content: target.content ?? undefined,
        fileId: target.fileId ?? undefined,
        isForwarded: true,
      })
      setSent(getExternalLabel(chat))
      setTimeout(onClose, 1200)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Переслать сообщение</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {sent ? (
          <div className={styles.sentMsg}>Отправлено в «{sent}»</div>
        ) : (
          <>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tab === 'internal' ? styles.activeTab : ''}`}
                onClick={() => setTab('internal')}
              >
                Команда
              </button>
              <button
                className={`${styles.tab} ${tab === 'external' ? styles.activeTab : ''}`}
                onClick={() => setTab('external')}
              >
                Клиенты
              </button>
            </div>

            <div className={styles.list}>
              {tab === 'internal' && (
                internalChats.length === 0
                  ? <div className={styles.empty}>Нет внутренних чатов</div>
                  : internalChats.map((chat) => (
                    <button
                      key={chat.id}
                      className={styles.chatItem}
                      onClick={() => forwardToInternal(chat)}
                      disabled={sending}
                    >
                      {getChatLabel(chat, me?.id ?? 0)}
                    </button>
                  ))
              )}
              {tab === 'external' && (
                externalChats.length === 0
                  ? <div className={styles.empty}>Нет доступных клиентских чатов</div>
                  : externalChats.map((chat) => (
                    <button
                      key={chat.id}
                      className={styles.chatItem}
                      onClick={() => forwardToExternal(chat)}
                      disabled={sending}
                    >
                      {getExternalLabel(chat)}
                    </button>
                  ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
