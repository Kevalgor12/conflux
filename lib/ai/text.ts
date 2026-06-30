// Extract plain text from a ProseMirror JSON node (for AI input).
const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'])

interface PMNode {
  type?: string
  text?: string
  content?: PMNode[]
}

export const extractText = (node: unknown): string => {
  const pm = node as PMNode | null
  if (!pm) return ''
  if (pm.type === 'text') return pm.text || ''
  const inner = Array.isArray(pm.content) ? pm.content.map(extractText).join('') : ''
  return pm.type && BLOCK_TYPES.has(pm.type) ? `${inner}\n` : inner
}
