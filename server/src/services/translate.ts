import { GoogleGenerativeAI } from '@google/generative-ai'

// Server-side translation service. Gemini 2.0 Flash is the primary provider;
// Lingva (no API key) is the fallback. GEMINI_API_KEY is read from the server
// env only — it is never sent to the client (see CLAUDE.md secret rules).
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
// CLAUDE.md specifies Gemini 2.0 Flash. (gemini-1.5-flash 404s on this key's
// API version — it's been retired; 2.0-flash is the current free-tier model.)
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })

export type ApiLang = 'en' | 'id' | 'zh-CN' | 'zh-TW'
export const SUPPORTED_LANGS: ApiLang[] = ['en', 'id', 'zh-CN', 'zh-TW']

// Human-readable names used in the Gemini prompt.
const LANG_NAMES: Record<ApiLang, string> = {
  en: 'English',
  id: 'Indonesian (Bahasa Indonesia)',
  'zh-CN': 'Simplified Chinese (简体中文)',
  'zh-TW': 'Traditional Chinese (繁體中文)',
}

// Lingva uses Google-Translate-style codes; Traditional Chinese is zh_HANT.
const LINGVA_CODE: Record<ApiLang, string> = {
  en: 'en',
  id: 'id',
  'zh-CN': 'zh',
  'zh-TW': 'zh_HANT',
}

export interface TranslatableFields {
  title: string | null
  description: string | null
  content: string | null
  aiSummary: string | null
}

export type TranslationProvider = 'gemini' | 'lingva' | 'none'

export interface TranslationResult extends TranslatableFields {
  provider: TranslationProvider
}

const FIELD_KEYS = ['title', 'description', 'content', 'aiSummary'] as const

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0

// ─── Gemini (primary) ─────────────────────────────────────────────────────────

async function translateWithGemini(
  fields: TranslatableFields,
  targetLang: ApiLang
): Promise<TranslatableFields> {
  const payload: Record<string, string> = {}
  for (const key of FIELD_KEYS) {
    if (hasText(fields[key])) payload[key] = fields[key] as string
  }
  // Nothing translatable — return originals unchanged.
  if (Object.keys(payload).length === 0) return { ...fields }

  const prompt = `Translate the VALUES of the following JSON object into ${LANG_NAMES[targetLang]}.
Keep the exact same keys. Translate faithfully and naturally; do not summarise, omit, or add commentary.
Preserve line breaks within values. Return ONLY a valid JSON object with the same keys.
JSON:
${JSON.stringify(payload)}`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  const parsed = JSON.parse(result.response.text().trim()) as Record<string, unknown>
  const out: TranslatableFields = { title: null, description: null, content: null, aiSummary: null }
  for (const key of FIELD_KEYS) {
    if (!hasText(fields[key])) {
      out[key] = fields[key]
      continue
    }
    const value = parsed[key]
    out[key] = hasText(value as string) ? (value as string) : fields[key]
  }
  return out
}

// ─── Lingva (fallback) ──────────────────────────────────────────────────────

async function lingvaField(text: string, target: string): Promise<string | null> {
  // 'auto' source lets Lingva detect the article's language.
  const url = `https://lingva.ml/api/v1/auto/${target}/${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Lingva HTTP ${res.status}`)
  const data = (await res.json()) as { translation?: string }
  return hasText(data.translation) ? (data.translation as string) : null
}

async function translateWithLingva(
  fields: TranslatableFields,
  targetLang: ApiLang
): Promise<TranslatableFields> {
  const target = LINGVA_CODE[targetLang]
  const out: TranslatableFields = { title: null, description: null, content: null, aiSummary: null }
  for (const key of FIELD_KEYS) {
    const original = fields[key]
    if (!hasText(original)) {
      out[key] = original
      continue
    }
    try {
      out[key] = (await lingvaField(original, target)) ?? original
    } catch {
      // One field failing must not drop the rest — keep the original.
      out[key] = original
    }
  }
  return out
}

// ─── Public entry point ─────────────────────────────────────────────────────

/**
 * Translate an article's fields into `targetLang`. Tries Gemini first, falls
 * back to Lingva, and on total failure returns the originals with provider
 * 'none' (so the caller can avoid caching a non-translation).
 */
export async function translateArticleFields(
  fields: TranslatableFields,
  targetLang: ApiLang
): Promise<TranslationResult> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const g = await translateWithGemini(fields, targetLang)
      return { ...g, provider: 'gemini' }
    } catch (err) {
      console.error('[translate] Gemini failed, falling back to Lingva:', (err as Error).message)
    }
  }

  try {
    const l = await translateWithLingva(fields, targetLang)
    return { ...l, provider: 'lingva' }
  } catch (err) {
    console.error('[translate] Lingva failed:', (err as Error).message)
  }

  return { ...fields, provider: 'none' }
}
