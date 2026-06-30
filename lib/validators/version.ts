import { z } from 'zod'

const MAX_CONTENT_CHARS = 2_000_000 // ~2MB of serialized ProseMirror JSON (size guard)

// A saved version stores the editor's ProseMirror JSON (used for preview + restore).
export const createVersionSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(120, 'Label is too long'),
  content: z
    .unknown()
    .refine((value) => value !== null && typeof value === 'object', 'Invalid document content')
    .refine(
      (value) => JSON.stringify(value).length <= MAX_CONTENT_CHARS,
      'Document is too large to snapshot'
    )
})

export type CreateVersionInput = z.infer<typeof createVersionSchema>
