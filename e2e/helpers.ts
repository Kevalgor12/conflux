import { expect, type Page } from '@playwright/test'

export const DEMO_PASSWORD = 'password123'

// The editable ProseMirror surface (see editor-panel.tsx).
export const editor = (page: Page) => page.locator('.ProseMirror-conflux')

export const signIn = async (page: Page, email: string, password = DEMO_PASSWORD) => {
  await page.goto('/sign-in')
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/documents')
}

export const openDemoDoc = async (page: Page) => {
  await page.goto('/documents')
  await page.getByRole('link', { name: /Welcome to Conflux/ }).click()
  await expect(editor(page)).toBeVisible()
}

// Create a fresh, empty Owner-only document and open it.
export const createDoc = async (page: Page) => {
  await page.goto('/documents')
  await page.getByRole('button', { name: 'New document' }).click()
  await page.waitForURL(/\/documents\/.+/)
  await expect(editor(page)).toBeVisible()
}

export const typeInEditor = async (page: Page, text: string) => {
  await editor(page).click()
  await page.keyboard.type(text)
}
