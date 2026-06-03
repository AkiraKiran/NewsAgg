import { Router, Request, Response } from 'express'
import { chatWithArticle } from '../services/groq'

// POST /api/chat  { message, articleContent, lang }
// Groq proxy for the per-article "Ask AI" chat (CLAUDE.md feature 3).
// Keeps GROQ_API_KEY server-side — it is never exposed to the client.
export const chatRouter = Router()

chatRouter.post('/', async (req: Request, res: Response) => {
  const { message, articleContent, lang } = req.body ?? {}

  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: "Field 'message' is required" })
  }

  try {
    const reply = await chatWithArticle(
      message.trim(),
      typeof articleContent === 'string' ? articleContent : '',
      typeof lang === 'string' ? lang : 'en'
    )
    if (!reply) {
      return res.status(502).json({ success: false, message: 'No response from AI' })
    }
    return res.json({ success: true, data: { reply } })
  } catch (err: any) {
    console.error('[POST /api/chat]', err?.message)
    return res.status(500).json({ success: false, message: 'AI chat failed' })
  }
})
