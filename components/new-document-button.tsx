'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Creates a document via the REST API (caller becomes Owner) and opens it.
export default function NewDocumentButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const createDocument = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const json = await res.json()
      if (res.ok && json?.data?.id) {
        router.push(`/documents/${json.data.id}`)
        return
      }
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={createDocument}
      disabled={loading}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? 'Creating…' : 'New document'}
    </button>
  )
}
