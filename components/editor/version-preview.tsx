'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// Read-only render of a version's ProseMirror JSON (detached — not the live doc).
export default function VersionPreview({ content }: { content: unknown }) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [StarterKit],
    content: (content as never) ?? null
  })

  // Re-render when a different version is selected.
  useEffect(() => {
    if (editor && content) editor.commands.setContent(content as never)
  }, [editor, content])

  return (
    <div className="rounded-md border border-border bg-background p-3 text-sm">
      <EditorContent editor={editor} />
    </div>
  )
}
