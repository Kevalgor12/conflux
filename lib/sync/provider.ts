import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { MESSAGE_SYNC, MESSAGE_AWARENESS } from '@/lib/realtime/messages'
import type { SyncState } from './types'

interface ProviderOptions {
  url: string
  onStatus?: (state: SyncState) => void
}

const MAX_BACKOFF_MS = 15000

// Conflux's own Yjs WebSocket provider. It speaks the same binary protocol as the
// server (lib/realtime) and owns the connect → handshake → sync → reconnect state
// machine that drives the connection-status UI. (See docs/05 §4.)
export class ConfluxSyncProvider {
  readonly doc: Y.Doc
  readonly documentId: string
  readonly awareness: awarenessProtocol.Awareness

  private url: string
  private onStatus?: (state: SyncState) => void
  private ws: WebSocket | null = null
  private shouldConnect = false
  private synced = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private state: SyncState = 'offline'

  constructor(doc: Y.Doc, documentId: string, options: ProviderOptions) {
    this.doc = doc
    this.documentId = documentId
    this.url = options.url
    this.onStatus = options.onStatus
    this.awareness = new awarenessProtocol.Awareness(doc)

    this.doc.on('update', this.handleDocUpdate)
    this.awareness.on('update', this.handleAwarenessUpdate)

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      window.addEventListener('beforeunload', this.handleBeforeUnload)
    }
  }

  get status() {
    return this.state
  }

  connect() {
    this.shouldConnect = true
    this.openSocket()
  }

  destroy() {
    this.shouldConnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.doc.off('update', this.handleDocUpdate)
    this.awareness.off('update', this.handleAwarenessUpdate)
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy')
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
    }
    this.closeSocket()
    this.awareness.destroy()
  }

  private setState(state: SyncState) {
    if (this.state === state) return
    this.state = state
    this.onStatus?.(state)
  }

  private buildUrl() {
    const base = this.url.replace(/\/$/, '')
    return `${base}/api/realtime?doc=${encodeURIComponent(this.documentId)}`
  }

  private openSocket() {
    if (!this.shouldConnect || this.ws) return
    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')

    const ws = new WebSocket(this.buildUrl())
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setState('syncing')
      this.sendSyncStep1()
      this.sendAwarenessState()
    }
    ws.onmessage = (event) => this.handleMessage(new Uint8Array(event.data as ArrayBuffer))
    ws.onclose = () => {
      this.ws = null
      this.synced = false
      this.setState('offline')
      this.scheduleReconnect()
    }
    ws.onerror = () => {
      // onclose fires next — reconnection is handled there.
    }
  }

  private closeSocket() {
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }
  }

  // Exponential backoff with jitter — avoids a thundering-herd reconnect after a blip.
  private scheduleReconnect() {
    if (!this.shouldConnect) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer) // never stack timers
    const delay =
      Math.min(1000 * 2 ** this.reconnectAttempts, MAX_BACKOFF_MS) + Math.random() * 1000
    this.reconnectAttempts++
    this.setState('reconnecting')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.openSocket()
    }, delay)
  }

  private sendSyncStep1() {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoder, this.doc)
    this.sendRaw(encoding.toUint8Array(encoder))
  }

  private sendAwarenessState() {
    if (!this.awareness.getLocalState()) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
    )
    this.sendRaw(encoding.toUint8Array(encoder))
  }

  private sendRaw(message: Uint8Array) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message)
    }
  }

  private handleMessage(data: Uint8Array) {
    const decoder = decoding.createDecoder(data)
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        // origin = this, so handleDocUpdate ignores updates we just received.
        const syncType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this)
        if (encoding.length(encoder) > 1) this.sendRaw(encoding.toUint8Array(encoder))
        // Receiving the server's step2 (the reply to our step1) means we're caught up.
        if (syncType === syncProtocol.messageYjsSyncStep2 && !this.synced) {
          this.synced = true
          this.setState('synced')
        }
        break
      }
      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          this
        )
        break
      }
    }
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return // applied from the server — don't echo it back
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      syncProtocol.writeUpdate(encoder, update)
      this.sendRaw(encoding.toUint8Array(encoder))
      if (this.synced) this.setState('synced')
    } else {
      // Offline: the edit is safe in the Y.Doc (+ IndexedDB) and reconciles via the
      // state-vector handshake on reconnect — nothing is lost.
      this.setState('offline')
    }
  }

  private handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return // came from a peer — don't rebroadcast
    const changed = changes.added.concat(changes.updated, changes.removed)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed)
    )
    this.sendRaw(encoding.toUint8Array(encoder))
  }

  private handleOnline = () => {
    if (!this.shouldConnect || this.ws) return
    // Cancel any pending backoff timer so we don't end up with two sockets.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.openSocket()
  }

  private handleOffline = () => {
    this.setState('offline')
  }

  private handleBeforeUnload = () => {
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'unload')
  }
}
