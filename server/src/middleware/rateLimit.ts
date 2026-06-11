import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 600, // SPA traffic: paginated feed + per-article fetches add up fast
  message: { success: false, message: 'Too many requests' }
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts' }
})

// Expensive upstream calls (Groq chat, Gemini/Lingva translation) get their
// own tight buckets so a single client cannot burn the free-tier quotas.
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many chat requests — try again later' }
})

export const translateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many translation requests — try again later' }
})
