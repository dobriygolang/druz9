type MessageHandler = (data: unknown) => void

interface WsOptions {
  /** URL to connect to (ws:// or wss://) */
  url: string
  /** Called on every incoming JSON message */
  onMessage: MessageHandler
  /** Called when connection opens */
  onOpen?: () => void
  /** Called when connection closes */
  onClose?: (code: number, reason: string) => void
  /** Called on error */
  onError?: (err: Event) => void
  /** Auto-reconnect on disconnect (default: true) */
  reconnect?: boolean
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number
  /** Base reconnect delay in ms (default: 1000, exponential backoff) */
  reconnectDelay?: number
  /** Ping interval in ms (default: 30000) */
  pingInterval?: number
}

export class RealtimeSocket {
  private ws: WebSocket | null = null
  private opts: Required<WsOptions>
  private reconnectCount = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private disposed = false

  constructor(opts: WsOptions) {
    this.opts = {
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      pingInterval: 30000,
      onOpen: () => {},
      onClose: () => {},
      onError: () => {},
      ...opts,
    }
  }

  connect(): void {
    if (this.disposed) return
    this.cleanup()

    const ws = new WebSocket(this.opts.url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectCount = 0
      this.startPing()
      this.opts.onOpen!()
    }

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'pong') return
        this.opts.onMessage(data)
      } catch {
        // non-JSON message, ignore
      }
    }

    ws.onclose = (ev) => {
      this.stopPing()
      this.opts.onClose!(ev.code, ev.reason)
      if (!this.disposed && this.opts.reconnect) {
        this.scheduleReconnect()
      }
    }

    ws.onerror = (ev) => {
      this.opts.onError!(ev)
    }
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  close(): void {
    this.disposed = true
    this.cleanup()
    if (this.ws) {
      this.ws.close(1000, 'client_close')
      this.ws = null
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' })
    }, this.opts.pingInterval)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectCount >= this.opts.maxReconnectAttempts) return
    const delay = this.opts.reconnectDelay * Math.pow(2, this.reconnectCount)
    this.reconnectCount++
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, Math.min(delay, 30000))
  }

  private cleanup(): void {
    this.stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

/** Build ws/wss URL from a relative path */
export function buildWsUrl(path: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${path}`
}
