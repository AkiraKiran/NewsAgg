import { Router, Request, Response } from 'express'

// GET /api/markets/summary — keyless market data for the Business view:
//   fx      open.er-api.com  (USD→IDR / TWD / EUR, 12h TTL — daily data)
//   indices Stooq CSV        (^spx ^ndq ^dji + 14-day closes, 30min TTL)
//   crypto  CoinGecko        (BTC/ETH + 7d sparkline, 10min TTL)
// Every upstream is fetched server-side (keys/quotas never reach the client),
// each section fails independently, and the last good payload is served stale
// (stale:true) rather than erroring — this endpoint never 500s as a whole.
export const marketsRouter = Router()

interface Section<T> {
  value: T | null
  fetchedAt: number
  stale: boolean
}

const lastGood = new Map<string, { value: unknown; fetchedAt: number }>()
const inflight = new Map<string, Promise<unknown>>()

async function section<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<Section<T>> {
  const cached = lastGood.get(key)
  const now = Date.now()
  if (cached && now - cached.fetchedAt < ttlMs) {
    return { value: cached.value as T, fetchedAt: cached.fetchedAt, stale: false }
  }
  try {
    let p = inflight.get(key) as Promise<T> | undefined
    if (!p) {
      p = loader()
      inflight.set(key, p)
      // Cleanup on settle. Both handlers swallow — the rejection is observed
      // by the awaiter below; an unhandled rejection here would kill Node.
      p.then(
        () => inflight.delete(key),
        () => inflight.delete(key)
      )
    }
    const value = await p
    lastGood.set(key, { value, fetchedAt: now })
    return { value, fetchedAt: now, stale: false }
  } catch (err) {
    console.error(`[markets:${key}]`, (err as Error).message)
    if (cached) return { value: cached.value as T, fetchedAt: cached.fetchedAt, stale: true }
    return { value: null, fetchedAt: now, stale: true }
  }
}

// ── FX (open.er-api.com, no key) ─────────────────────────────────────────────
interface FxRates {
  base: 'USD'
  idr: number
  twd: number
  eur: number
  updatedAt: string | null
}

async function loadFx(): Promise<FxRates> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD')
  if (!res.ok) throw new Error(`er-api HTTP ${res.status}`)
  const json: any = await res.json()
  if (json?.result !== 'success' || !json.rates) throw new Error('er-api bad payload')
  return {
    base: 'USD',
    idr: Number(json.rates.IDR),
    twd: Number(json.rates.TWD),
    eur: Number(json.rates.EUR),
    updatedAt: json.time_last_update_utc ?? null,
  }
}

// ── Indices (Stooq CSV, no key) ──────────────────────────────────────────────
interface IndexQuote {
  symbol: string
  name: string
  close: number
  changePct: number | null
  spark: number[]
}

const INDICES: Array<{ symbol: string; name: string }> = [
  { symbol: '^spx', name: 'S&P 500' },
  { symbol: '^ndq', name: 'Nasdaq' },
  { symbol: '^dji', name: 'Dow Jones' },
]

function stooqDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

async function loadIndices(): Promise<IndexQuote[]> {
  const d2 = new Date()
  const d1 = new Date(d2.getTime() - 21 * 24 * 60 * 60 * 1000) // ≥14 trading days
  const out: IndexQuote[] = []
  for (const { symbol, name } of INDICES) {
    const url =
      `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}` +
      `&d1=${stooqDate(d1)}&d2=${stooqDate(d2)}&i=d`
    const res = await fetch(url)
    if (!res.ok) continue
    const csv = await res.text()
    // Header: Date,Open,High,Low,Close,Volume — Stooq answers "N/D" on block.
    const closes = csv
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => Number(line.split(',')[4]))
      .filter((n) => Number.isFinite(n))
    if (closes.length < 2) continue
    const close = closes[closes.length - 1]
    const prev = closes[closes.length - 2]
    out.push({
      symbol,
      name,
      close,
      changePct: prev ? ((close - prev) / prev) * 100 : null,
      spark: closes.slice(-14),
    })
  }
  if (out.length === 0) throw new Error('stooq returned no parsable data')
  return out
}

// ── Crypto (CoinGecko, no key) ───────────────────────────────────────────────
interface CryptoQuote {
  id: string
  symbol: string
  price: number
  changePct24h: number | null
  spark: number[]
}

async function loadCrypto(): Promise<CryptoQuote[]> {
  const url =
    'https://api.coingecko.com/api/v3/coins/markets' +
    '?vs_currency=usd&ids=bitcoin,ethereum&sparkline=true&price_change_percentage=24h'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`coingecko HTTP ${res.status}`)
  const json: any = await res.json()
  if (!Array.isArray(json)) throw new Error('coingecko bad payload')
  return json.map((c: any) => {
    const prices: number[] = Array.isArray(c?.sparkline_in_7d?.price) ? c.sparkline_in_7d.price : []
    // 7d hourly series (~168 points) → thin to ~24 points for the client.
    const step = Math.max(1, Math.floor(prices.length / 24))
    return {
      id: String(c.id),
      symbol: String(c.symbol ?? '').toUpperCase(),
      price: Number(c.current_price),
      changePct24h: c.price_change_percentage_24h != null ? Number(c.price_change_percentage_24h) : null,
      spark: prices.filter((_: number, i: number) => i % step === 0),
    }
  })
}

// ── Route ────────────────────────────────────────────────────────────────────
marketsRouter.get('/summary', async (_req: Request, res: Response) => {
  const [fx, indices, crypto] = await Promise.all([
    section('fx', 12 * 60 * 60 * 1000, loadFx),
    section('indices', 30 * 60 * 1000, loadIndices),
    section('crypto', 10 * 60 * 1000, loadCrypto),
  ])
  res.json({
    success: true,
    data: {
      fx: fx.value ? { ...fx.value, stale: fx.stale } : null,
      indices: indices.value ? { items: indices.value, stale: indices.stale } : null,
      crypto: crypto.value ? { items: crypto.value, stale: crypto.stale } : null,
    },
  })
})
