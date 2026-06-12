import 'dotenv/config'

// Central env-derived config. The old code spread
// `process.env.SECRET_KEY || process.env.JWT_SECRET || 'dev-secret'` across
// files — a production deployment that forgot its secret would silently sign
// tokens with 'dev-secret'. Now that is a boot failure instead.
export const IS_PROD = process.env.NODE_ENV === 'production'

const secret = process.env.SECRET_KEY || process.env.JWT_SECRET
if (!secret) {
  if (IS_PROD) {
    console.error('FATAL: SECRET_KEY or JWT_SECRET must be set in production')
    process.exit(1)
  }
  console.warn('[config] SECRET_KEY/JWT_SECRET not set — using insecure dev-only fallback')
}
export const JWT_SECRET: string = secret || 'dev-secret'

// CLIENT_URL accepts a comma-separated allowlist of origins
// (e.g. "http://localhost:5173,http://localhost:8080").
// Dev without CLIENT_URL: reflect any origin. Production without it: no
// cross-origin access at all (same-origin / reverse-proxy setups only) —
// never the old '*' wildcard.
const origins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
export const CORS_ORIGINS: string[] | boolean = origins.length > 0 ? origins : !IS_PROD
