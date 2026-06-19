import client from './client'
import type { FileAttachment } from '@/types'

export async function uploadFile(file: File): Promise<FileAttachment & { size: number }> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
