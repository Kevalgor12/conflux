import type { Editor } from '@tiptap/react'
import type { VersionListItem } from '@/lib/dtos/version'

export type { VersionListItem }

// The version timeline (metadata only).
export const fetchVersions = async (documentId: string): Promise<VersionListItem[]> => {
  const res = await fetch(`/api/documents/${documentId}/versions`)
  if (!res.ok) return []
  const json = await res.json()
  return (json?.data as VersionListItem[]) ?? []
}

// One version's ProseMirror JSON content (for preview / restore target).
export const fetchVersionContent = async (
  documentId: string,
  versionId: string
): Promise<unknown> => {
  const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`)
  if (!res.ok) throw new Error('Failed to load version')
  const json = await res.json()
  return json?.data?.content ?? null
}

// Save the current editor content as a new version.
export const saveVersion = async (documentId: string, label: string, content: unknown) => {
  const res = await fetch(`/api/documents/${documentId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, content })
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new Error(json?.message || 'Failed to save version')
  }
  return res.json()
}

// Non-destructive restore: snapshot the current content first (so it's reversible),
// then replace the live doc with the target via setContent — a *forward transaction*
// that syncs to every collaborator through Yjs and never rewinds shared history.
export const restoreVersion = async (
  editor: Editor,
  documentId: string,
  version: VersionListItem
) => {
  if (!version.id) return
  const current = editor.getJSON()
  // Fetch the target first: if it fails, we haven't written an orphan "Before restore"
  // snapshot. Only once we have the target do we snapshot the current state, then apply.
  const target = await fetchVersionContent(documentId, version.id)
  await saveVersion(documentId, `Before restore: ${version.label}`.slice(0, 120), current)
  editor.commands.setContent(target as never, { emitUpdate: true })
}
