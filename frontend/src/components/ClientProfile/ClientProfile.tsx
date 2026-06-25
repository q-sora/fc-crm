import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrganizations } from '@/api/organizations'
import { updateClient } from '@/api/clients'
import type { ClientProfile as ClientProfileType } from '@/types'
import { useT } from '@/i18n'
import styles from './ClientProfile.module.css'

interface Props {
  client: ClientProfileType
  onClose: () => void
}

function cleanPhone(phone: string): string | null {
  if (phone.includes('@lid')) return null
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
  const t = useT()
  const qc = useQueryClient()
  const [editOrg, setEditOrg] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(client.organization?.id ?? null)
  const [orgSearch, setOrgSearch] = useState('')

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
    enabled: editOrg,
  })

  const filteredOrgs = useMemo(() => {
    const q = orgSearch.toLowerCase().trim()
    return q ? orgs.filter((o) => o.name.toLowerCase().includes(q)) : orgs
  }, [orgs, orgSearch])

  const orgMutation = useMutation({
    mutationFn: (orgId: number | null) => updateClient(client.id, { organization_id: orgId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-chats'] })
      setEditOrg(false)
      setOrgSearch('')
    },
  })

  function handleOrgSave() {
    orgMutation.mutate(selectedOrgId)
  }

  function handleEditOrg() {
    setSelectedOrgId(client.organization?.id ?? null)
    setOrgSearch('')
    setEditOrg(true)
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>{t.profile_title}</span>
        <button className={styles.closeBtn} onClick={onClose} title="✕">✕</button>
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
          <span className={styles.fieldLabel}>{t.field_fullname}</span>
          {client.fullName
            ? <span className={styles.fieldValue}>{client.fullName}</span>
            : <span className={styles.fieldValueEmpty}>{t.not_specified}</span>
          }
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t.field_iin}</span>
          {client.iin
            ? <span className={styles.fieldValue}>{client.iin}</span>
            : <span className={styles.fieldValueEmpty}>{t.not_specified_m}</span>
          }
        </div>

        <div className={styles.divider} />

        <div className={styles.field}>
          <div className={styles.fieldLabelRow}>
            <span className={styles.fieldLabel}>{t.field_org}</span>
            {!editOrg && (
              <button className={styles.editOrgBtn} onClick={handleEditOrg}>
                {client.organization ? t.org_change : t.org_set}
              </button>
            )}
          </div>

          {editOrg ? (
            <div className={styles.orgEditRow}>
              <input
                className={styles.orgSearchInput}
                placeholder={t.org_search_placeholder}
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                autoFocus
              />
              <div className={styles.orgList}>
                <div
                  className={`${styles.orgListItem} ${selectedOrgId === null ? styles.orgListItemSelected : ''}`}
                  onClick={() => setSelectedOrgId(null)}
                >
                  {t.org_not_set}
                </div>
                {filteredOrgs.map((o) => (
                  <div
                    key={o.id}
                    className={`${styles.orgListItem} ${selectedOrgId === o.id ? styles.orgListItemSelected : ''}`}
                    onClick={() => setSelectedOrgId(o.id)}
                  >
                    {o.name}
                  </div>
                ))}
                {filteredOrgs.length === 0 && orgSearch && (
                  <div className={styles.orgListEmpty}>{t.org_not_found}</div>
                )}
              </div>
              <div className={styles.orgActionRow}>
                <button
                  className={styles.orgSaveBtn}
                  onClick={handleOrgSave}
                  disabled={orgMutation.isPending}
                >
                  {orgMutation.isPending ? '...' : t.save}
                </button>
                <button className={styles.orgCancelBtn} onClick={() => setEditOrg(false)}>
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            client.organization
              ? <span className={styles.fieldValue}>{client.organization.name}</span>
              : <span className={styles.fieldValueEmpty}>{t.not_specified_f}</span>
          )}
        </div>

        {client.whatsappPhone && cleanPhone(client.whatsappPhone) && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t.field_phone}</span>
            <span className={styles.fieldValue}>+{cleanPhone(client.whatsappPhone)}</span>
          </div>
        )}

        {client.telegramUsername && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t.field_telegram}</span>
            <span className={styles.fieldValue}>@{client.telegramUsername}</span>
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t.field_first_contact}</span>
          <span className={styles.fieldValue}>{formatDate(client.createdAt)}</span>
        </div>
      </div>
    </aside>
  )
}
