import { useState } from 'react'
import type { ExternalChat } from '@/types'
import ChatListItem from './ChatListItem'
import IconSearch from '@/components/icons/IconSearch'
import { useT } from '@/i18n'
import styles from './ChatList.module.css'

interface Props {
  chats: ExternalChat[]
  activeChatId: number | null
  title: string
  unreadCounts?: Record<number, number>
  onSelect: (id: number) => void
}

export default function ChatList({ chats, activeChatId, title, unreadCounts = {}, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const t = useT()

  const filtered = chats.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.client.fullName?.toLowerCase().includes(q) ||
      c.client.whatsappPhone?.includes(q) ||
      c.client.organization?.name.toLowerCase().includes(q)
    )
  })

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}><IconSearch size={16} /></span>
          <input
            className={styles.search}
            type="text"
            placeholder={t.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.empty}>{t.chats_not_found}</div>
        )}
        {filtered.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            unreadCount={unreadCounts[chat.id] ?? 0}
            onClick={() => onSelect(chat.id)}
          />
        ))}
      </div>
    </div>
  )
}
