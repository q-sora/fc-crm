import { create } from 'zustand'
import type { ExternalChat, ExternalMessage, InternalChat, InternalMessage } from '@/types'

type NavPage = 'external' | 'internal' | 'archive' | 'admin' | null

interface ChatState {
  // External chats
  externalChats: ExternalChat[]
  activeExternalChatId: number | null
  externalMessages: Record<number, ExternalMessage[]>
  showClientProfile: boolean
  unreadExternal: Record<number, number>

  // Internal chats
  internalChats: InternalChat[]
  activeInternalChatId: number | null
  internalMessages: Record<number, InternalMessage[]>
  unreadInternal: Record<number, number>

  // Active page (for sound notification logic)
  activeNavPage: NavPage

  // External actions
  setExternalChats: (chats: ExternalChat[]) => void
  setActiveExternalChat: (id: number | null) => void
  setExternalMessages: (chatId: number, msgs: ExternalMessage[]) => void
  appendExternalMessage: (chatId: number, msg: ExternalMessage) => void
  toggleClientProfile: () => void
  prependExternalChat: (chat: ExternalChat) => void
  updateExternalChatLastMessage: (chatId: number) => void
  incrementUnreadExternal: (chatId: number) => void

  // Internal actions
  setInternalChats: (chats: InternalChat[]) => void
  setActiveInternalChat: (id: number | null) => void
  setInternalMessages: (chatId: number, msgs: InternalMessage[]) => void
  appendInternalMessage: (chatId: number, msg: InternalMessage) => void
  incrementUnreadInternal: (chatId: number) => void
  touchInternalChat: (chatId: number) => void
  setActiveNavPage: (page: NavPage) => void
}

export const useChatStore = create<ChatState>((set) => ({
  externalChats: [],
  activeExternalChatId: null,
  externalMessages: {},
  showClientProfile: false,
  unreadExternal: {},

  internalChats: [],
  activeInternalChatId: null,
  internalMessages: {},
  unreadInternal: {},
  activeNavPage: null,

  setExternalChats: (chats) => set({ externalChats: chats }),
  setActiveExternalChat: (id) =>
    set((s) => ({
      activeExternalChatId: id,
      unreadExternal: id != null ? { ...s.unreadExternal, [id]: 0 } : s.unreadExternal,
    })),
  setExternalMessages: (chatId, msgs) =>
    set((s) => ({ externalMessages: { ...s.externalMessages, [chatId]: msgs } })),
  appendExternalMessage: (chatId, msg) =>
    set((s) => ({
      externalMessages: {
        ...s.externalMessages,
        [chatId]: [...(s.externalMessages[chatId] ?? []), msg],
      },
    })),
  toggleClientProfile: () => set((s) => ({ showClientProfile: !s.showClientProfile })),
  prependExternalChat: (chat) =>
    set((s) => ({ externalChats: [chat, ...s.externalChats] })),
  updateExternalChatLastMessage: (chatId) =>
    set((s) => {
      const updated = s.externalChats.map((c) =>
        c.id === chatId ? { ...c, lastMessageAt: new Date().toISOString() } : c
      )
      updated.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
        return tb - ta
      })
      return { externalChats: updated }
    }),
  incrementUnreadExternal: (chatId) =>
    set((s) => ({
      unreadExternal: { ...s.unreadExternal, [chatId]: (s.unreadExternal[chatId] ?? 0) + 1 },
    })),

  setInternalChats: (chats) => set({ internalChats: chats }),
  setActiveInternalChat: (id) =>
    set((s) => ({
      activeInternalChatId: id,
      unreadInternal: id != null ? { ...s.unreadInternal, [id]: 0 } : s.unreadInternal,
    })),
  setInternalMessages: (chatId, msgs) =>
    set((s) => ({ internalMessages: { ...s.internalMessages, [chatId]: msgs } })),
  appendInternalMessage: (chatId, msg) =>
    set((s) => ({
      internalMessages: {
        ...s.internalMessages,
        [chatId]: [...(s.internalMessages[chatId] ?? []), msg],
      },
    })),
  incrementUnreadInternal: (chatId) =>
    set((s) => ({
      unreadInternal: { ...s.unreadInternal, [chatId]: (s.unreadInternal[chatId] ?? 0) + 1 },
    })),

  touchInternalChat: (chatId) =>
    set((s) => {
      const idx = s.internalChats.findIndex((c) => c.id === chatId)
      if (idx <= 0) return {}
      const chats = [...s.internalChats]
      const [chat] = chats.splice(idx, 1)
      return { internalChats: [chat, ...chats] }
    }),

  setActiveNavPage: (page) => set({ activeNavPage: page }),
}))
