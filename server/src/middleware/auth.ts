import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.SECRET_KEY || process.env.JWT_SECRET || 'dev-secret'

// Mirrors server.js verifyToken: pulls Bearer token, sets req.userId from
// the JWT { userId } payload. Error responses use the `error` field so the
// existing client services keep working unchanged.
export function authMiddleware(req: any, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number | string }
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

export function optionalAuth(req: any, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number | string }
      req.userId = decoded.userId
    } catch {}
  }
  next()
}
