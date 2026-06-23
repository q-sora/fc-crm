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
        const { externalChats, activeExternalChatId, incrementUnreadExternal } = useChatStore.getState()
        const chatInStore = externalChats.some((c) => c.id === event.chatId)

        appendExternal(event.chatId, event.message)
        updateLastMsg(event.chatId)

        if (!chatInStore) {
          // New chat not yet in the list — refetch so it appears
          queryClient.invalidateQueries({ queryKey: ['external-chats'] })
        }

        if (event.chatId !== activeExternalChatId) {
          incrementUnreadExternal(event.chatId)
          playNotification()
        }
      }
      if (event.type === 'client:onboarding:done') {
        // New chat created — refresh list regardless of which page is active
        queryClient.invalidateQueries({ queryKey: ['external-chats'] })
      }
      if (event.type === 'internal:message:new') {
        appendInternal(event.chatId, event.message)
        const { activeInternalChatId, activeNavPage, incrementUnreadInternal, touchInternalChat } = useChatStore.getState()
        touchInternalChat(event.chatId)
        if (!(activeNavPage === 'internal' && event.chatId === activeInternalChatId)) {
          incrementUnreadInternal(event.chatId)
        }
        playNotification()
      }
    })
  }, [queryClient, appendExternal, updateLastMsg, appendInternal])
}
