import client from './client'
import type { User, UserRole } from '@/types'

export async function getUsers(): Promise<User[]> {
  const { data } = await client.get<User[]>('/users')
  return data
}

export async function createUser(payload: {
  email: string
  name: string
  password: string
  role: UserRole
  organizationIds?: number[]
}): Promise<User> {
  const { data } = await client.post<User>('/users', {
    email: payload.email,
    name: payload.name,
    password: payload.password,
    role: payload.role,
    organization_ids: payload.organizationIds ?? [],
  })
  return data
}

export async function updateUser(
  id: number,
  payload: {
    name?: string
    email?: string
    password?: string
    role?: UserRole
    isActive?: boolean
    organizationIds?: number[]
  }
): Promise<User> {
  const { data } = await client.patch<User>(`/users/${id}`, {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role: payload.role,
    is_active: payload.isActive,
    organization_ids: payload.organizationIds,
  })
  return data
}

export async function deactivateUser(id: number): Promise<User> {
  return updateUser(id, { isActive: false })
}

export async function activateUser(id: number): Promise<User> {
  return updateUser(id, { isActive: true })
}

export async function deleteUser(id: number): Promise<void> {
  await client.delete(`/users/${id}`)
}
