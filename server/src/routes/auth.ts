import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/client'

// Ports server.js /auth routes against the live `users` table
// (integer id, `password` column). Response shape: { success, token, user, error? }.
export const authRouter = Router()

const JWT_SECRET = process.env.SECRET_KEY || process.env.JWT_SECRET || 'dev-secret'

function signToken(userId: number | string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' } as jwt.SignOptions)
}

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body
    if (!email || !username || !password) {
      return res.json({ success: false, error: 'Missing required fields' })
    }

    const userCheck = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )
    if (userCheck.rows.length > 0) {
      return res.json({ success: false, error: 'Email or username already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING id, email, username',
      [email, username, hashedPassword]
    )

    const user = result.rows[0]
    const token = signToken(user.id)
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email }
    })
  } catch (error: any) {
    console.error('Register error:', error)
    res.json({ success: false, error: error.message })
  }
})

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.json({ success: false, error: 'Missing email or password' })
    }

    const result = await query(
      'SELECT id, email, username, password FROM users WHERE email = $1',
      [email]
    )
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'User not found' })
    }

    const user = result.rows[0]
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.json({ success: false, error: 'Invalid password' })
    }

    const token = signToken(user.id)
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.json({ success: false, error: error.message })
  }
})

// POST /auth/google
authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    if (!token) {
      return res.json({ success: false, error: 'No token provided' })
    }

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
      'SELECT id, email, username FROM users WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Please sign up first.',
        email,
        username
      })
    }

    const user = userResult.rows[0]
    const authToken = signToken(user.id)
    res.json({
      success: true,
      token: authToken,
      user: { id: user.id, username: user.username, email: user.email }
    })
  } catch (err: any) {
    console.error('Google auth error:', err)
    res.status(401).json({ success: false, error: 'Google authentication failed' })
  }
})
