import { Router, Request, Response } from 'express'
import { query } from '../db/client'

// Ports server.js GET /api/news-from-db against the live DB.
// Returns the full RawNewsData shape the client's newsAPI.getStore() expects.
export const newsRouter = Router()

newsRouter.get('/', async (req: Request, res: Response) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store'
    })

    const category = req.query.category as string | undefined

    let queryText = `
      SELECT
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
    `
    const params: any[] = []

    if (category && category !== 'all') {
      queryText += ' WHERE LOWER(a.topic) = LOWER($1)'
      params.push(category)
    }

    queryText += `
      ORDER BY
        COALESCE(a.published_at, a.scraped_at, '-infinity'::timestamptz) DESC,
        COALESCE(a.scraped_at, '-infinity'::timestamptz) DESC,
        a.id DESC
      LIMIT 400
    `

    const result = await query(queryText, params)

    const categories = [...new Set(
      result.rows
        .map((row) => row.topic)
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
    )]

    const modelValues = [...new Set(
      result.rows
        .map((row) => row.sentiment_model)
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
    )]
    const aiModels = Object.fromEntries(
      modelValues.map((model, index) => [`sentiment_${index + 1}`, model])
    )

    const scrapedTimestamps = result.rows
      .map((row) => new Date(row.scraped_at).getTime())
      .filter((value) => Number.isFinite(value))
    const latestScrapedAt = scrapedTimestamps.length > 0
      ? new Date(Math.max(...scrapedTimestamps)).toISOString()
      : null

    res.json({
      status: 200,
      success: true,
      datasetStatus: 'ok',
      totalResults: result.rows.length,
      articles: result.rows,
      scrapedAt: latestScrapedAt,
      categories,
      aiModels
    })
  } catch (err: any) {
    console.error('[GET /api/news-from-db]', err.message)
    res.status(500).json({ success: false, message: 'Server Database Error' })
  }
})
