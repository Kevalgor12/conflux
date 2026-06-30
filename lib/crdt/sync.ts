import * as Y from 'yjs'

// Thin, testable wrappers around the Yjs sync primitives the sync engine relies on.
// Keeping them here (instead of calling Y.* inline) gives the sync engine and the
// property tests one place to target.

// Full materialised state of a doc (used for snapshots + cold loads).
export const encodeState = (doc: Y.Doc): Uint8Array => Y.encodeStateAsUpdate(doc)

// A compact summary of "what this replica has seen" (the basis of delta sync).
export const encodeStateVector = (doc: Y.Doc): Uint8Array => Y.encodeStateVector(doc)

// The exact updates `doc` has that a peer (described by its state vector) is missing.
export const diffUpdate = (doc: Y.Doc, remoteStateVector: Uint8Array): Uint8Array =>
  Y.encodeStateAsUpdate(doc, remoteStateVector)

// Apply a binary update. `origin` tags the transaction so the editor binding can
// ignore its own echoes (prevents feedback loops).
export const applyUpdate = (doc: Y.Doc, update: Uint8Array, origin?: unknown): void =>
  Y.applyUpdate(doc, update, origin)

// Merge many updates into one (used during compaction).
export const mergeUpdates = (updates: Uint8Array[]): Uint8Array => Y.mergeUpdates(updates)
