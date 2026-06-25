import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeWs } from './socket'
import { useChatStore } from '@/store/chatStore'
import type { WsEvent } from '@/types'

function playNotification() {
  try {
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {/* autoplay blocked — ignore */})
  } catch {
    // ignore
  }
}

export function useWsEvents(): void {
  const queryClient = useQueryClient()
  const appendExternal = useChatStore((s) => s.appendExternalMessage)
  const updateLastMsg = useChatStore((s) => s.updateExternalChatLastMessage)
  const appendInternal = useChatStore((s) => s.appendInternalMessage)

  useEffect(() => {
    return subscribeWs((event: WsEvent) => {
      if (event.type === 'external:message:new') {
        const { externalChats, activeExternalChatId, activeNavPage, incrementUnreadExternal } = useChatStore.getState()
        const chatInStore = externalChats.some((c) => c.id === event.chatId)

        appendExternal(event.chatId, event.message)
        updateLastMsg(event.chatId)

        if (!chatInStore) {
          queryClient.invalidateQueries({ queryKey: ['external-chats'] })
        }

        // Notify unless the user is actively viewing this exact chat right now
        const isViewingThisChat = activeNavPage === 'external' && event.chatId === activeExternalChatId
        if (!isViewingThisChat) {
          incrementUnreadExternal(event.chatId)
          playNotification()
        }
      }

      if (event.type === 'client:onboarding:done') {
        queryClient.invalidateQueries({ queryKey: ['external-chats'] })
        // New chat from a freshly onboarded client — notify immediately
        const { incrementUnreadExternal } = useChatStore.getState()
        incrementUnreadExternal(event.chatId)
        playNotification()
      }

      if (event.type === 'internal:message:new') {
        appendInternal(event.chatId, event.message)
        const { activeInternalChatId, activeNavPage, incrementUnreadInternal, touchInternalChat } = useChatStore.getState()
        touchInternalChat(event.chatId)
        const isViewingThisChat = activeNavPage === 'internal' && event.chatId === activeInternalChatId
        if (!isViewingThisChat) {
          incrementUnreadInternal(event.chatId)
          playNotification()
        }
      }
    })
  }, [queryClient, appendExternal, updateLastMsg, appendInternal])
}
