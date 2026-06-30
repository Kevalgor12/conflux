// Global footer — required by the submission guidelines (name + GitHub + LinkedIn).
const author = {
  name: 'Keval Gor',
  github: 'https://github.com/Kevalgor12',
  linkedin: 'https://www.linkedin.com/in/keval-gor/'
}

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-5 text-sm text-muted-foreground sm:flex-row">
        <p>
          Built by <span className="font-medium text-foreground">{author.name}</span> — Conflux
        </p>
        <nav className="flex items-center gap-4">
          <a
            href={author.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href={author.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  )
}
