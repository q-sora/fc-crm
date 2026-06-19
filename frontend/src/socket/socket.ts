import type { WsEvent } from '@/types'

type Handler = (event: WsEvent) => void

let ws: WebSocket | null = null
const handlers = new Set<Handler>()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function connectWs(token: string): void {
  if (ws && ws.readyState === WebSocket.OPEN) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`)

  ws.onmessage = (e: MessageEvent) => {
    try {
      const event = JSON.parse(e.data) as WsEvent
      handlers.forEach((h) => h(event))
    } catch {
      // ignore malformed frames
    }
  }

  ws.onclose = () => {
    reconnectTimer = setTimeout(() => connectWs(token), 3000)
  }
}

export function disconnectWs(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  ws?.close()
  ws = null
}

export function subscribeWs(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}
