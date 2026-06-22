import { useEffect } from 'react'
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
  const appendExternal = useChatStore((s) => s.appendExternalMessage)
  const updateLastMsg = useChatStore((s) => s.updateExternalChatLastMessage)
  const prependChat = useChatStore((s) => s.prependExternalChat)
  const appendInternal = useChatStore((s) => s.appendInternalMessage)

  useEffect(() => {
    return subscribeWs((event: WsEvent) => {
      if (event.type === 'external:message:new') {
        appendExternal(event.chatId, event.message)
        updateLastMsg(event.chatId)
        const { activeExternalChatId, incrementUnreadExternal } = useChatStore.getState()
        if (event.chatId !== activeExternalChatId) {
          incrementUnreadExternal(event.chatId)
          playNotification()
        }
      }
      if (event.type === 'internal:message:new') {
        appendInternal(event.chatId, event.message)
        const { activeInternalChatId, activeNavPage, incrementUnreadInternal, touchInternalChat } = useChatStore.getState()
        touchInternalChat(event.chatId)
        // Sender never receives their own WS echo, so this is always from someone else
        // Only suppress unread badge if actively viewing this exact chat on the internal page
        if (!(activeNavPage === 'internal' && event.chatId === activeInternalChatId)) {
          incrementUnreadInternal(event.chatId)
        }
        playNotification()
      }
    })
  }, [appendExternal, updateLastMsg, prependChat, appendInternal])
}
