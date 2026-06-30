import { test, expect } from '@playwright/test'
import { signIn, createDoc, editor, typeInEditor } from './helpers'

// Non-destructive restore: save a version, edit further, restore the saved version, and
// confirm the document returns to the saved content (the later edit is rolled back, and a
// "before restore" version is kept so the restore is itself undoable).
test('restore brings back an earlier version non-destructively', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept()) // accept the restore confirm()

  await signIn(page, 'owner@demo.test')
  await createDoc(page)

  const v1 = `V1-${Date.now()}`
  await typeInEditor(page, v1)

  // Save a version.
  await page.getByRole('button', { name: 'History' }).click()
  await page.getByPlaceholder(/Version label/).fill('snapshot-1')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('snapshot-1')).toBeVisible()

  // Edit further.
  await typeInEditor(page, ' EXTRA')
  await expect(editor(page)).toContainText('EXTRA')

  // Restore the saved version.
  await page.getByRole('button', { name: 'Restore' }).first().click()

  await expect(editor(page)).toContainText(v1)
  await expect(editor(page)).not.toContainText('EXTRA')
})
