import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Body validation middleware. Failures answer 400 with BOTH `message` and
// `error` carrying the same text: the /auth client services read `error`,
// the newer /api routes read `message`.
export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body ?? {})
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const message = issue
        ? `${issue.path.join('.') || 'body'}: ${issue.message}`
        : 'Invalid request body'
      return res.status(400).json({ success: false, message, error: message })
    }
    req.body = parsed.data
    next()
  }
}

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('valid email required').max(255),
  username: z
    .string()
    .trim()
    .min(3, 'username must be 3-30 characters')
    .max(30, 'username must be 3-30 characters'),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
})

// Login stays permissive on password length: existing accounts predate the
// 8-character register rule and must still be able to sign in.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'email required').max(255),
  password: z.string().min(1, 'password required').max(128),
})

export const googleAuthSchema = z.object({
  token: z.string().min(10, 'Google credential required').max(4096),
})

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'username must be 3-30 characters')
    .max(30, 'username must be 3-30 characters'),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'current password required').max(128),
  newPassword: z.string().min(8, 'new password must be at least 8 characters').max(128),
})

// Avatar is a small client-resized image as a data-URL; the 100k-char cap
// stays well under the 200kb JSON body limit.
export const avatarSchema = z.object({
  avatar: z
    .string()
    .max(100_000, 'avatar too large')
    .regex(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/, 'invalid avatar image'),
})

export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'post content required')
    .max(280, 'post must be at most 280 characters'),
  articleId: z
    .string()
    .regex(/^[0-9a-f]{16}$/, 'invalid article reference')
    .optional(),
})

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'message required').max(4000),
  articleContent: z.string().max(30000).optional().default(''),
  lang: z.string().trim().max(10).optional().default('en'),
  // Optional prior turns (F8 multi-turn). Absent → exact legacy single-turn path.
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      })
    )
    .max(20, 'too many history messages')
    .optional(),
})
