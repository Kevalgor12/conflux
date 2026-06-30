import * as fc from 'fast-check'
import * as Y from 'yjs'
import { applyUpdate, diffUpdate, encodeState, encodeStateVector } from './sync'

// These tests encode the *guarantees* from docs/06 — not just examples.

interface Op {
  pos: number
  text: string
}

// Apply a list of inserts to a doc as a given client.
const applyOps = (doc: Y.Doc, clientId: number, ops: Op[]) => {
  doc.clientID = clientId
  const ytext = doc.getText('content')
  for (const op of ops) {
    const at = Math.min(op.pos, ytext.length)
    ytext.insert(at, op.text)
  }
}

const opArb = fc.array(
  fc.record({ pos: fc.nat(20), text: fc.string({ minLength: 1, maxLength: 4 }) }),
  { maxLength: 12 }
)

describe('CRDT sync invariants', () => {
  test('two replicas converge regardless of order, with no data loss', () => {
    fc.assert(
      fc.property(opArb, opArb, (opsA, opsB) => {
        // Two offline replicas of the same empty doc, edited concurrently
        const a = new Y.Doc()
        const b = new Y.Doc()
        applyOps(a, 1, opsA)
        applyOps(b, 2, opsB)

        // Exchange only the deltas each is missing (state-vector handshake)
        const aMissing = diffUpdate(a, encodeStateVector(b))
        const bMissing = diffUpdate(b, encodeStateVector(a))
        applyUpdate(b, aMissing)
        applyUpdate(a, bMissing)

        // Converged + byte-identical
        expect(a.getText('content').toString()).toBe(b.getText('content').toString())
        expect(Array.from(encodeState(a))).toEqual(Array.from(encodeState(b)))
      })
    )
  })

  test('applying the same update twice is a no-op (idempotent)', () => {
    const a = new Y.Doc()
    applyOps(a, 1, [{ pos: 0, text: 'hello' }])
    const update = encodeState(a)

    const b = new Y.Doc()
    applyUpdate(b, update)
    const once = b.getText('content').toString()
    applyUpdate(b, update) // duplicate delivery (flaky network)
    const twice = b.getText('content').toString()

    expect(once).toBe('hello')
    expect(twice).toBe('hello')
  })

  test('concurrent edit vs delete keeps both contributions (no overwrite)', () => {
    // Base doc: "Hi"
    const base = new Y.Doc()
    base.clientID = 1
    base.getText('content').insert(0, 'Hi')
    const baseState = encodeState(base)

    const alice = new Y.Doc()
    alice.clientID = 10
    const bob = new Y.Doc()
    bob.clientID = 20
    applyUpdate(alice, baseState)
    applyUpdate(bob, baseState)

    // Alice appends "!"; Bob rewrites the "i" -> "ey" (delete + insert)
    alice.getText('content').insert(2, '!')
    bob.getText('content').delete(1, 1)
    bob.getText('content').insert(1, 'ey')

    // Merge both directions
    applyUpdate(alice, diffUpdate(bob, encodeStateVector(alice)))
    applyUpdate(bob, diffUpdate(alice, encodeStateVector(bob)))

    const a = alice.getText('content').toString()
    const b = bob.getText('content').toString()

    expect(a).toBe(b) // converged
    expect(a).toContain('!') // Alice's insert survived
    expect(a).toContain('ey') // Bob's insert survived
  })
})
