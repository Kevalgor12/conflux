import { test, expect } from '@playwright/test'
import { signIn, openDemoDoc, editor, typeInEditor } from './helpers'

// Local-first: edits made while offline apply immediately to the local document, then
// converge to other clients once connectivity returns (deterministic CRDT merge).
test('offline edits apply locally and sync on reconnect', async ({ browser }) => {
  const ownerCtx = await browser.newContext()
  const editorCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  const editorPage = await editorCtx.newPage()

  await signIn(ownerPage, 'owner@demo.test')
  await signIn(editorPage, 'editor@demo.test')
  await openDemoDoc(ownerPage)
  await openDemoDoc(editorPage)
  await ownerPage.waitForTimeout(1500)

  // Go offline and edit — must still work locally.
  await ownerCtx.setOffline(true)
  const marker = `OFFLINE-${Date.now()}`
  await typeInEditor(ownerPage, marker)
  await expect(editor(ownerPage)).toContainText(marker)

  // Reconnect — the offline edit propagates to the other client.
  await ownerCtx.setOffline(false)
  await expect(editor(editorPage)).toContainText(marker, { timeout: 25_000 })

  await ownerCtx.close()
  await editorCtx.close()
})
