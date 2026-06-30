import { test, expect } from '@playwright/test'
import { signIn, openDemoDoc, editor, typeInEditor } from './helpers'

// Two clients editing the same document see each other's changes (real-time CRDT sync).
test('edits converge across two clients', async ({ browser }) => {
  const ownerCtx = await browser.newContext()
  const editorCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  const editorPage = await editorCtx.newPage()

  await signIn(ownerPage, 'owner@demo.test')
  await signIn(editorPage, 'editor@demo.test')
  await openDemoDoc(ownerPage)
  await openDemoDoc(editorPage)

  // Let both finish the initial sync handshake.
  await ownerPage.waitForTimeout(1500)

  const marker = `OWNER-${Date.now()}`
  await typeInEditor(ownerPage, marker)

  await expect(editor(editorPage)).toContainText(marker, { timeout: 20_000 })

  await ownerCtx.close()
  await editorCtx.close()
})
