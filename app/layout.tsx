import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import SiteFooter from '@/components/site-footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Conflux — Local-first collaborative editor',
  description:
    'A local-first, collaborative document editor with offline sync, deterministic CRDT conflict resolution, and granular version history.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
