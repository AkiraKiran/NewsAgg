import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function generateSummaryGroq(title: string, content: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    messages: [{
      role: 'user',
      content: `Summarize in 2-3 sentences: ${title}\n\n${content.slice(0, 2000)}`
    }],
    model: 'llama3-8b-8192',
    max_tokens: 150
  })
  return completion.choices[0]?.message?.content?.trim() || ''
}

// Human-readable names so the model answers in the user's selected language.
// Codes match what the client sends (see ArticleChat.tsx LANG_CODE map).
const CHAT_LANG_NAMES: Record<string, string> = {
  en: 'English',
  id: 'Indonesian (Bahasa Indonesia)',
  'zh-CN': 'Simplified Chinese (简体中文)',
  'zh-TW': 'Traditional Chinese (繁體中文)',
}

// Per-article AI chat (CLAUDE.md feature 3). CLAUDE.md specifies
// llama-3.1-70b-versatile, which Groq has decommissioned; llama-3.3-70b-versatile
// is its current successor (verified available on the live key). The article text
// is supplied as system context so answers stay grounded in the article.
export async function chatWithArticle(
  message: string,
  articleContent: string,
  lang: string
): Promise<string> {
  const langName = CHAT_LANG_NAMES[lang] ?? 'English'
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content:
          `You are a helpful assistant answering questions about a single news article. ` +
          `Base your answers only on the article below. If the answer is not in the article, ` +
          `say so plainly instead of guessing. Be concise and factual. Always respond in ${langName}.\n\n` +
          `--- ARTICLE ---\n${articleContent.slice(0, 6000)}`,
      },
      { role: 'user', content: message },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() || ''
}
