import { useState } from 'react'
import type { User } from '@/types'
import { useT } from '@/i18n'
import styles from './NewChatModal.module.css'

interface Props {
  currentUserId: number
  users: User[]
  onClose: () => void
  onCreate: (type: 'direct' | 'group', memberIds: number[], name?: string) => Promise<void>
}

type Mode = 'direct' | 'group'

export default function NewChatModal({ currentUserId, users, onClose, onCreate }: Props) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('direct')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [groupName, setGroupName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const colleagues = users.filter((u) => u.id !== currentUserId && u.isActive)
  const filtered = search.trim()
    ? colleagues.filter((u) => u.name.toLowerCase().includes(search.trim().toLowerCase()))
    : colleagues

  function toggleUser(id: number) {
    if (mode === 'direct') {
      setSelectedIds([id])
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    }
  }

  async function handleCreate() {
    if (selectedIds.length === 0) { setError(t.select_participant); return }
    if (mode === 'group' && !groupName.trim()) { setError(t.enter_group_name); return }
    setError(null)
    setLoading(true)
    try {
      await onCreate(mode, selectedIds, mode === 'group' ? groupName.trim() : undefined)
    } catch {
      setError(t.create_error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{t.new_chat_title}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'direct' ? styles.active : ''}`}
            onClick={() => { setMode('direct'); setSelectedIds([]) }}
          >
            {t.mode_direct}
          </button>
          <button
            className={`${styles.modeTab} ${mode === 'group' ? styles.active : ''}`}
            onClick={() => { setMode('group'); setSelectedIds([]) }}
          >
            {t.mode_group}
          </button>
        </div>

        {mode === 'group' && (
          <input
            className={styles.nameInput}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t.group_name_placeholder}
          />
        )}

        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search_by_name}
          />
        </div>

        <div className={styles.userList}>
          {filtered.length === 0 && (
            <div className={styles.empty}>
              {colleagues.length === 0 ? t.no_colleagues : t.no_one_found}
            </div>
          )}
          {filtered.map((u) => {
            const selected = selectedIds.includes(u.id)
            return (
              <button
                key={u.id}
                className={`${styles.userItem} ${selected ? styles.selected : ''}`}
                onClick={() => toggleUser(u.id)}
              >
                <div className={styles.avatar}>
                  {u.name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{u.name}</div>
                  <div className={styles.userRole}>
                    {u.role === 'admin' ? t.role_admin : t.role_employee}
                  </div>
                </div>
                {selected && <span className={styles.check}>✓</span>}
              </button>
            )
          })}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>{t.cancel}</button>
          <button className={styles.createBtn} onClick={handleCreate} disabled={loading}>
            {loading ? t.creating : t.create_btn}
          </button>
        </div>
      </div>
    </div>
  )
}
