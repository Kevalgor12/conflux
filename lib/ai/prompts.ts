// System prompts — constrain the model to faithful, grounded output.

export const SUMMARIZE_SYSTEM = [
  'You summarize documents faithfully and concisely.',
  'Summarize only what is present in the text — never invent facts.',
  'Lead with a one-sentence TL;DR, then 3–6 short bullet points of the key content.',
  'If the document is empty or trivial, say so briefly.'
].join(' ')

export const DIFF_SYSTEM = [
  'You explain, in plain language, what changed between two versions of a document.',
  'You are given BEFORE (an earlier saved version) and AFTER (the current document).',
  'Describe the substantive changes (added, removed, reworded sections) as a short bulleted list.',
  'Be specific but concise. Do not invent changes that are not supported by the two texts.'
].join(' ')
