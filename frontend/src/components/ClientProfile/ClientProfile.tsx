import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrganizations } from '@/api/organizations'
import { updateClient } from '@/api/clients'
import type { ClientProfile as ClientProfileType } from '@/types'
import styles from './ClientProfile.module.css'

interface Props {
  client: ClientProfileType
  onClose: () => void
}

function cleanPhone(phone: string): string | null {
  if (phone.includes('@lid')) return null  // LID is internal WA identifier, not a real number
  return phone.split('@')[0]
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
  const qc = useQueryClient()
  const [editOrg, setEditOrg] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(client.organization?.id ?? null)

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
    enabled: editOrg,
  })

  const orgMutation = useMutation({
    mutationFn: (orgId: number | null) => updateClient(client.id, { organization_id: orgId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-chats'] })
      setEditOrg(false)
    },
  })

  function handleOrgSave() {
    orgMutation.mutate(selectedOrgId)
  }

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
          <div className={styles.fieldLabelRow}>
            <span className={styles.fieldLabel}>Организация</span>
            {!editOrg && (
              <button className={styles.editOrgBtn} onClick={() => setEditOrg(true)}>
                {client.organization ? 'Изменить' : 'Указать'}
              </button>
            )}
          </div>

          {editOrg ? (
            <div className={styles.orgEditRow}>
              <select
                className={styles.orgSelect}
                value={selectedOrgId ?? ''}
                onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
                autoFocus
              >
                <option value="">— Не указана —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <button
                className={styles.orgSaveBtn}
                onClick={handleOrgSave}
                disabled={orgMutation.isPending}
              >
                {orgMutation.isPending ? '...' : 'Сохранить'}
              </button>
              <button className={styles.orgCancelBtn} onClick={() => setEditOrg(false)}>Отмена</button>
            </div>
          ) : (
            client.organization
              ? <span className={styles.fieldValue}>{client.organization.name}</span>
              : <span className={styles.fieldValueEmpty}>Не указана</span>
          )}
        </div>

        {client.whatsappPhone && cleanPhone(client.whatsappPhone) && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Телефон</span>
            <span className={styles.fieldValue}>+{cleanPhone(client.whatsappPhone)}</span>
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
