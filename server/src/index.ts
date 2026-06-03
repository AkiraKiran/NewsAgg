import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { newsRouter } from './routes/news'
import { authRouter } from './routes/auth'
import { bookmarksRouter } from './routes/bookmarks'
import { userRouter } from './routes/user'
import { quotesRouter } from './routes/quotes'
import { translateRouter } from './routes/translate'
import { chatRouter } from './routes/chat'
import { apiLimiter, authLimiter } from './middleware/rateLimit'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: process.env.VITE_API_URL || '*' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(apiLimiter)

// Endpoints the client uses (same contract as the retired server.js, now on 3001)
app.use('/api/news-from-db', newsRouter)
app.use('/api/articles', translateRouter)
app.use('/api/quotes', quotesRouter)
app.use('/api/chat', chatRouter)
app.use('/api/user', userRouter)
app.use('/auth', authLimiter, authRouter)
app.use('/bookmarks', bookmarksRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`Server running on ${PORT}`))
