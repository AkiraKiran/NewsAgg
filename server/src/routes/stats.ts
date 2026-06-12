import { Router, Request, Response } from 'express'
import { query } from '../db/client'
import { TtlCache } from '../lib/ttlCache'

// Aggregate analytics endpoints so the client widgets no longer pull the full
// article dataset just to count things. All SQL-side, 5-minute TTL cache.
export const statsRouter = Router()

const statsCache = new TtlCache<any>(5 * 60 * 1000, 40)

const TOPICS = new Set([
  'Sport', 'Health', 'Travel', 'Business', 'World', 'Politics', 'Entertainment', 'Science',
])

/** Normalise ?category= (client lowercase ids) to a live Title-case topic. */
function topicParam(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s || s === 'all') return null
  const title = s.charAt(0).toUpperCase() + s.slice(1)
  return TOPICS.has(title) ? title : null
}

// Generic keyword noise that should never appear in "trending".
const KEYWORD_STOPLIST = new Set([
  'news', 'article', 'story', 'video', 'update', 'latest', 'breaking', 'live',
  'cnn', 'bbc', 'aljazeera', 'yahoo', 'read', 'watch', 'report', 'reports',
  'said', 'says', 'year', 'years', 'people', 'world', 'time', 'today',
])

// GET /api/stats/overview?category=
// One row of aggregates: totals, sentiment distribution, source count, latest
// scrape time, distinct categories and the sentiment models in use.
statsRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const topic = topicParam(req.query.category)
    const body = await statsCache.wrap(`overview:${topic ?? 'all'}`, async () => {
      const params: any[] = []
      let where = ''
      if (topic) {
        params.push(topic)
        where = `WHERE a.topic = $1`
      }
      const agg = await query(
        `
        SELECT
          count(*)::int                                                AS total,
          count(*) FILTER (WHERE a.sentiment_type = 'positive')::int  AS positive,
          count(*) FILTER (WHERE a.sentiment_type = 'neutral')::int   AS neutral,
          count(*) FILTER (WHERE a.sentiment_type = 'negative')::int  AS negative,
          count(DISTINCT a.source_id)::int                            AS source_count,
          max(a.scraped_at)                                           AS latest_scraped_at,
          count(DISTINCT a.sentiment_model)::int                      AS model_count
        FROM articles a ${where}
        `,
        params
      )
      const kw = await query(
        `
        SELECT count(DISTINCT lower(k))::int AS keyword_count
        FROM articles a, jsonb_array_elements_text(a.keywords) AS k
        ${where ? `${where} AND` : 'WHERE'} jsonb_typeof(a.keywords) = 'array'
        `,
        params
      )
      const categories = await query(
        `SELECT DISTINCT topic FROM articles WHERE topic IS NOT NULL AND btrim(topic) <> '' ORDER BY topic`
      )
      const models = await query(
        `SELECT DISTINCT sentiment_model FROM articles
         WHERE sentiment_model IS NOT NULL AND btrim(sentiment_model) <> '' ORDER BY sentiment_model`
      )
      const row = agg.rows[0]
      return {
        success: true,
        data: {
          total: row.total,
          sentiments: { positive: row.positive, neutral: row.neutral, negative: row.negative },
          sourceCount: row.source_count,
          keywordCount: kw.rows[0]?.keyword_count ?? 0,
          scrapedAt: row.latest_scraped_at ? new Date(row.latest_scraped_at).toISOString() : null,
          categories: categories.rows.map((r) => r.topic),
          aiModels: Object.fromEntries(
            models.rows.map((r, i) => [`sentiment_${i + 1}`, r.sentiment_model])
          ),
        },
      }
    })
    res.json(body)
  } catch (err: any) {
    console.error('[GET /api/stats/overview]', err.message)
    res.status(500).json({ success: false, message: 'Server Database Error' })
  }
})

// GET /api/stats/trending?limit=&category=
// Keyword frequencies from the JSONB keywords arrays, stoplist-filtered.
statsRouter.get('/trending', async (req: Request, res: Response) => {
  try {
    const topic = topicParam(req.query.category)
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 10))
    const body = await statsCache.wrap(`trending:${topic ?? 'all'}:${limit}`, async () => {
      const params: any[] = []
      let where = `WHERE jsonb_typeof(a.keywords) = 'array'`
      if (topic) {
        params.push(topic)
        where += ` AND a.topic = $${params.length}`
      }
      const result = await query(
        `
        SELECT lower(kw) AS keyword, count(*)::int AS count
        FROM articles a, jsonb_array_elements_text(a.keywords) AS kw
        ${where}
        GROUP BY lower(kw)
        ORDER BY count DESC, keyword ASC
        LIMIT 200
        `,
        params
      )
      const items = result.rows
        .filter((r) => r.keyword.length >= 4 && !/^\d+$/.test(r.keyword) && !KEYWORD_STOPLIST.has(r.keyword))
        .slice(0, limit)
      return { success: true, data: items }
    })
    res.json(body)
  } catch (err: any) {
    console.error('[GET /api/stats/trending]', err.message)
    res.status(500).json({ success: false, message: 'Server Database Error' })
  }
})

// GET /api/stats/business-trend?days=14&category=business
// Per-day article count + average sentiment polarity — feeds the Business
// trend chart (bars = volume, line = tone).
statsRouter.get('/business-trend', async (req: Request, res: Response) => {
  try {
    const topic = topicParam(req.query.category) ?? 'Business'
    const days = Math.min(60, Math.max(3, parseInt(String(req.query.days), 10) || 14))
    const body = await statsCache.wrap(`trend:${topic}:${days}`, async () => {
      const result = await query(
        `
        SELECT
          date_trunc('day', COALESCE(a.published_at, a.scraped_at))::date AS day,
          count(*)::int                                                   AS articles,
          round(avg(COALESCE(a.sentiment_polarity, 0))::numeric, 4)      AS avg_polarity
        FROM articles a
        WHERE a.topic = $1
          AND COALESCE(a.published_at, a.scraped_at) >= NOW() - ($2 || ' days')::interval
        GROUP BY 1
        ORDER BY 1
        `,
        [topic, String(days)]
      )
      return {
        success: true,
        data: result.rows.map((r) => ({
          day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
          articles: r.articles,
          avgPolarity: Number(r.avg_polarity),
        })),
      }
    })
    res.json(body)
  } catch (err: any) {
    console.error('[GET /api/stats/business-trend]', err.message)
    res.status(500).json({ success: false, message: 'Server Database Error' })
  }
})
