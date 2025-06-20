import { WebSocketMessage } from '@/types'

export class WebSocketService {
  private ws: WebSocket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectTimer: number | null = null
  private isConnecting = false

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return

    this.isConnecting = true
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port || '5173' // Vite dev server port
    
    // Connect to the API server through Vite's proxy
    const wsUrl = `${protocol}//${host}:${port}/ws`
    console.log('Connecting to WebSocket:', wsUrl)

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.emit('connected', true)
        this.clearReconnectTimer()
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnecting = false
        this.emit('connected', false)
        this.ws = null
        // Try to reconnect after 3 seconds
        this.scheduleReconnect()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.emit(message.type, message.data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        this.emit('error', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()
    this.reconnectTimer = window.setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...')
      this.connect()
    }, 3000)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  disconnect(): void {
    this.clearReconnectTimer()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(type: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Handle different message types
      if (type === 'subscribe' || type === 'unsubscribe') {
        this.ws.send(JSON.stringify({ type, projectId: data }))
      } else {
        this.ws.send(JSON.stringify({ type, data }))
      }
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  joinProject(projectId: string): void {
    this.send('subscribe', projectId)
  }

  leaveProject(projectId: string): void {
    this.send('unsubscribe', projectId)
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()