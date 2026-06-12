import { Router, Request, Response } from 'express'
import { chatWithArticle, chatWithArticleHistory, type ChatTurn } from '../services/groq'
import { validateBody, chatSchema } from '../middleware/validate'

// POST /api/chat  { message, articleContent, lang, messages? }
// Groq proxy for the per-article "Ask AI" chat. With `messages` (prior turns)
// the conversation is replayed for multi-turn answers; without it the body is
// served by the exact legacy single-turn path. Keeps GROQ_API_KEY server-side.
// Rate-limited by chatLimiter at the mount point (index.ts) BEFORE validation,
// so even malformed floods count against the bucket.
export const chatRouter = Router()

chatRouter.post('/', validateBody(chatSchema), async (req: Request, res: Response) => {
  const { message, articleContent, lang, messages } = req.body as {
    message: string
    articleContent: string
    lang: string
    messages?: ChatTurn[]
  }

  try {
    const reply =
      messages && messages.length > 0
        ? await chatWithArticleHistory(
            [...messages, { role: 'user', content: message }],
            articleContent,
            lang
          )
        : await chatWithArticle(message, articleContent, lang)
    if (!reply) {
      return res.status(502).json({ success: false, message: 'No response from AI' })
    }
    return res.json({ success: true, data: { reply } })
  } catch (err: any) {
    console.error('[POST /api/chat]', err?.message)
    return res.status(500).json({ success: false, message: 'AI chat failed' })
  }
})
