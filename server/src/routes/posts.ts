import { Router, Response } from 'express'
import { query } from '../db/client'
import { authMiddleware, optionalAuth } from '../middleware/auth'
import { validateBody, postSchema } from '../middleware/validate'
import { postLimiter } from '../middleware/rateLimit'

// F7 posts: ≤280-char user posts with an optional attached article, likes and
// delete-own. Response shape: { success, data?, error? } with `error` for the
// auth-style consumers.
export const postsRouter = Router()

const POST_SELECT = `
  SELECT p.id, p.content, p.created_at, p.article_id,
         u.id AS user_id, u.username, u.avatar,
         a.title  AS article_title,
         a.url_to_image AS article_image,
         a.topic  AS article_topic,
         s.name   AS source_name,
         COALESCE(l.like_count, 0)::int AS like_count,
         EXISTS (
           SELECT 1 FROM post_likes pl
           WHERE pl.post_id = p.id AND pl.user_id = $1
         ) AS liked_by_me
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN articles a ON a.id = p.article_id
  LEFT JOIN sources  s ON s.id = a.source_id
  LEFT JOIN LATERAL (
    SELECT count(*) AS like_count FROM post_likes pl WHERE pl.post_id = p.id
  ) l ON true
`

const clampInt = (raw: any, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(String(raw ?? ''), 10)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// GET /api/posts?page=&pageSize=&mine=1 — public feed; `mine` needs a token.
postsRouter.get('/', optionalAuth, async (req: any, res: Response) => {
  try {
    const mine = String(req.query.mine ?? '') === '1'
    if (mine && !req.userId) {
      return res.status(401).json({ success: false, error: 'Sign in to view your posts' })
    }
    const page = clampInt(req.query.page, 1, 100000, 1)
    const pageSize = clampInt(req.query.pageSize, 1, 50, 20)

    const params: any[] = [req.userId ?? null]
    let where = ''
    if (mine) {
      params.push(req.userId)
      where = `WHERE p.user_id = $${params.length}`
    }
    params.push(pageSize)
    const limitIdx = params.length
    params.push((page - 1) * pageSize)
    const offsetIdx = params.length

    const result = await query(
      `${POST_SELECT} ${where}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )
    const countResult = await query(
      `SELECT count(*)::int AS total FROM posts p ${where ? 'WHERE p.user_id = $1' : ''}`,
      where ? [req.userId] : []
    )

    res.json({
      success: true,
      data: {
        posts: result.rows,
        totalCount: countResult.rows[0].total,
        page,
        pageSize,
      },
    })
  } catch (err: any) {
    console.error('[GET /api/posts]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to load posts' })
  }
})

// POST /api/posts — auth + tight rate limit; optional attached article must exist.
postsRouter.post(
  '/',
  authMiddleware,
  postLimiter,
  validateBody(postSchema),
  async (req: any, res: Response) => {
    try {
      const { content, articleId } = req.body
      if (articleId) {
        const exists = await query('SELECT 1 FROM articles WHERE id = $1', [articleId])
        if (exists.rows.length === 0) {
          return res.status(400).json({ success: false, error: 'Attached article not found' })
        }
      }
      const inserted = await query(
        'INSERT INTO posts (user_id, article_id, content) VALUES ($1, $2, $3) RETURNING id',
        [req.userId, articleId ?? null, content]
      )
      const row = await query(`${POST_SELECT} WHERE p.id = $2`, [req.userId, inserted.rows[0].id])
      res.status(201).json({ success: true, data: row.rows[0] })
    } catch (err: any) {
      console.error('[POST /api/posts]', err?.message)
      res.status(500).json({ success: false, error: 'Failed to create post' })
    }
  }
)

// DELETE /api/posts/:id — own posts only; 404 (not 403) so ids can't be probed.
postsRouter.delete('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(404).json({ success: false, error: 'Post not found' })
    const result = await query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' })
    }
    res.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/posts/:id]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to delete post' })
  }
})

// POST /api/posts/:id/like — idempotent via ON CONFLICT DO NOTHING.
postsRouter.post('/:id/like', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(404).json({ success: false, error: 'Post not found' })
    await query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, req.userId]
    )
    res.json({ success: true })
  } catch (err: any) {
    // FK violation = post no longer exists.
    if (err?.code === '23503') {
      return res.status(404).json({ success: false, error: 'Post not found' })
    }
    console.error('[POST /api/posts/:id/like]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to like post' })
  }
})

// DELETE /api/posts/:id/like
postsRouter.delete('/:id/like', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(404).json({ success: false, error: 'Post not found' })
    await query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, req.userId])
    res.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/posts/:id/like]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to unlike post' })
  }
})
