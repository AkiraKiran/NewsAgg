import { Router, Request, Response } from 'express'
import { query } from '../db/client'
import { TtlCache } from '../lib/ttlCache'

// Ports server.js GET /api/news-from-db against the live DB.
//
// Two modes:
//  - LEGACY (no new query params): byte-compatible with the retired server.js
//    contract — full `a.*` rows, LIMIT 400. The current client depends on it.
//  - PAGINATED (any of page/pageSize/fields/source/sentiment/q/sort present):
//    additive mode with totalCount, an optional summary column set (no
//    content / big JSONB blobs), and filtering/ranking pushed into SQL.
//
// Every DB read is wrapped in a 5-minute TTL cache: articles only change when
// the scraper runs (~daily), and NeonDB's free tier meters Postgres egress —
// the uncached legacy query alone moves ~5-10 MB per request.
export const newsRouter = Router()

const JOINS = `
      FROM articles a
      LEFT JOIN sources s  ON a.source_id = s.id
      LEFT JOIN authors au ON a.author_id = au.id
`

const SOURCE_AUTHOR_COLS = `
        s.name        AS source_name,
        s.domain      AS source_domain,
        s.country     AS source_country,
        s.language    AS source_language,
        s.logo_url    AS source_logo,
        au.name       AS author_name,
        au.author_url AS author_url
`

// Summary mode drops the heavyweight columns: content plus the large JSONB
// blobs (entities/images/related_urls/og_data/ai_label_scores/meta_tags) and
// the readability scores. `keywords` stays — TrendingKeywords still derives
// from list payloads until dedicated stats endpoints exist.
const SUMMARY_COLS = `
        a.id, a.url, a.canonical_url, a.source_id, a.author_id,
        a.title, a.description, a.ai_summary,
        a.url_to_image, a.video_url, a.topic, a.section, a.og_type, a.language,
        a.published_at, a.modified_at, a.scraped_at,
        a.sentiment_type, a.sentiment_score, a.sentiment_polarity,
        a.sentiment_pos, a.sentiment_neu, a.sentiment_neg, a.sentiment_model,
        a.toxicity_label, a.toxicity_score,
        a.word_count, a.reading_time_min,
        a.ai_relevance, a.ai_top_label, a.is_premium, a.is_accessible_free,
        a.keywords
`

const ORDER_LATEST = `
      ORDER BY
        COALESCE(a.published_at, a.scraped_at, '-infinity'::timestamptz) DESC,
        COALESCE(a.scraped_at, '-infinity'::timestamptz) DESC,
        a.id DESC
`

const SENTIMENTS = new Set(['positive', 'neutral', 'negative'])
const PAGINATED_PARAMS = ['page', 'pageSize', 'fields', 'source', 'sentiment', 'q', 'sort'] as const

const newsCache = new TtlCache<any>(5 * 60 * 1000, 60)

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function buildAiModels(rows: any[]): Record<string, string> {
  const modelValues = [...new Set(
    rows
      .map((row) => row.sentiment_model)
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
  )]
  return Object.fromEntries(
    modelValues.map((model, index) => [`sentiment_${index + 1}`, model])
  )
}

newsRouter.get('/', async (req: Request, res: Response) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store'
    })

    const category = req.query.category as string | undefined
    const paginated = PAGINATED_PARAMS.some((p) => req.query[p] !== undefined)

    const body = paginated
      ? await paginatedResponse(req, category)
      : await legacyResponse(category)

    res.json(body)
  } catch (err: any) {
    console.error('[GET /api/news-from-db]', err.message)
    res.status(500).json({ success: false, message: 'Server Database Error' })
  }
})

// ── Legacy mode: exact retired-server.js payload ─────────────────────────────
async function legacyResponse(category: string | undefined) {
  const key = `legacy:${(category || 'all').toLowerCase()}`
  return newsCache.wrap(key, async () => {
    let queryText = `
      SELECT
        a.*, ${SOURCE_AUTHOR_COLS}
      ${JOINS}
    `
    const params: any[] = []

    if (category && category !== 'all') {
      queryText += ' WHERE LOWER(a.topic) = LOWER($1)'
      params.push(category)
    }

    queryText += `${ORDER_LATEST} LIMIT 400`

    const result = await query(queryText, params)

    const categories = [...new Set(
      result.rows
        .map((row) => row.topic)
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
    )]

    const scrapedTimestamps = result.rows
      .map((row) => new Date(row.scraped_at).getTime())
      .filter((value) => Number.isFinite(value))
    const latestScrapedAt = scrapedTimestamps.length > 0
      ? new Date(Math.max(...scrapedTimestamps)).toISOString()
      : null

    return {
      status: 200,
      success: true,
      datasetStatus: 'ok',
      totalResults: result.rows.length,
      articles: result.rows,
      scrapedAt: latestScrapedAt,
      categories,
      aiModels: buildAiModels(result.rows)
    }
  })
}

// ── Paginated mode: additive contract for the React Query client ────────────
async function paginatedResponse(req: Request, category: string | undefined) {
  const page = clampInt(req.query.page, 1, 100000, 1)
  const pageSize = clampInt(req.query.pageSize, 1, 50, 20)
  const fields = req.query.fields === 'summary' ? 'summary' : 'full'
  const sort = req.query.sort === 'rank' ? 'rank' : 'latest'
  const sentimentRaw = String(req.query.sentiment ?? '').trim().toLowerCase()
  const sentiment = SENTIMENTS.has(sentimentRaw) ? sentimentRaw : ''
  const sources = String(req.query.source ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const q = String(req.query.q ?? '').trim().slice(0, 100)

  const key = 'pg:' + JSON.stringify({
    c: (category || 'all').toLowerCase(), page, pageSize, fields, sort, sentiment, sources, q
  })

  return newsCache.wrap(key, async () => {
    const where: string[] = []
    const params: any[] = []

    if (category && category !== 'all') {
      params.push(category)
      where.push(`LOWER(a.topic) = LOWER($${params.length})`)
    }
    if (sources.length > 0) {
      params.push(sources)
      where.push(`a.source_id = ANY($${params.length}::text[])`)
    }
    if (sentiment) {
      params.push(sentiment)
      where.push(`a.sentiment_type = $${params.length}`)
    }
    if (q) {
      // Escape ILIKE wildcards so user input is matched literally.
      params.push('%' + q.replace(/([%_\\])/g, '\\$1') + '%')
      where.push(`(a.title ILIKE $${params.length} OR a.description ILIKE $${params.length})`)
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    const cols = fields === 'summary' ? SUMMARY_COLS : 'a.*'
    params.push(pageSize)
    const limitIdx = params.length
    params.push((page - 1) * pageSize)
    const offsetIdx = params.length

    let sql: string
    if (sort === 'rank') {
      // Mirrors the client-side ranking formula (newsAPI.ts): sentiment
      // strength + model confidence + recency normalised over the filtered set.
      sql = `
        WITH filtered AS (
          SELECT ${cols}, ${SOURCE_AUTHOR_COLS},
                 extract(epoch FROM COALESCE(a.published_at, a.scraped_at)) AS _epoch
          ${JOINS}
          ${whereSql}
        )
        SELECT *,
               count(*) OVER ()::int AS _total_count,
               max(scraped_at) OVER () AS _latest_scraped,
               (0.5 * abs(COALESCE(sentiment_polarity, 0))
                + 0.3 * COALESCE(ai_relevance, 0)
                + 0.2 * COALESCE(
                    (_epoch - min(_epoch) OVER ())
                    / NULLIF(max(_epoch) OVER () - min(_epoch) OVER (), 0), 0)
               ) AS _rank_score
        FROM filtered
        ORDER BY _rank_score DESC,
                 COALESCE(published_at, scraped_at, '-infinity'::timestamptz) DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `
    } else {
      sql = `
        SELECT ${cols}, ${SOURCE_AUTHOR_COLS},
               count(*) OVER ()::int AS _total_count,
               max(a.scraped_at) OVER () AS _latest_scraped
        ${JOINS}
        ${whereSql}
        ${ORDER_LATEST}
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `
    }

    const result = await query(sql, params)
    const totalCount = result.rows.length > 0 ? Number(result.rows[0]._total_count) : 0
    const latestRaw = result.rows.length > 0 ? result.rows[0]._latest_scraped : null
    const scrapedAt = latestRaw ? new Date(latestRaw).toISOString() : null

    const articles = result.rows.map((row) => {
      const { _total_count, _latest_scraped, _rank_score, _epoch, ...rest } = row
      return rest
    })

    return {
      status: 200,
      success: true,
      datasetStatus: 'ok',
      totalResults: articles.length,
      totalCount,
      page,
      pageSize,
      articles,
      scrapedAt,
      categories: await distinctCategories(),
      aiModels: buildAiModels(articles)
    }
  })
}

function distinctCategories(): Promise<string[]> {
  return newsCache.wrap('categories', async () => {
    const result = await query(
      `SELECT DISTINCT topic FROM articles
       WHERE topic IS NOT NULL AND btrim(topic) <> ''
       ORDER BY topic`
    )
    return result.rows.map((r) => r.topic)
  })
}
