import apiClient from './client'
import type { ClientProfile } from '@/types'

export async function getClients(): Promise<ClientProfile[]> {
  const res = await apiClient.get('/clients/')
  return res.data
}

export async function updateClient(
  id: number,
  data: { full_name?: string | null; iin?: string | null; organization_id?: number | null }
): Promise<ClientProfile> {
  const res = await apiClient.patch(`/clients/${id}`, data)
  return res.data
}

export async function deleteClient(id: number): Promise<void> {
  await apiClient.delete(`/clients/${id}`)
}
