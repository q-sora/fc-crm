import client from './client'
import type { QuickPhrase } from '@/types'

export async function getQuickPhrases(): Promise<QuickPhrase[]> {
  const { data } = await client.get<QuickPhrase[]>('/quick-phrases')
  return data
}

export async function createQuickPhrase(payload: { title: string; body: string }): Promise<QuickPhrase> {
  const { data } = await client.post<QuickPhrase>('/quick-phrases', payload)
  return data
}

export async function deleteQuickPhrase(id: number): Promise<void> {
  await client.delete(`/quick-phrases/${id}`)
}
