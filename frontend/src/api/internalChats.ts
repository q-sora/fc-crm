import client from './client'
import type { InternalChat, InternalMessage, InternalChatType } from '@/types'

export async function getInternalChats(): Promise<InternalChat[]> {
  const { data } = await client.get<InternalChat[]>('/internal/chats')
  return data
}

export async function createInternalChat(payload: {
  type: InternalChatType
  name?: string
  memberIds: number[]
}): Promise<InternalChat> {
  const { data } = await client.post<InternalChat>('/internal/chats', {
    type: payload.type,
    name: payload.name,
    member_ids: payload.memberIds,
  })
  return data
}

export async function getInternalMessages(
  chatId: number,
  params?: { limit?: number; beforeId?: number }
): Promise<InternalMessage[]> {
  const { data } = await client.get<InternalMessage[]>(`/internal/chats/${chatId}/messages`, {
    params: { limit: params?.limit, before_id: params?.beforeId },
  })
  return data
}

export async function sendInternalMessage(
  chatId: number,
  payload: { content?: string; fileId?: number; isForwarded?: boolean }
): Promise<InternalMessage> {
  const { data } = await client.post<InternalMessage>(
    `/internal/chats/${chatId}/send`,
    { content: payload.content, file_id: payload.fileId, is_forwarded: payload.isForwarded ?? false }
  )
  return data
}
