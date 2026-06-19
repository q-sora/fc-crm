import { create } from 'zustand'
import type { ExternalChat, ExternalMessage, InternalChat, InternalMessage } from '@/types'

interface ChatState {
  // External chats
  externalChats: ExternalChat[]
  activeExternalChatId: number | null
  externalMessages: Record<number, ExternalMessage[]>
  showClientProfile: boolean

  // Internal chats
  internalChats: InternalChat[]
  activeInternalChatId: number | null
  internalMessages: Record<number, InternalMessage[]>

  // External actions
  setExternalChats: (chats: ExternalChat[]) => void
  setActiveExternalChat: (id: number | null) => void
  setExternalMessages: (chatId: number, msgs: ExternalMessage[]) => void
  appendExternalMessage: (chatId: number, msg: ExternalMessage) => void
  toggleClientProfile: () => void
  prependExternalChat: (chat: ExternalChat) => void
  updateExternalChatLastMessage: (chatId: number) => void

  // Internal actions
  setInternalChats: (chats: InternalChat[]) => void
  setActiveInternalChat: (id: number | null) => void
  setInternalMessages: (chatId: number, msgs: InternalMessage[]) => void
  appendInternalMessage: (chatId: number, msg: InternalMessage) => void
}

export const useChatStore = create<ChatState>((set) => ({
  externalChats: [],
  activeExternalChatId: null,
  externalMessages: {},
  showClientProfile: false,

  internalChats: [],
  activeInternalChatId: null,
  internalMessages: {},

  setExternalChats: (chats) => set({ externalChats: chats }),
  setActiveExternalChat: (id) => set({ activeExternalChatId: id }),
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
    set((s) => ({
      externalChats: s.externalChats.map((c) =>
        c.id === chatId ? { ...c, lastMessageAt: new Date().toISOString() } : c
      ),
    })),

  setInternalChats: (chats) => set({ internalChats: chats }),
  setActiveInternalChat: (id) => set({ activeInternalChatId: id }),
  setInternalMessages: (chatId, msgs) =>
    set((s) => ({ internalMessages: { ...s.internalMessages, [chatId]: msgs } })),
  appendInternalMessage: (chatId, msg) =>
    set((s) => ({
      internalMessages: {
        ...s.internalMessages,
        [chatId]: [...(s.internalMessages[chatId] ?? []), msg],
      },
    })),
}))
