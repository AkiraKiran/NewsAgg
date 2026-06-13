import { Router, Response } from 'express'
import { query } from '../db/client'
import { authMiddleware } from '../middleware/auth'
import { validateBody, bookmarkSchema } from '../middleware/validate'

// Ports server.js /bookmarks routes against the live `bookmarks` table
// (integer id/user_id, flat article_* columns). All routes require a token.
// Error responses use static messages — raw DB errors stay in the server log.
export const bookmarksRouter = Router()
bookmarksRouter.use(authMiddleware)

// POST /bookmarks
bookmarksRouter.post('/', validateBody(bookmarkSchema), async (req: any, res: Response) => {
  try {
    const { articleId, articleTitle, articleUrl, urlToImage, sourceName, topic } = req.body

    const result = await query(
      `INSERT INTO bookmarks (user_id, article_id, article_title, article_url, url_to_image, source_name, topic)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, articleId, articleTitle, articleUrl, urlToImage, sourceName, topic]
    )

    res.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    if (error.code === '23505') {
      return res.json({ success: false, error: 'Article already bookmarked' })
    }
    console.error('Bookmark add error:', error)
    res.json({ success: false, error: 'Failed to add bookmark' })
  }
})

// GET /bookmarks
bookmarksRouter.get('/', async (req: any, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    )
    res.json({ success: true, data: result.rows })
  } catch (error: any) {
    console.error('Bookmarks fetch error:', error)
    res.json({ success: false, error: 'Failed to load bookmarks' })
  }
})

// GET /bookmarks/check/:articleId  (defined before /:bookmarkId)
bookmarksRouter.get('/check/:articleId', async (req: any, res: Response) => {
  try {
    const result = await query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND article_id = $2',
      [req.userId, req.params.articleId]
    )
    res.json({
      success: true,
      isBookmarked: result.rows.length > 0,
      bookmarkId: result.rows[0]?.id || null
    })
  } catch (error: any) {
    console.error('Bookmark check error:', error)
    res.json({ success: false, error: 'Failed to check bookmark' })
  }
})

// DELETE /bookmarks/:bookmarkId
bookmarksRouter.delete('/:bookmarkId', async (req: any, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.bookmarkId, req.userId]
    )
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Bookmark not found' })
    }
    res.json({ success: true })
  } catch (error: any) {
    console.error('Bookmark delete error:', error)
    res.json({ success: false, error: 'Failed to delete bookmark' })
  }
})
