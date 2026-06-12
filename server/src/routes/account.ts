import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { pool, query } from '../db/client'
import { authMiddleware } from '../middleware/auth'
import {
  validateBody,
  profileSchema,
  passwordChangeSchema,
  avatarSchema,
} from '../middleware/validate'

// Account management over the live `users` table (integer id, `password`
// column nullable for Google-only accounts, `avatar` stores a small data-URL).
// Response shape mirrors /auth: { success, user?/data?, error? }.
export const accountRouter = Router()
accountRouter.use(authMiddleware)

const USER_COLS = 'id, email, username, avatar, role, created_at, last_login'

// GET /api/account/me — also validates the stored token on app boot.
accountRouter.get('/me', async (req: any, res: Response) => {
  try {
    const result = await query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [req.userId])
    if (result.rows.length === 0) {
      // Token of a deleted account: 401 funnels into the client's global sign-out.
      return res.status(401).json({ success: false, error: 'Account no longer exists' })
    }
    res.json({ success: true, user: result.rows[0] })
  } catch (err: any) {
    console.error('[GET /api/account/me]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to load account' })
  }
})

// PATCH /api/account/profile — username only (email is the login identity).
accountRouter.patch('/profile', validateBody(profileSchema), async (req: any, res: Response) => {
  try {
    const { username } = req.body
    const clash = await query('SELECT id FROM users WHERE username = $1 AND id <> $2', [
      username,
      req.userId,
    ])
    if (clash.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Username already taken' })
    }
    const result = await query(
      `UPDATE users SET username = $1 WHERE id = $2 RETURNING ${USER_COLS}`,
      [username, req.userId]
    )
    res.json({ success: true, user: result.rows[0] })
  } catch (err: any) {
    console.error('[PATCH /api/account/profile]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to update profile' })
  }
})

// PATCH /api/account/password
accountRouter.patch(
  '/password',
  validateBody(passwordChangeSchema),
  async (req: any, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body
      const result = await query('SELECT password FROM users WHERE id = $1', [req.userId])
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Account no longer exists' })
      }
      const stored = result.rows[0].password
      if (!stored) {
        return res.status(400).json({
          success: false,
          error: 'This account signs in with Google and has no password to change',
        })
      }
      const ok = await bcrypt.compare(currentPassword, stored)
      if (!ok) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' })
      }
      const hashed = await bcrypt.hash(newPassword, 10)
      await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.userId])
      res.json({ success: true })
    } catch (err: any) {
      console.error('[PATCH /api/account/password]', err?.message)
      res.status(500).json({ success: false, error: 'Failed to change password' })
    }
  }
)

// PUT /api/account/avatar — small data-URL (client downscales to ~96px webp).
accountRouter.put('/avatar', validateBody(avatarSchema), async (req: any, res: Response) => {
  try {
    const result = await query(
      'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING avatar',
      [req.body.avatar, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Account no longer exists' })
    }
    res.json({ success: true, avatar: result.rows[0].avatar })
  } catch (err: any) {
    console.error('[PUT /api/account/avatar]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to update avatar' })
  }
})

// DELETE /api/account — explicit transaction; never rely on FK CASCADE, and
// tolerate tables that only exist after later phases (comments, posts).
accountRouter.delete('/', async (req: any, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const tableExists = async (name: string) => {
      const r = await client.query('SELECT to_regclass($1) AS reg', [`public.${name}`])
      return r.rows[0].reg !== null
    }

    await client.query('DELETE FROM bookmarks WHERE user_id = $1', [req.userId])
    if (await tableExists('comments')) {
      await client.query('DELETE FROM comments WHERE user_id = $1', [req.userId])
    }
    if (await tableExists('post_likes')) {
      await client.query('DELETE FROM post_likes WHERE user_id = $1', [req.userId])
    }
    if (await tableExists('posts')) {
      await client.query('DELETE FROM posts WHERE user_id = $1', [req.userId])
    }
    const deleted = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [
      req.userId,
    ])

    await client.query('COMMIT')
    if (deleted.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Account no longer exists' })
    }
    res.json({ success: true })
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[DELETE /api/account]', err?.message)
    res.status(500).json({ success: false, error: 'Failed to delete account' })
  } finally {
    client.release()
  }
})
