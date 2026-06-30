'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { useConfluxDoc } from '@/lib/sync/use-conflux-doc'
import type { DocumentRole } from '@/lib/sync/types'
import type { UserIdentity } from '@/lib/sync/identity'
import SyncStatus from './sync-status'
import PresenceAvatars from './presence-avatars'
import VersionHistory from './version-history'
import AiPanel from './ai-panel'
import { aiEnabled } from '@/lib/ai/stream-client'

interface EditorPanelProps {
  documentId: string
  title: string
  role: DocumentRole
  user: UserIdentity
}

export default function EditorPanel({ documentId, title, role, user }: EditorPanelProps) {
  const readOnly = role === 'VIEWER'

  // State
  const [showHistory, setShowHistory] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const showAiFeatures = aiEnabled()

  // Local-first stack: Y.Doc <-> IndexedDB <-> realtime provider
  const { doc, provider, syncState } = useConfluxDoc(documentId, user)

  // Editor bound to the CRDT. Yjs owns history; viewers get a non-editable view.
  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !readOnly,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        // Pass the identity so the caret/presence awareness has a real name+colour
        // (otherwise it seeds a nameless default user).
        CollaborationCaret.configure({ provider, user })
      ],
      editorProps: {
        attributes: {
          class: 'ProseMirror-conflux focus:outline-none',
          'aria-label': 'Document editor'
        }
      }
    },
    [doc, provider, readOnly]
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3 truncate">
          <Link href="/documents" className="text-sm text-muted-foreground hover:text-foreground">
            ← Documents
          </Link>
          <span className="truncate text-sm font-medium">{title}</span>
          {readOnly && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              View only
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <PresenceAvatars awareness={provider.awareness} />
          {showAiFeatures && (
            <button
              onClick={() => setShowAi(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              AI
            </button>
          )}
          <button
            onClick={() => setShowHistory(true)}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            History
          </button>
          <SyncStatus state={readOnly ? 'readonly' : syncState} />
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 px-6 py-8">
        <EditorContent editor={editor} />
      </div>

      {/* Version history (slide-over) */}
      <VersionHistory
        documentId={documentId}
        editor={editor}
        canEdit={!readOnly}
        aiEnabled={showAiFeatures}
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {/* AI assistant (slide-over) */}
      {showAiFeatures && (
        <AiPanel
          documentId={documentId}
          editor={editor}
          open={showAi}
          onClose={() => setShowAi(false)}
        />
      )}
    </div>
  )
}
