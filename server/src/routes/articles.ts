import { Router, Request, Response } from 'express'
import { query } from '../db/client'
import { TtlCache } from '../lib/ttlCache'

// GET /api/articles/:id — single full article (joined with source + author).
// The legacy client located articles by scanning the entire /api/news-from-db
// payload; this endpoint serves one row instead, so article pages stop paying
// for the whole dataset (NeonDB egress diet).
export const articlesRouter = Router()

// Live DB article ids are sha256(canonical_url)[:16] — 16 lowercase hex chars.
const ID_RE = /^[0-9a-f]{16}$/

const articleCache = new TtlCache<any | null>(5 * 60 * 1000, 500)

articlesRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id || '').toLowerCase()
  if (!ID_RE.test(id)) {
    return res.status(400).json({ success: false, message: 'Invalid article id' })
  }

  try {
    const article = await articleCache.wrap(id, async () => {
      const result = await query(
        `SELECT
           a.*,
           s.name        AS source_name,
           s.domain      AS source_domain,
           s.country     AS source_country,
           s.language    AS source_language,
           s.logo_url    AS source_logo,
           au.name       AS author_name,
           au.author_url AS author_url
         FROM articles a
         LEFT JOIN sources s  ON a.source_id = s.id
         LEFT JOIN authors au ON a.author_id = au.id
         WHERE a.id = $1`,
        [id]
      )
      return result.rows[0] ?? null
    })

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' })
    }
    return res.json({ success: true, data: article })
  } catch (err: any) {
    console.error('[GET /api/articles/:id]', err.message)
    return res.status(500).json({ success: false, message: 'Server Database Error' })
  }
})
