import type { ExternalChat } from '@/types'
import IconUser from '@/components/icons/IconUser'
import IconArchive from '@/components/icons/IconArchive'
import IconUnarchive from '@/components/icons/IconUnarchive'
import { useT } from '@/i18n'
import styles from './ChatHeader.module.css'

interface Props {
  chat: ExternalChat
  onProfileClick: () => void
  onArchive: () => void
  isArchived?: boolean
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

export default function ChatHeader({ chat, onProfileClick, onArchive, isArchived }: Props) {
  const { client, channel } = chat
  const displayName = client.fullName ?? client.whatsappPhone ?? `TG ${client.telegramUserId}`
  const t = useT()

  return (
    <div className={styles.header}>
      <div className={styles.avatar} onClick={onProfileClick} title={t.client_profile}>
        {getInitials(client.fullName)}
      </div>

      <div className={styles.info}>
        <div className={styles.name}>{displayName}</div>
        <div className={styles.meta}>
          <span className={`${styles.channelBadge} ${styles[channel]}`}>
            {channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
          </span>
          {client.organization && (
            <span className={styles.org}>{client.organization.name}</span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={onProfileClick}
          title={t.client_profile}
        >
          <IconUser size={18} />
        </button>
        <button
          className={styles.actionBtn}
          onClick={onArchive}
          title={isArchived ? t.unarchive_chat : t.archive_chat}
        >
          {isArchived ? <IconUnarchive size={18} /> : <IconArchive size={18} />}
        </button>
      </div>
    </div>
  )
}
