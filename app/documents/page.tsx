import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listDocuments } from '@/lib/services/document.service'
import NewDocumentButton from '@/components/new-document-button'
import SignOutButton from '@/components/sign-out-button'
import type { DocumentListItem } from '@/lib/dtos/document'

const roleBadge: Record<string, string> = {
  OWNER: 'bg-primary text-primary-foreground',
  EDITOR: 'bg-muted text-foreground',
  VIEWER: 'bg-muted text-muted-foreground'
}

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  const result = await listDocuments(session.user.id)
  const documents = (result.data as DocumentListItem[]) ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your documents</h1>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <NewDocumentButton />
          <SignOutButton />
        </div>
      </header>

      {/* List */}
      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          No documents yet. Create your first one.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="truncate font-medium">{doc.title || 'Untitled'}</span>
                <span className="flex items-center gap-3">
                  {doc.updatedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[doc.role ?? ''] || 'bg-muted'}`}
                  >
                    {doc.role}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
