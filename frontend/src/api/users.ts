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
  organizationId?: number
}): Promise<User> {
  const { data } = await client.post<User>('/users', {
    email: payload.email,
    name: payload.name,
    password: payload.password,
    role: payload.role,
    organization_id: payload.organizationId,
  })
  return data
}

export async function updateUser(
  id: number,
  payload: { name?: string; role?: UserRole; organizationId?: number; isActive?: boolean }
): Promise<User> {
  const { data } = await client.patch<User>(`/users/${id}`, {
    name: payload.name,
    role: payload.role,
    organization_id: payload.organizationId,
    is_active: payload.isActive,
  })
  return data
}

export async function deactivateUser(id: number): Promise<void> {
  await client.delete(`/users/${id}`)
}
