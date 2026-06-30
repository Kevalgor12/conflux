'use client'

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  fetchVersions,
  fetchVersionContent,
  saveVersion,
  restoreVersion,
  type VersionListItem
} from '@/lib/versions/client'
import VersionPreview from './version-preview'
import { streamAi } from '@/lib/ai/stream-client'

interface VersionHistoryProps {
  documentId: string
  editor: Editor | null
  canEdit: boolean
  aiEnabled: boolean
  open: boolean
  onClose: () => void
}

export default function VersionHistory({
  documentId,
  editor,
  canEdit,
  aiEnabled,
  open,
  onClose
}: VersionHistoryProps) {
  // State
  const [versions, setVersions] = useState<VersionListItem[]>([])
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ id: string; label: string; content: unknown } | null>(
    null
  )
  const [explain, setExplain] = useState('')
  const [explaining, setExplaining] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  const load = async () => setVersions(await fetchVersions(documentId))

  // Load the timeline when the panel opens
  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId])

  // Modal behaviour: move focus into the panel on open and close on Escape.
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSave = async () => {
    if (!editor) return
    setSaving(true)
    setError('')
    try {
      await saveVersion(documentId, label.trim() || 'Untitled version', editor.getJSON())
      setLabel('')
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
    setSaving(false)
  }

  const handlePreview = async (version: VersionListItem) => {
    if (!version.id) return
    setError('')
    try {
      const content = await fetchVersionContent(documentId, version.id)
      setPreview({ id: version.id, label: version.label, content })
      setExplain('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleExplain = async () => {
    if (!editor || !preview) return
    setExplaining(true)
    setExplain('')
    setError('')
    try {
      await streamAi(
        '/api/ai/diff',
        { documentId, versionId: preview.id, currentText: editor.getText() },
        (chunk) => setExplain((prev) => prev + chunk)
      )
    } catch (e) {
      setError((e as Error).message)
    }
    setExplaining(false)
  }

  const handleRestore = async (version: VersionListItem) => {
    if (!editor) return
    const ok = window.confirm(
      `Restore "${version.label}"? Your current version is saved first, so you can undo this.`
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await restoreVersion(editor, documentId, version)
      setPreview(null)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  if (!open) return null

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Version history"
      tabIndex={-1}
      className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">Version history</h2>
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label="Close version history"
        >
          ✕
        </button>
      </div>

      {/* Save row (Editor/Owner only) */}
      {canEdit && (
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Version label (e.g. First draft)"
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {error && (
        <p className="px-5 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No saved versions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {versions.map((version) => (
              <li key={version.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{version.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {version.createdByName || 'Unknown'}
                      {version.createdAt
                        ? ` · ${new Date(version.createdAt).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handlePreview(version)}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Preview
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleRestore(version)}
                        disabled={busy}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Preview pane */}
      {preview && (
        <div className="max-h-[40%] overflow-y-auto border-t border-border px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Preview — {preview.label}</p>
            {aiEnabled && editor && (
              <button
                onClick={handleExplain}
                disabled={explaining}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
              >
                {explaining ? 'Explaining…' : 'Explain changes vs current'}
              </button>
            )}
          </div>
          <VersionPreview key={preview.id} content={preview.content} />
          {explain && (
            <div className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
              {explain}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
