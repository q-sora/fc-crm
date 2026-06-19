import type { ClientProfile as ClientProfileType } from '@/types'
import styles from './ClientProfile.module.css'

interface Props {
  client: ClientProfileType
  onClose: () => void
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function ClientProfile({ client, onClose }: Props) {
  const displayName = client.fullName ?? client.whatsappPhone ?? `TG ${client.telegramUserId}`

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Профиль клиента</span>
        <button className={styles.closeBtn} onClick={onClose} title="Закрыть">✕</button>
      </div>

      <div className={styles.avatarSection}>
        <div className={styles.avatar}>{getInitials(client.fullName)}</div>
        <div className={styles.displayName}>{displayName}</div>
        <span className={`${styles.channelBadge} ${styles[client.channel]}`}>
          {client.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
        </span>
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>ФИО</span>
          {client.fullName
            ? <span className={styles.fieldValue}>{client.fullName}</span>
            : <span className={styles.fieldValueEmpty}>Не указано</span>
          }
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>ИИН</span>
          {client.iin
            ? <span className={styles.fieldValue}>{client.iin}</span>
            : <span className={styles.fieldValueEmpty}>Не указан</span>
          }
        </div>

        <div className={styles.divider} />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Организация</span>
          {client.organization
            ? <span className={styles.fieldValue}>{client.organization.name}</span>
            : <span className={styles.fieldValueEmpty}>Не указана</span>
          }
        </div>

        {client.whatsappPhone && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Телефон</span>
            <span className={styles.fieldValue}>+{client.whatsappPhone}</span>
          </div>
        )}

        {client.telegramUsername && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Telegram</span>
            <span className={styles.fieldValue}>@{client.telegramUsername}</span>
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Первое обращение</span>
          <span className={styles.fieldValue}>{formatDate(client.createdAt)}</span>
        </div>
      </div>
    </aside>
  )
}
