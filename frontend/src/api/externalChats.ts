import client from './client'
import type { ExternalChat, ExternalMessage, Channel, ChatStatus } from '@/types'

export async function getExternalChats(params?: {
  status?: ChatStatus
  channel?: Channel
}): Promise<ExternalChat[]> {
  const { data } = await client.get<ExternalChat[]>('/external/chats', { params })
  return data
}

export async function getArchive(params?: { channel?: Channel }): Promise<ExternalChat[]> {
  const { data } = await client.get<ExternalChat[]>('/external/archive', { params })
  return data
}

export async function getChatMessages(
  chatId: number,
  params?: { limit?: number; beforeId?: number }
): Promise<ExternalMessage[]> {
  const { data } = await client.get<ExternalMessage[]>(`/external/chats/${chatId}/messages`, {
    params: { limit: params?.limit, before_id: params?.beforeId },
  })
  return data
}

export async function sendExternalMessage(
  chatId: number,
  payload: { content?: string; fileId?: number; isForwarded?: boolean }
): Promise<ExternalMessage> {
  const { data } = await client.post<ExternalMessage>(
    `/external/chats/${chatId}/send`,
    { content: payload.content, file_id: payload.fileId, is_forwarded: payload.isForwarded ?? false }
  )
  return data
}

export async function archiveChat(chatId: number): Promise<void> {
  await client.post(`/external/chats/${chatId}/archive`)
}

export async function unarchiveChat(chatId: number): Promise<void> {
  await client.post(`/external/chats/${chatId}/unarchive`)
}
