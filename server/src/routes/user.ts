import { Router, Response } from 'express'
import { authMiddleware } from '../middleware/auth'

// Mem0-backed personalization. mem0 is imported lazily inside handlers so a
// missing/broken SDK can't crash the server, and the service degrades safely.
export const userRouter = Router()
userRouter.use(authMiddleware)

// GET /api/user/preferences
userRouter.get('/preferences', async (req: any, res: Response) => {
  try {
    const { getPersonalizedTopics } = await import('../services/mem0')
    const topics = await getPersonalizedTopics(String(req.userId))
    res.json({ success: true, data: { topics } })
  } catch (err: any) {
    console.error('[GET /api/user/preferences]', err?.message)
    res.json({ success: true, data: { topics: [] } })
  }
})

// POST /api/user/reading-history
userRouter.post('/reading-history', async (req: any, res: Response) => {
  try {
    const { topic, sentiment, keywords } = req.body || {}
    const { saveUserInterest } = await import('../services/mem0')
    await saveUserInterest(String(req.userId), { topic, sentiment, keywords: keywords || [] })
    res.json({ success: true })
  } catch (err: any) {
    console.error('[POST /api/user/reading-history]', err?.message)
    res.json({ success: false })
  }
})
