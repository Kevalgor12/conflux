import Link from 'next/link'

// Marketing / landing page (static).
const features = [
  {
    title: 'Local-first',
    body: 'Your document lives in the browser. Open, edit and close with zero network requests blocking the UI — even fully offline.'
  },
  {
    title: 'Deterministic merge',
    body: 'Concurrent edits reconcile with a CRDT — no lost work, no "resolve conflict" dialog, the same result on every device.'
  },
  {
    title: 'Time travel',
    body: 'Capture snapshots, browse the timeline, and restore any past version safely — without corrupting the live document for collaborators.'
  }
]

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-20">
      {/* Hero */}
      <section className="flex flex-col gap-4">
        <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Local-first · Collaborative · Versioned
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Conflux</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          A collaborative document editor that works offline, merges concurrent edits without data
          loss, and lets you travel through a document&apos;s full history.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href="/documents"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-2 text-base font-semibold">{feature.title}</h2>
            <p className="text-sm text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
