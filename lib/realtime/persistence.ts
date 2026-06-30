import * as Y from 'yjs'
import { prisma } from '../db'
import { snapshotKind } from '../constants'

// Sentinel origin so updates we *load* from the DB aren't re-persisted or
// re-broadcast as if they were brand-new edits.
export const PERSISTENCE_ORIGIN = 'conflux-persistence'

// Load a document's durable state into a Y.Doc: the latest compaction snapshot
// (if any) plus every update since. Best-effort — if the DB is unreachable the
// room still works fully in-memory (local-first means clients are the truth).
export const loadDoc = async (documentId: string, doc: Y.Doc): Promise<void> => {
  try {
    const compaction = await prisma.documentSnapshot.findFirst({
      where: { documentId, kind: snapshotKind.COMPACTION },
      orderBy: { createdAt: 'desc' }
    })
    if (compaction?.state) {
      Y.applyUpdate(doc, new Uint8Array(compaction.state), PERSISTENCE_ORIGIN)
    }

    const updates = await prisma.documentUpdate.findMany({
      where: { documentId },
      orderBy: { seq: 'asc' },
      select: { update: true }
    })
    for (const row of updates) {
      Y.applyUpdate(doc, new Uint8Array(row.update), PERSISTENCE_ORIGIN)
    }
  } catch (error) {
    console.error('[realtime] loadDoc failed (continuing in-memory):', (error as Error).message)
  }
}

// How many updates are in the append-only log for a document (drives compaction).
export const countUpdates = async (documentId: string): Promise<number> => {
  try {
    return await prisma.documentUpdate.count({ where: { documentId } })
  } catch {
    return 0
  }
}

// Fold the update log into a single COMPACTION snapshot and truncate the folded
// rows, so a cold load is O(recent) instead of O(history) — the "document state
// size over time" lever (docs/11). Safe ordering: write the snapshot first, then
// delete superseded rows (a crash between the two just leaves redundant-but-correct
// rows that re-apply idempotently). Keeps only the latest COMPACTION snapshot.
export const compactDocument = async (documentId: string, doc: Y.Doc): Promise<void> => {
  try {
    const last = await prisma.documentUpdate.findFirst({
      where: { documentId },
      orderBy: { seq: 'desc' },
      select: { seq: true }
    })
    if (last == null) return // nothing to compact

    const state = Buffer.from(Y.encodeStateAsUpdate(doc))
    const snapshot = await prisma.documentSnapshot.create({
      data: { documentId, label: 'compaction', kind: snapshotKind.COMPACTION, state }
    })
    await prisma.documentUpdate.deleteMany({ where: { documentId, seq: { lte: last.seq } } })
    await prisma.documentSnapshot.deleteMany({
      where: { documentId, kind: snapshotKind.COMPACTION, id: { not: snapshot.id } }
    })
  } catch (error) {
    console.error('[realtime] compaction failed:', (error as Error).message)
  }
}

// Append a (merged) update to the document's append-only log. Returns whether the
// write succeeded so the caller can re-queue on failure (avoids silently dropping
// already-acknowledged updates). A missing Document row (e.g. an unsaved demo doc)
// counts as a handled no-op (true) — there is nothing durable to retry into.
export const storeUpdate = async (documentId: string, update: Uint8Array): Promise<boolean> => {
  try {
    await prisma.documentUpdate.create({
      data: { documentId, update: Buffer.from(update) }
    })
    return true
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'P2003') {
      // Foreign-key failure: the Document doesn't exist (e.g. anonymous demo doc).
      // Nothing to retry into — treat as handled so we don't loop forever.
      return true
    }
    console.error('[realtime] storeUpdate failed (will retry):', (error as Error).message)
    return false
  }
}
