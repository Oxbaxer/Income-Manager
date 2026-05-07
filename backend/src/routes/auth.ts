import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '../db/client'
import { users, households, incomeCategories, expenseCategories } from '../db/schema'
import { eq } from 'drizzle-orm'
import { config } from '../config'
import { authenticate } from '../middleware/authenticate'

const DEFAULT_INCOME_CATEGORIES = [
  'Salaire', 'Loyer perçu', 'Dons', 'Remboursements', 'Freelance', 'Autres',
]

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Repas', icon: '🍽️', color: '#f97316' },
  { name: 'Sorties', icon: '🎭', color: '#a855f7' },
  { name: 'Voyages', icon: '✈️', color: '#06b6d4' },
  { name: 'Voiture', icon: '🚗', color: '#64748b' },
  { name: 'Animaux', icon: '🐾', color: '#84cc16' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Logement', icon: '🏠', color: '#f59e0b' },
  { name: 'Santé', icon: '💊', color: '#ef4444' },
  { name: 'Abonnements', icon: '📱', color: '#6366f1' },
  { name: 'Loisirs', icon: '🎮', color: '#22c55e' },
  { name: 'Éducation', icon: '📚', color: '#3b82f6' },
  { name: 'Épargne', icon: '🏦', color: '#10b981' },
  { name: 'Autres', icon: '💰', color: '#94a3b8' },
]

const registerSchema = z.object({
  householdName: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const inviteSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'member']).default('member'),
})

function signTokens(fastify: FastifyInstance, userId: number, householdId: number, role: string) {
  const access = fastify.jwt.sign(
    { sub: userId, householdId, role, type: 'access' },
    { expiresIn: config.jwt.expiresIn }
  )
  const refresh = (fastify.jwt as any).sign(
    { sub: userId, householdId, role, type: 'refresh' },
    { secret: config.jwt.refreshSecret, expiresIn: config.jwt.refreshExpiresIn }
  )
  return { access, refresh }
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/register', async (req, reply) => {
    const body = registerSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { householdName, name, email, password } = body.data

    const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) })
    if (existing) return reply.code(409).send({ error: 'Email already in use' })

    const [household] = await db.insert(households).values({ name: householdName }).returning()
    const passwordHash = await bcrypt.hash(password, 12)
    const [user] = await db.insert(users).values({
      householdId: household.id, email, passwordHash, name, role: 'admin',
    }).returning()

    await db.insert(incomeCategories).values(
      DEFAULT_INCOME_CATEGORIES.map((n, i) => ({
        householdId: household.id, name: n, isDefault: true, sortOrder: i,
      }))
    )
    await db.insert(expenseCategories).values(
      DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
        householdId: household.id, ...c, isDefault: true, sortOrder: i,
      }))
    )

    const tokens = signTokens(fastify, user.id, household.id, user.role)
    return reply.code(201).send({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale },
      ...tokens,
    })
  })

  fastify.post('/api/auth/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, body.data.email) })
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.data.password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const tokens = signTokens(fastify, user.id, user.householdId, user.role)
    return reply.send({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale },
      ...tokens,
    })
  })

  fastify.post('/api/auth/refresh', async (req, reply) => {
    const { refreshToken } = req.body as any
    if (!refreshToken) return reply.code(400).send({ error: 'Missing refresh token' })
    try {
      const payload = (fastify.jwt as any).verify(refreshToken, { secret: config.jwt.refreshSecret }) as any
      if (payload.type !== 'refresh') return reply.code(401).send({ error: 'Invalid token' })
      const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, payload.sub) })
      if (!user) return reply.code(401).send({ error: 'User not found' })
      const tokens = signTokens(fastify, user.id, user.householdId, user.role)
      return reply.send(tokens)
    } catch {
      return reply.code(401).send({ error: 'Invalid refresh token' })
    }
  })

  fastify.post('/api/auth/logout', { preHandler: [authenticate] }, async (_req, reply) => {
    return reply.send({ ok: true })
  })

  fastify.get('/api/auth/me', { preHandler: [authenticate] }, async (req, reply) => {
    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, (req.user as any).sub) })
    if (!user) return reply.code(404).send({ error: 'Not found' })
    return reply.send({ id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale })
  })

  fastify.post('/api/users', { preHandler: [authenticate] }, async (req, reply) => {
    if ((req.user as any).role !== 'admin') return reply.code(403).send({ error: 'Admin required' })

    const body = inviteSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, body.data.email) })
    if (existing) return reply.code(409).send({ error: 'Email already in use' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const [user] = await db.insert(users).values({
      householdId: (req.user as any).householdId,
      email: body.data.email,
      passwordHash,
      name: body.data.name,
      role: body.data.role,
    }).returning()

    return reply.code(201).send({ id: user.id, name: user.name, email: user.email, role: user.role })
  })

  fastify.get('/api/users', { preHandler: [authenticate] }, async (req, reply) => {
    const members = await db.select({
      id: users.id, name: users.name, email: users.email, role: users.role, locale: users.locale,
    }).from(users).where(eq(users.householdId, (req.user as any).householdId))
    return reply.send(members)
  })

  fastify.patch('/api/users/:id/locale', { preHandler: [authenticate] }, async (req, reply) => {
    const { locale } = req.body as any
    const id = parseInt((req.params as any).id, 10)
    if ((req.user as any).sub !== id && (req.user as any).role !== 'admin') {
      return reply.code(403).send({ error: 'Forbidden' })
    }
    if (!['fr', 'en'].includes(locale)) return reply.code(400).send({ error: 'Invalid locale' })
    await db.update(users).set({ locale }).where(eq(users.id, id))
    return reply.send({ ok: true })
  })
}
