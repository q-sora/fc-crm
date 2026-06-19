import client from './client'
import type { User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/login', payload)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/auth/me')
  return data
}
