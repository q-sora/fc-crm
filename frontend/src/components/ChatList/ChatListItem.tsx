import type { ExternalChat } from '@/types'
import styles from './ChatListItem.module.css'

interface Props {
  chat: ExternalChat
  isActive: boolean
  unreadCount?: number
  onClick: () => void
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' })
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export default function ChatListItem({ chat, isActive, unreadCount = 0, onClick }: Props) {
  const { client, channel, lastMessageAt } = chat
  const displayName = client.fullName ?? client.whatsappPhone ?? `TG ${client.telegramUserId}`

  return (
    <button
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatarWrapper}>
        <div className={styles.avatar}>{getInitials(client.fullName)}</div>
        <span className={`${styles.channelBadge} ${styles[channel]}`}>
          {channel === 'whatsapp' ? 'W' : 'T'}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.name}>{displayName}</span>
          <div className={styles.rowRight}>
            <span className={styles.time}>{formatTime(lastMessageAt)}</span>
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </div>
        <div className={styles.preview}>
          {client.organization?.name ?? 'Организация не указана'}
        </div>
      </div>
    </button>
  )
}
