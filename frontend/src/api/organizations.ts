import client from './client'
import type { Organization } from '@/types'

export async function getOrganizations(): Promise<Organization[]> {
  const { data } = await client.get<Organization[]>('/organizations')
  return data
}

export async function createOrganization(name: string): Promise<Organization> {
  const { data } = await client.post<Organization>('/organizations', { name })
  return data
}

export async function deleteOrganization(id: number): Promise<void> {
  await client.delete(`/organizations/${id}`)
}
