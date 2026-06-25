import { Fragment, useEffect, useRef, useState, useCallback, useMemo, type DragEvent, type FC } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getInternalChats, getInternalMessages, sendInternalMessage, createInternalChat, updateChatMembers, deleteInternalChat } from '@/api/internalChats'
import { getUsers } from '@/api/users'
import type { User, InternalChat } from '@/types'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/i18n'
import MessageInput, { type MessageInputHandle } from '@/components/MessageInput/MessageInput'
import NewChatModal from '@/components/NewChatModal/NewChatModal'
import ForwardModal from '@/components/ForwardModal/ForwardModal'
import IconPlus from '@/components/icons/IconPlus'
import IconSearch from '@/components/icons/IconSearch'
import IconUser from '@/components/icons/IconUser'
import IconGroup from '@/components/icons/IconGroup'
import IconAttach from '@/components/icons/IconAttach'
import IconFile from '@/components/icons/IconFile'
import IconForward from '@/components/icons/IconForward'
import IconChevronDown from '@/components/icons/IconChevronDown'
import IconTrash from '@/components/icons/IconTrash'
import IconUserPlus from '@/components/icons/IconUserPlus'
import ImageLightbox from '@/components/ImageLightbox/ImageLightbox'
import styles from './InternalChatsPage.module.css'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

interface EditMembersModalProps {
  chat: InternalChat
  users: User[]
  currentUserId: number
  onClose: () => void
  onSave: (memberIds: number[]) => Promise<void>
}

const EditMembersModal: FC<EditMembersModalProps> = ({ chat, users, currentUserId, onClose, onSave }) => {
  const t = useT()
  const currentMemberIds = chat.members.map((m) => m.id)
  const [selected, setSelected] = useState<number[]>(currentMemberIds)
  const mutation = useMutation({ mutationFn: () => onSave(selected) })

  function toggle(id: number) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const others = users.filter((u) => u.isActive)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{t.members_title} {chat.name}</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.membersList}>
          {others.map((u) => (
            <label key={u.id} className={styles.memberRow}>
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
                onChange={() => toggle(u.id)}
              />
              <div className={styles.memberAvatar}>
                {u.name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()}
              </div>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>
                  {u.name}{u.id === currentUserId ? ` ${t.you_label}` : ''}
                </span>
                <span className={styles.memberRole}>{u.role === 'admin' ? t.role_admin : t.role_employee}</span>
              </div>
            </label>
          ))}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalCancelBtn} onClick={onClose}>{t.cancel}</button>
          <button
            className={styles.modalSaveBtn}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InternalChatsPage() {
  const t = useT()
  const currentUser = useAuthStore((s) => s.user)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const separatorRef = useRef<HTMLDivElement>(null)
  const msgInputRef = useRef<MessageInputHandle>(null)
  const [windowDragOver, setWindowDragOver] = useState(false)
  const windowDragCounterRef = useRef(0)
  const qc = useQueryClient()
  const setActiveNavPage = useChatStore((s) => s.setActiveNavPage)
  useEffect(() => { setActiveNavPage('internal'); return () => setActiveNavPage(null) }, [setActiveNavPage])
  const [showNewChat, setShowNewChat] = useState(false)
  const [showEditMembers, setShowEditMembers] = useState(false)
  const [search, setSearch] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const closeLightbox = useCallback(() => setLightboxSrc(null), [])
  const [forwardTarget, setForwardTarget] = useState<{ content: string | null; fileId: number | null } | null>(null)
  const unreadAtOpenRef = useRef(0)
  const [separatorIdx, setSeparatorIdx] = useState<number | null>(null)

  const activeId = useChatStore((s) => s.activeInternalChatId)
  const setActive = useChatStore((s) => s.setActiveInternalChat)
  const allChats = useChatStore((s) => s.internalChats)
  const unreadInternal = useChatStore((s) => s.unreadInternal)
  const setChats = useChatStore((s) => s.setInternalChats)
  const messages = useChatStore((s) => s.internalMessages)
  const setMessages = useChatStore((s) => s.setInternalMessages)
  const appendMsg = useChatStore((s) => s.appendInternalMessage)
  const touchInternalChat = useChatStore((s) => s.touchInternalChat)

  const { data: fetchedChats } = useQuery({
    queryKey: ['internal-chats'],
    queryFn: getInternalChats,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  useEffect(() => {
    if (fetchedChats) setChats(fetchedChats)
  }, [fetchedChats, setChats])

  const loadedChatsRef = useRef<Set<number>>(new Set())

  // Reset separator on chat change
  useEffect(() => {
    setSeparatorIdx(null)
  }, [activeId])

  // Load history or use cached, then trigger initial scroll
  useEffect(() => {
    if (!activeId) return
    const capturedUnread = unreadAtOpenRef.current
    const doScroll = (msgCount: number) => {
      if (capturedUnread > 0 && msgCount >= capturedUnread) {
        setSeparatorIdx(msgCount - capturedUnread)
      } else {
        requestAnimationFrame(() => {
          const el = messagesRef.current
          if (el) el.scrollTop = el.scrollHeight
        })
      }
    }
    if (loadedChatsRef.current.has(activeId)) {
      const cached = useChatStore.getState().internalMessages[activeId] ?? []
      doScroll(cached.length)
      return
    }
    loadedChatsRef.current.add(activeId)
    getInternalMessages(activeId).then((msgs) => {
      setMessages(activeId, msgs)
      doScroll(msgs.length)
    })
  }, [activeId, setMessages])

  const activeMsgs = activeId ? (messages[activeId] ?? []) : []

  // Scroll to separator after it renders
  useEffect(() => {
    if (separatorIdx === null) return
    requestAnimationFrame(() => {
      separatorRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' })
    })
  }, [separatorIdx])

  // Smooth scroll on new messages if near bottom
  useEffect(() => {
    if (!activeMsgs.length) return
    const el = messagesRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (isNearBottom) el.scrollTop = el.scrollHeight
  }, [activeMsgs.length])

  // IntersectionObserver for scroll button
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(!entry.isIntersecting),
      { root: messagesRef.current, threshold: 0.1 }
    )
    if (bottomRef.current) observer.observe(bottomRef.current)
    return () => observer.disconnect()
  }, [activeId])

  const activeChat = allChats.find((c) => c.id === activeId) ?? null

  const filteredChats = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allChats
    return allChats.filter((chat) => {
      if (chat.type === 'group') return (chat.name ?? '').toLowerCase().includes(q)
      return chat.members.some((m) => m.id !== currentUser?.id && m.name.toLowerCase().includes(q))
    })
  }, [allChats, search, currentUser?.id])

  function getChatLabel(chat: typeof allChats[0]) {
    if (chat.type === 'group') return chat.name ?? 'Группа'
    const other = chat.members.find((m) => m.id !== currentUser?.id)
    return other?.name ?? 'Чат'
  }

  function handleSelectChat(chatId: number) {
    unreadAtOpenRef.current = useChatStore.getState().unreadInternal[chatId] ?? 0
    setActive(chatId)
  }

  async function handleSend(content: string, fileId?: number) {
    if (!activeId) return
    const msg = await sendInternalMessage(activeId, { content, fileId })
    appendMsg(activeId, msg)
    touchInternalChat(activeId)
  }

  function handleWindowDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    windowDragCounterRef.current++
    if (windowDragCounterRef.current === 1) setWindowDragOver(true)
  }

  function handleWindowDragLeave() {
    windowDragCounterRef.current--
    if (windowDragCounterRef.current === 0) setWindowDragOver(false)
  }

  function handleWindowDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  async function handleWindowDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    windowDragCounterRef.current = 0
    setWindowDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await msgInputRef.current?.handleFileDrop(file)
  }

  async function handleDeleteChat() {
    if (!activeId) return
    if (!confirm(t.delete_chat_confirm)) return
    await deleteInternalChat(activeId)
    setActive(null)
    await qc.invalidateQueries({ queryKey: ['internal-chats'] })
  }

  async function handleUpdateMembers(memberIds: number[]) {
    if (!activeId) return
    await updateChatMembers(activeId, memberIds)
    await qc.invalidateQueries({ queryKey: ['internal-chats'] })
    setShowEditMembers(false)
  }

  async function handleCreateChat(type: 'direct' | 'group', memberIds: number[], name?: string) {
    const chat = await createInternalChat({ type, memberIds, name })
    await qc.invalidateQueries({ queryKey: ['internal-chats'] })
    setActive(chat.id)
    setShowNewChat(false)
  }

  const headerInfo = useMemo(() => {
    if (!activeChat) return null
    if (activeChat.type === 'group') {
      return {
        initials: null as string | null,
        name: activeChat.name ?? t.mode_group,
        sub: `${activeChat.members.length} участников`,
        isGroup: true,
      }
    }
    const other = activeChat.members.find((m) => m.id !== currentUser?.id)
    const otherUser = users.find((u) => u.id === other?.id)
    const roleLabel = otherUser?.role === 'admin' ? t.role_admin : t.role_employee
    const initials = other
      ? other.name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
      : '?'
    return {
      initials,
      name: other?.name ?? 'Чат',
      sub: roleLabel,
      isGroup: false,
    }
  }, [activeChat, currentUser, users])

  return (
    <div className={styles.page}>
      <div className={styles.chatListPanel}>
        <div className={styles.listHeader}>
          <div className={styles.listHeaderRow}>
            <span className={styles.listTitle}>{t.internal_chats_title}</span>
            <button className={styles.newChatBtn} onClick={() => setShowNewChat(true)} title={t.new_chat}>
              <IconPlus size={16} />
            </button>
          </div>
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
        <div className={styles.chatItems}>
          {filteredChats.length === 0 && (
            <div className={styles.empty}>{search ? t.chats_not_found : t.no_chats}</div>
          )}
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              className={`${styles.chatItem} ${chat.id === activeId ? styles.active : ''}`}
              onClick={() => handleSelectChat(chat.id)}
            >
              <div className={`${styles.chatAvatar} ${chat.type === 'direct' ? styles.chatAvatarInitials : ''}`}>
                {chat.type === 'group'
                  ? <IconGroup size={18} />
                  : (() => {
                      const other = chat.members.find((m) => m.id !== currentUser?.id)
                      return other
                        ? other.name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
                        : <IconUser size={18} />
                    })()}
              </div>
              <div className={styles.chatInfo}>
                <div className={styles.chatNameRow}>
                  <div className={styles.chatName}>{getChatLabel(chat)}</div>
                  {(unreadInternal[chat.id] ?? 0) > 0 && (
                    <span className={styles.unreadBadge}>
                      {unreadInternal[chat.id] > 99 ? '99+' : unreadInternal[chat.id]}
                    </span>
                  )}
                </div>
                <div className={styles.chatMembers}>
                  {chat.members.map((m) => m.name).join(', ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        className={styles.window}
        onDragEnter={activeChat ? handleWindowDragEnter : undefined}
        onDragLeave={activeChat ? handleWindowDragLeave : undefined}
        onDragOver={activeChat ? handleWindowDragOver : undefined}
        onDrop={activeChat ? handleWindowDrop : undefined}
      >
        {windowDragOver && activeChat && (
          <div className={styles.windowDropOverlay}>
            <div className={styles.windowDropOverlayInner}>
              <IconAttach size={36} />
              <span>{t.drop_file_hint}</span>
            </div>
          </div>
        )}
        {!activeChat ? (
          <div className={styles.placeholder}>
            <IconGroup size={40} />
            {t.select_internal_chat}
          </div>
        ) : (
          <>
            <div className={styles.windowHeader}>
              <div className={styles.headerAvatar}>
                {headerInfo?.isGroup
                  ? <IconGroup size={20} />
                  : (headerInfo?.initials ?? <IconUser size={20} />)
                }
              </div>
              <div className={styles.headerInfo}>
                <span className={styles.headerName}>{headerInfo?.name}</span>
                <span className={styles.headerSub}>{headerInfo?.sub}</span>
              </div>
              <div className={styles.headerActions}>
                {headerInfo?.isGroup && (
                  <button className={styles.headerIconBtn} onClick={() => setShowEditMembers(true)} title="Изменить участников">
                    <IconUserPlus size={18} />
                  </button>
                )}
                <button className={`${styles.headerIconBtn} ${styles.headerIconBtnDanger}`} onClick={handleDeleteChat} title="Удалить чат">
                  <IconTrash size={18} />
                </button>
              </div>
            </div>

            <div className={styles.windowMessages} ref={messagesRef}>
              {activeMsgs.map((msg, idx) => {
                const isMine = msg.senderId === currentUser?.id
                const initials = (msg.senderName ?? '?').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
                const prevMsg = activeMsgs[idx - 1]
                const nextMsg = activeMsgs[idx + 1]
                const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId
                const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId
                return (
                  <Fragment key={msg.id}>
                    {separatorIdx !== null && idx === separatorIdx && (
                      <div ref={separatorRef} className={styles.unreadSeparator}>
                        <div className={styles.unreadSeparatorLine} />
                        <span className={styles.unreadSeparatorLabel}>{t.unread_separator}</span>
                        <div className={styles.unreadSeparatorLine} />
                      </div>
                    )}
                    <div
                      className={`${styles.internalBubbleWrapper} ${isMine ? styles.mine : styles.theirs} ${!isLastInGroup ? styles.grouped : ''}`}
                    >
                      {!isMine && (
                        isLastInGroup
                          ? <div className={styles.msgAvatar} title={msg.senderName ?? undefined}>{initials}</div>
                          : <div className={styles.msgAvatarSpacer} />
                      )}
                      <div className={styles.msgBody}>
                      <div className={styles.msgBubbleRow}>
                      {isMine && (
                        <button
                          className={`${styles.forwardBtn} ${styles.forwardBtnMine}`}
                          title="Переслать"
                          onClick={() => setForwardTarget({ content: msg.content, fileId: msg.file?.id ?? null })}
                        ><IconForward size={14} /></button>
                      )}
                      <div className={`${styles.internalBubble} ${isMine ? styles.mine : styles.theirs} ${msg.file && (msg.file.mimeType.startsWith('image/') || msg.file.mimeType.startsWith('video/')) ? styles.mediaBubble : ''}`}>
                        {!isMine && isFirstInGroup && (
                          <div className={styles.senderName}>{msg.senderName}</div>
                        )}
                        {msg.isForwarded && <div className={styles.forwardedLabel}>{t.forwarded_label}</div>}
                        {msg.file && msg.file.mimeType.startsWith('image/') && (
                          <>
                            <img
                              className={styles.fileImg}
                              src={msg.file.url}
                              alt={msg.file.originalName}
                              onClick={() => setLightboxSrc(msg.file!.url)}
                            />
                            <a className={styles.fileDownload} href={msg.file.url} download={msg.file.originalName}>
                              <IconAttach size={12} />{msg.file.originalName}
                            </a>
                          </>
                        )}
                        {msg.file && msg.file.mimeType.startsWith('video/') && (
                          <>
                            <video className={styles.fileVideo} src={msg.file.url} controls />
                            <a className={styles.fileDownload} href={msg.file.url} download={msg.file.originalName}>
                              <IconAttach size={12} />{msg.file.originalName}
                            </a>
                          </>
                        )}
                        {msg.file && !msg.file.mimeType.startsWith('image/') && !msg.file.mimeType.startsWith('video/') && (
                          <a className={styles.fileAttachment} href={msg.file.url} download={msg.file.originalName}>
                            <div className={styles.fileIconCircle}><IconFile size={28} /></div>
                            <div className={styles.fileInfo}>
                              <span className={styles.fileName}>{msg.file.originalName}</span>
                              <span className={styles.fileDownloadHint}>{t.download_hint}</span>
                            </div>
                          </a>
                        )}
                        {msg.content && <span>{msg.content}</span>}
                        <div className={styles.bubbleTime}>{formatTime(msg.sentAt)}</div>
                      </div>
                      {!isMine && (
                        <button
                          className={`${styles.forwardBtn} ${styles.forwardBtnTheirs}`}
                          title="Переслать"
                          onClick={() => setForwardTarget({ content: msg.content, fileId: msg.file?.id ?? null })}
                        ><IconForward size={14} /></button>
                      )}
                      </div>
                      </div>
                    </div>
                  </Fragment>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {showScrollBtn && (
              <button className={styles.scrollDownBtn} onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} title="Вниз">
                <IconChevronDown size={20} />
              </button>
            )}
            <MessageInput ref={msgInputRef} chatId={activeChat.id} onSend={handleSend} showDragOverlay={false} />
          </>
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          currentUserId={currentUser?.id ?? 0}
          users={users}
          onClose={() => setShowNewChat(false)}
          onCreate={handleCreateChat}
        />
      )}

      {showEditMembers && activeChat && (
        <EditMembersModal
          chat={activeChat}
          users={users}
          currentUserId={currentUser?.id ?? 0}
          onClose={() => setShowEditMembers(false)}
          onSave={handleUpdateMembers}
        />
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={closeLightbox} />}

      {forwardTarget && (
        <ForwardModal target={forwardTarget} onClose={() => setForwardTarget(null)} />
      )}
    </div>
  )
}
