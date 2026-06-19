import { useEffect } from 'react'
import { subscribeWs } from './socket'
import { useChatStore } from '@/store/chatStore'
import type { WsEvent } from '@/types'

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
      }
      if (event.type === 'internal:message:new') {
        appendInternal(event.chatId, event.message)
      }
      // 'client:onboarding:done' — triggers chat list refetch via React Query invalidation
      // handled in ExternalChatsPage via queryClient.invalidateQueries
    })
  }, [appendExternal, updateLastMsg, prependChat, appendInternal])
}
