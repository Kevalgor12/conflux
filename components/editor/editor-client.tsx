'use client'

import dynamic from 'next/dynamic'
import type { DocumentRole } from '@/lib/sync/types'
import type { UserIdentity } from '@/lib/sync/identity'

// The editor touches IndexedDB + Yjs, so it must run in the browser only (no SSR).
// ssr:false dynamic imports are allowed inside client components.
const EditorPanel = dynamic(() => import('./editor-panel'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-muted-foreground">
      Loading editor…
    </div>
  )
})

interface EditorClientProps {
  documentId: string
  title: string
  role: DocumentRole
  user: UserIdentity
}

export default function EditorClient({ documentId, title, role, user }: EditorClientProps) {
  return <EditorPanel documentId={documentId} title={title} role={role} user={user} />
}
