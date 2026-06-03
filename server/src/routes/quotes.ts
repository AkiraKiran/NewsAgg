import { Router, Request, Response } from 'express'

// Uses Node's built-in global fetch (Node 18+). CLAUDE.md imported node-fetch
// v3, but that package is ESM-only and breaks under this CommonJS build.

export const quotesRouter = Router()

interface DailyQuote {
  quote: string
  author: string
}

// Server-side daily cache (CLAUDE.md: "refresh once per day"). FavQs' QOTD
// rotates daily, so we key the cache on the UTC date and only re-fetch when the
// day rolls over. In-memory is fine for a single-process server — a restart
// just costs one fresh fetch.
let cache: { date: string; quote: DailyQuote } | null = null

// Separate cache for the batch list (powers the client's 7s rotation). Also
// keyed on the UTC date so we hit FavQs at most a couple of times per day.
let listCache: { date: string; quotes: DailyQuote[] } | null = null

const todayKey = (): string => new Date().toISOString().slice(0, 10)

async function fetchQuoteOfTheDay(): Promise<DailyQuote> {
  const response = await fetch('https://favqs.com/api/qotd', {
    headers: { Authorization: `Token token="${process.env.FAVQS_API_KEY}"` },
  })
  if (!response.ok) throw new Error(`FavQs HTTP ${response.status}`)
  const data = (await response.json()) as any
  return {
    quote: data.quote?.body || '',
    author: data.quote?.author || 'Unknown',
  }
}

// One page of FavQs public quotes (25 per page). Empty/malformed entries are
// dropped so the client never has to render a blank quote.
async function fetchQuotesPage(page: number): Promise<DailyQuote[]> {
  const response = await fetch(`https://favqs.com/api/quotes?page=${page}`, {
    headers: { Authorization: `Token token="${process.env.FAVQS_API_KEY}"` },
  })
  if (!response.ok) throw new Error(`FavQs HTTP ${response.status}`)
  const data = (await response.json()) as any
  const quotes = Array.isArray(data.quotes) ? data.quotes : []
  return quotes
    .map((q: any): DailyQuote => ({ quote: q.body || '', author: q.author || 'Unknown' }))
    .filter((q: DailyQuote) => q.quote.length > 0)
}

quotesRouter.get('/random', async (_req: Request, res: Response) => {
  const today = todayKey()

  if (cache && cache.date === today) {
    return res.json({ success: true, data: cache.quote })
  }

  try {
    const quote = await fetchQuoteOfTheDay()
    cache = { date: today, quote }
    return res.json({ success: true, data: quote })
  } catch (err: any) {
    console.error('[GET /api/quotes/random]', err.message)
    // Serve a stale quote over nothing if a previous day's fetch succeeded.
    if (cache) return res.json({ success: true, data: cache.quote })
    return res.json({ success: false, data: { quote: '', author: '' } })
  }
})

// Batch of quotes for the client-side rotation. Two pages (~50 quotes) gives
// enough variety to cycle every 7s without repeating for minutes.
quotesRouter.get('/list', async (_req: Request, res: Response) => {
  const today = todayKey()

  if (listCache && listCache.date === today && listCache.quotes.length > 0) {
    return res.json({ success: true, data: listCache.quotes })
  }

  try {
    const pages = await Promise.all([fetchQuotesPage(1), fetchQuotesPage(2)])
    const quotes = pages.flat()
    if (quotes.length === 0) throw new Error('empty quote list')
    listCache = { date: today, quotes }
    return res.json({ success: true, data: quotes })
  } catch (err: any) {
    console.error('[GET /api/quotes/list]', err.message)
    // Serve a stale batch if we have one; otherwise fall back to the single
    // daily quote so the widget still renders something.
    if (listCache) return res.json({ success: true, data: listCache.quotes })
    try {
      const quote = cache && cache.date === today ? cache.quote : await fetchQuoteOfTheDay()
      return res.json({ success: true, data: [quote] })
    } catch {
      return res.json({ success: false, data: [] })
    }
  }
})
