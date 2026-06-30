// Client helper: POST to an AI route and stream the plain-text response chunk-by-chunk.
export const streamAi = async (
  url: string,
  body: unknown,
  onChunk: (text: string) => void
): Promise<void> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => null)
    throw new Error(json?.message || 'AI request failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}

// True when the UI should surface AI features (mirrors the server key being set).
export const aiEnabled = () => process.env.NEXT_PUBLIC_AI_ENABLED === 'true'
