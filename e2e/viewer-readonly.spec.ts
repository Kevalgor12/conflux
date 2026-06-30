import { test, expect } from '@playwright/test'
import { signIn, openDemoDoc, editor } from './helpers'

// RBAC at the UI level: a Viewer gets a non-editable editor (writes are also rejected
// at the socket — see the realtime layer — so this is defense in depth, not the only gate).
test('viewer gets a read-only editor', async ({ page }) => {
  await signIn(page, 'viewer@demo.test')
  await openDemoDoc(page)

  await expect(page.getByText('View only')).toBeVisible()
  await expect(editor(page)).toHaveAttribute('contenteditable', 'false')
})
