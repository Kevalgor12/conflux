import { z } from 'zod'

const MAX_TEXT = 200_000 // bound the text we send to the model

export const summarizeSchema = z.object({
  documentId: z.string().min(1),
  text: z.string().min(1, 'Nothing to summarize').max(MAX_TEXT)
})

export const diffExplainSchema = z.object({
  documentId: z.string().min(1),
  versionId: z.string().min(1),
  currentText: z.string().max(MAX_TEXT)
})

export type SummarizeInput = z.infer<typeof summarizeSchema>
export type DiffExplainInput = z.infer<typeof diffExplainSchema>
