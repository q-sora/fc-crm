export type UserRole = 'admin' | 'employee'
export type Channel = 'whatsapp' | 'telegram'
export type ChatStatus = 'active' | 'archived'
export type MessageDirection = 'in' | 'out'
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video'
export type InternalChatType = 'direct' | 'group'
export type InternalMessageType = 'text' | 'image' | 'document'

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
  isActive: boolean
  organizations: Organization[]
  createdAt: string
}

export interface Organization {
  id: number
  name: string
  aliases: string[]
  createdAt: string
}

export interface FileAttachment {
  id: number
  originalName: string
  mimeType: string
  url: string
  size?: number
  createdAt?: string
}

export interface ClientProfile {
  id: number
  fullName: string | null
  iin: string | null
  channel: Channel
  whatsappPhone: string | null
  telegramUserId: number | null
  telegramUsername: string | null
  organization: Organization | null
  createdAt: string
}

export interface AssignedEmployee {
  id: number
  name: string
}

export interface ExternalMessage {
  id: number
  direction: MessageDirection
  messageType: MessageType
  content: string | null
  file: FileAttachment | null
  waMessageId: string | null
  tgMessageId: number | null
  isForwarded: boolean
  sentAt: string
}

export interface ExternalChat {
  id: number
  channel: Channel
  status: ChatStatus
  lastMessageAt: string | null
  createdAt: string
  client: ClientProfile
  assignedEmployee: AssignedEmployee | null
}

export interface MemberShort {
  id: number
  name: string
}

export interface InternalMessage {
  id: number
  chatId: number
  senderId: number | null
  senderName: string | null
  content: string | null
  messageType: InternalMessageType
  file: FileAttachment | null
  isForwarded: boolean
  sentAt: string
}

export interface InternalChat {
  id: number
  type: InternalChatType
  name: string | null
  members: MemberShort[]
  createdAt: string
}

export interface QuickPhrase {
  id: number
  title: string
  body: string
  createdBy: number | null
  createdAt: string
}

// WebSocket event shapes
export interface WsExternalMessageEvent {
  type: 'external:message:new'
  chatId: number
  message: ExternalMessage
}

export interface WsOnboardingDoneEvent {
  type: 'client:onboarding:done'
  chatId: number
  clientId: number
  clientName: string
  channel: Channel
}

export interface WsInternalMessageEvent {
  type: 'internal:message:new'
  chatId: number
  message: InternalMessage
}

export type WsEvent = WsExternalMessageEvent | WsOnboardingDoneEvent | WsInternalMessageEvent
