import { Router, Request, Response } from 'express'
import { chatWithArticle } from '../services/groq'
import { validateBody, chatSchema } from '../middleware/validate'

// POST /api/chat  { message, articleContent, lang }
// Groq proxy for the per-article "Ask AI" chat (CLAUDE.md feature 3).
// Keeps GROQ_API_KEY server-side — it is never exposed to the client.
// Rate-limited by chatLimiter at the mount point (index.ts) BEFORE validation,
// so even malformed floods count against the bucket.
export const chatRouter = Router()

chatRouter.post('/', validateBody(chatSchema), async (req: Request, res: Response) => {
  const { message, articleContent, lang } = req.body as {
    message: string
    articleContent: string
    lang: string
  }

  try {
    const reply = await chatWithArticle(message, articleContent, lang)
    if (!reply) {
      return res.status(502).json({ success: false, message: 'No response from AI' })
    }
    return res.json({ success: true, data: { reply } })
  } catch (err: any) {
    console.error('[POST /api/chat]', err?.message)
    return res.status(500).json({ success: false, message: 'AI chat failed' })
  }
})
