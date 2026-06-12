import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/client'
import { JWT_SECRET } from '../config'
import { validateBody, registerSchema, loginSchema, googleAuthSchema } from '../middleware/validate'

// Ports server.js /auth routes against the live `users` table
// (integer id, `password` column). Response shape: { success, token, user, error? }.
export const authRouter = Router()

function signToken(userId: number | string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' } as jwt.SignOptions)
}

// POST /auth/register
authRouter.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body

    const userCheck = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )
    if (userCheck.rows.length > 0) {
      return res.json({ success: false, error: 'Email or username already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (email, username, password, last_login) VALUES ($1, $2, $3, now()) RETURNING id, email, username, avatar',
      [email, username, hashedPassword]
    )

    const user = result.rows[0]
    const token = signToken(user.id)
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
    })
  } catch (error: any) {
    console.error('Register error:', error)
    res.json({ success: false, error: error.message })
  }
})

// POST /auth/login
authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const result = await query(
      'SELECT id, email, username, password, avatar FROM users WHERE email = $1',
      [email]
    )
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'User not found' })
    }

    const user = result.rows[0]
    if (!user.password) {
      return res.json({ success: false, error: 'This account signs in with Google' })
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.json({ success: false, error: 'Invalid password' })
    }

    query('UPDATE users SET last_login = now() WHERE id = $1', [user.id]).catch(() => {})
    const token = signToken(user.id)
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.json({ success: false, error: error.message })
  }
})

// POST /auth/google
authRouter.post('/google', validateBody(googleAuthSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    const { OAuth2Client } = await import('google-auth-library')
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Google authentication failed' })
    }

    const email = payload.email
    const username = payload.name || (email ? email.split('@')[0] : 'user')

    const userResult = await query(
      'SELECT id, email, username, avatar FROM users WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      // First Google sign-in: create the account on the spot, passwordless.
      // Email/password login and change-password already answer such accounts
      // with a clear "signs in with Google" message. The username comes from
      // the Google profile name with a unique-suffix fallback.
      if (!email) {
        return res.status(401).json({ success: false, error: 'Google account has no email' })
      }
      const localPart = email.split('@')[0]
      let base = (username || localPart).trim().slice(0, 24)
      if (base.length < 3) base = `${base}${localPart}user`.slice(0, 24)

      for (let attempt = 0; attempt < 4; attempt++) {
        const candidate =
          attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 30)
        try {
          const created = await query(
            'INSERT INTO users (email, username, google_id, last_login) VALUES ($1, $2, $3, now()) RETURNING id, email, username, avatar',
            [email, candidate, payload.sub]
          )
          const newUser = created.rows[0]
          const newToken = signToken(newUser.id)
          return res.json({
            success: true,
            token: newToken,
            user: {
              id: newUser.id,
              username: newUser.username,
              email: newUser.email,
              avatar: newUser.avatar
            }
          })
        } catch (e: any) {
          // 23505 = unique violation (username taken) → retry with a suffix.
          if (e?.code !== '23505') throw e
        }
      }
      return res.status(500).json({ success: false, error: 'Could not create account' })
    }

    const user = userResult.rows[0]
    // Backfill google_id for accounts created via the prefilled-signup path.
    // payload.sub comes from the server-verified token, never from the client;
    // COALESCE keeps an already-linked id untouched.
    query(
      'UPDATE users SET last_login = now(), google_id = COALESCE(google_id, $2) WHERE id = $1',
      [user.id, payload.sub]
    ).catch(() => {})
    const authToken = signToken(user.id)
    res.json({
      success: true,
      token: authToken,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
    })
  } catch (err: any) {
    console.error('Google auth error:', err)
    res.status(401).json({ success: false, error: 'Google authentication failed' })
  }
})
