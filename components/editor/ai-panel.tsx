'use client'

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { streamAi } from '@/lib/ai/stream-client'

interface AiPanelProps {
  documentId: string
  editor: Editor | null
  open: boolean
  onClose: () => void
}

// Slide-over AI assistant. Streams a faithful summary of the current document.
export default function AiPanel({ documentId, editor, open, onClose }: AiPanelProps) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

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

  const summarize = async () => {
    if (!editor) return
    setLoading(true)
    setError('')
    setSummary('')
    try {
      await streamAi('/api/ai/summarize', { documentId, text: editor.getText() }, (chunk) =>
        setSummary((prev) => prev + chunk)
      )
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  if (!open) return null

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="AI assistant"
      tabIndex={-1}
      className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl outline-none"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">AI assistant</h2>
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label="Close AI assistant"
        >
          ✕
        </button>
      </div>

      <div className="border-b border-border px-5 py-3">
        <button
          onClick={summarize}
          disabled={loading}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Summarizing…' : 'Summarize document'}
        </button>
      </div>

      {error && (
        <p className="px-5 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite" aria-busy={loading}>
        {summary ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a faithful summary of the current document. Nothing is sent unless you ask.
          </p>
        )}
      </div>
    </aside>
  )
}
