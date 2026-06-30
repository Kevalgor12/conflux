'use client'

import { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { ConfluxSyncProvider } from './provider'
import { createIdentity, type UserIdentity } from './identity'
import type { SyncState } from './types'

const DB_PREFIX = 'conflux-doc-'

// One hook that wires the full local-first stack for a document:
//   Y.Doc  <->  IndexedDB (local source of truth)  <->  ConfluxSyncProvider (server)
// Runs in the browser only (the editor that calls it is loaded with ssr:false).
export const useConfluxDoc = (documentId: string, identity?: UserIdentity) => {
  const [syncState, setSyncState] = useState<SyncState>('connecting')

  const bundle = useMemo(() => {
    const doc = new Y.Doc()
    const persistence = new IndexeddbPersistence(`${DB_PREFIX}${documentId}`, doc)
    // Default to the page's own origin so the app works on any domain with no
    // build-time config — and use wss:// on HTTPS pages (ws:// would be blocked as
    // mixed content). NEXT_PUBLIC_WS_URL only needs setting if the socket lives elsewhere.
    const sameOrigin =
      typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
        : 'ws://localhost:3000'
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || sameOrigin
    const provider = new ConfluxSyncProvider(doc, documentId, {
      url: wsUrl,
      onStatus: setSyncState
    })
    provider.awareness.setLocalStateField('user', identity ?? createIdentity())
    return { doc, persistence, provider }
    // identity is captured once per document mount (intentional).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  // Connect on mount; tear everything down on unmount (free memory + sockets).
  useEffect(() => {
    bundle.provider.connect()
    return () => {
      bundle.provider.destroy()
      bundle.persistence.destroy()
      bundle.doc.destroy()
    }
  }, [bundle])

  return { doc: bundle.doc, provider: bundle.provider, syncState }
}
