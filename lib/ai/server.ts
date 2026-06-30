import { createGoogleGenerativeAI } from '@ai-sdk/google'

// AI is strictly additive — the app works fully without a key (feature flag).
export const isAiEnabled = () => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)

const provider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
})

// Model tiers (confirm the exact ids against the current Google AI catalog; overridable via env).
const MODELS = {
  flash: process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash', // fast/cheap: inline, naming
  pro: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro' // quality: summaries, diff explanations
}

export const aiModel = (tier: 'flash' | 'pro') => provider(MODELS[tier])
