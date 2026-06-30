import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDocument } from '@/lib/services/document.service'
import { identityFromUser } from '@/lib/sync/identity'
import EditorClient from '@/components/editor/editor-client'
import type { DocumentRole } from '@/lib/sync/types'

// Editor route. Server Component: authenticate, resolve the caller's role (also
// proves access), then hand off to the client-only editor.
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  const result = await getDocument(session.user.id, id).catch(() => null)
  if (!result) redirect('/documents') // no access or not found

  const data = result.data as { title: string; role: DocumentRole }
  const user = identityFromUser(session.user.name || session.user.email || 'You', session.user.id)

  return <EditorClient documentId={id} title={data.title} role={data.role} user={user} />
}
