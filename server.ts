import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'
import { attachRealtime } from './lib/realtime'

// Load .env into process.env so the custom server sees PORT etc. (Next loads it too).
try {
  process.loadEnvFile('.env')
} catch {
  // no .env file — rely on the ambient environment (e.g. on Railway)
}

// Custom Next.js server. This is what makes Conflux a *single* Next.js 16 app that
// also owns the realtime layer: the WebSocket sync server is attached to this same
// HTTP server in M2 (server.on('upgrade', ...)). See docs/02 + docs/03 ADR-4.
const dev = process.env.NODE_ENV !== 'production'
const port = Number(process.env.PORT) || 3000

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true)
    handle(req, res, parsedUrl)
  })

  // Realtime WebSocket layer (rooms, CRDT sync, presence) on the same HTTP server.
  attachRealtime(server)

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`▲ Conflux ready on http://localhost:${port} (dev=${dev})`)
  })
})
