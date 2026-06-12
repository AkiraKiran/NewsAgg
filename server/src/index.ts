import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { CORS_ORIGINS } from './config'
import { newsRouter } from './routes/news'
import { articlesRouter } from './routes/articles'
import { marketsRouter } from './routes/markets'
import { statsRouter } from './routes/stats'
import { authRouter } from './routes/auth'
import { accountRouter } from './routes/account'
import { postsRouter } from './routes/posts'
import { bookmarksRouter } from './routes/bookmarks'
import { userRouter } from './routes/user'
import { quotesRouter } from './routes/quotes'
import { translateRouter } from './routes/translate'
import { chatRouter } from './routes/chat'
import { apiLimiter, authLimiter, chatLimiter } from './middleware/rateLimit'

const app = express()
const PORT = process.env.PORT || 3001

// Behind a reverse proxy (docker nginx, Render, Railway…) the real client IP
// arrives in X-Forwarded-For; without trust proxy every visitor would share a
// single rate-limit bucket. Opt-in so a directly-exposed server stays strict.
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({ origin: CORS_ORIGINS }))
app.use(compression())
app.use(express.json({ limit: '200kb' }))
app.use(express.urlencoded({ extended: true, limit: '200kb' }))

app.use(apiLimiter)

// Endpoints the client uses (same contract as the retired server.js, now on 3001)
app.use('/api/news-from-db', newsRouter)
app.use('/api/articles', translateRouter)
app.use('/api/articles', articlesRouter)
app.use('/api/markets', marketsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/quotes', quotesRouter)
app.use('/api/chat', chatLimiter, chatRouter)
app.use('/api/user', userRouter)
app.use('/api/account', accountRouter)
app.use('/api/posts', postsRouter)
app.use('/auth', authLimiter, authRouter)
app.use('/bookmarks', bookmarksRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

// JSON 404 for anything unmatched (used to fall through to Express' HTML 404).
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found', error: 'Not found' })
})

// Global error handler: body-parser failures (bad JSON, oversized payloads)
// and anything routes throw land here. Internals are logged, never leaked.
// The 4-arg signature is required for Express to treat this as an error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status =
    typeof err?.status === 'number' ? err.status
    : typeof err?.statusCode === 'number' ? err.statusCode
    : 500
  if (status >= 500) console.error('[unhandled]', err?.stack || err)
  if (res.headersSent) return
  const message =
    status === 413 ? 'Payload too large'
    : status < 500 ? 'Bad request'
    : 'Internal server error'
  res.status(status).json({ success: false, message, error: message })
})

app.listen(PORT, () => console.log(`Server running on ${PORT}`))
