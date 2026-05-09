import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { expenseTransactions, expenseCategories } from '../db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

const transactionSchema = z.object({
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.number().int().positive(),
  description: z.string().min(1).max(255),
  notes: z.string().max(1000).optional(),
  accountId: z.number().int().positive().optional().nullable(),
})

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.number().int().positive().optional().nullable(),
  icon: z.string().max(10).default('💰'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  sortOrder: z.number().int().default(0),
})

export async function expenseRoutes(fastify: FastifyInstance) {
  // List transactions
  fastify.get('/api/expenses', { preHandler: [authenticate] }, async (req, reply) => {
    const { page = '1', limit = '20', categoryId, from, to, accountId } = req.query as any
    const householdId = (req.user as any).householdId
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const conditions = [eq(expenseTransactions.householdId, householdId)]
    if (categoryId) conditions.push(eq(expenseTransactions.categoryId, parseInt(categoryId)))
    if (from) conditions.push(gte(expenseTransactions.date, from))
    if (to) conditions.push(lte(expenseTransactions.date, to))
    if (accountId) conditions.push(eq(expenseTransactions.accountId, parseInt(accountId)))

    const [rows, countRow] = await Promise.all([
      db.select({
        id: expenseTransactions.id,
        amount: expenseTransactions.amount,
        date: expenseTransactions.date,
        categoryId: expenseTransactions.categoryId,
        categoryName: expenseCategories.name,
        categoryIcon: expenseCategories.icon,
        categoryColor: expenseCategories.color,
        description: expenseTransactions.description,
        notes: expenseTransactions.notes,
        recurringId: expenseTransactions.recurringId,
        accountId: expenseTransactions.accountId,
        createdAt: expenseTransactions.createdAt,
      })
        .from(expenseTransactions)
        .leftJoin(expenseCategories, eq(expenseTransactions.categoryId, expenseCategories.id))
        .where(and(...conditions))
        .orderBy(desc(expenseTransactions.date), desc(expenseTransactions.id))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(expenseTransactions)
        .where(and(...conditions)),
    ])

    return reply.send({ data: rows, total: countRow[0].count, page: parseInt(page), limit: parseInt(limit) })
  })

  // Create
  fastify.post('/api/expenses', { preHandler: [authenticate] }, async (req, reply) => {
    const body = transactionSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const [tx] = await db.insert(expenseTransactions).values({
      householdId: (req.user as any).householdId,
      userId: (req.user as any).sub,
      ...body.data,
    }).returning()

    return reply.code(201).send(tx)
  })

  // Get one
  fastify.get('/api/expenses/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const tx = await db.query.expenseTransactions.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.householdId, (req.user as any).householdId)),
    })
    if (!tx) return reply.code(404).send({ error: 'Not found' })
    return reply.send(tx)
  })

  // Update
  fastify.put('/api/expenses/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const body = transactionSchema.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const existing = await db.query.expenseTransactions.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.householdId, (req.user as any).householdId)),
    })
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    const [updated] = await db.update(expenseTransactions)
      .set({ ...body.data, updatedAt: new Date().toISOString() })
      .where(eq(expenseTransactions.id, id))
      .returning()

    return reply.send(updated)
  })

  // Delete
  fastify.delete('/api/expenses/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const existing = await db.query.expenseTransactions.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.householdId, (req.user as any).householdId)),
    })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    await db.delete(expenseTransactions).where(eq(expenseTransactions.id, id))
    return reply.send({ ok: true })
  })

  // Categories
  fastify.get('/api/expenses/categories', { preHandler: [authenticate] }, async (req, reply) => {
    const cats = await db.select().from(expenseCategories)
      .where(eq(expenseCategories.householdId, (req.user as any).householdId))
      .orderBy(expenseCategories.sortOrder)
    return reply.send(cats)
  })

  fastify.post('/api/expenses/categories', { preHandler: [authenticate] }, async (req, reply) => {
    const body = categorySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [cat] = await db.insert(expenseCategories).values({
      householdId: (req.user as any).householdId, ...body.data,
    }).returning()
    return reply.code(201).send(cat)
  })

  fastify.put('/api/expenses/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const body = categorySchema.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [updated] = await db.update(expenseCategories).set(body.data)
      .where(and(eq(expenseCategories.id, id), eq(expenseCategories.householdId, (req.user as any).householdId)))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'Not found' })
    return reply.send(updated)
  })

  fastify.patch('/api/expenses/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const patchSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      icon: z.string().max(10).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    const body = patchSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [updated] = await db.update(expenseCategories).set(body.data)
      .where(and(eq(expenseCategories.id, id), eq(expenseCategories.householdId, (req.user as any).householdId)))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'Not found' })
    return reply.send(updated)
  })

  fastify.delete('/api/expenses/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    // Check if any transactions use this category
    const usageCount = await db.select({ count: sql<number>`count(*)` })
      .from(expenseTransactions)
      .where(and(eq(expenseTransactions.categoryId, id), eq(expenseTransactions.householdId, (req.user as any).householdId)))
    if (Number(usageCount[0].count) > 0) {
      return reply.code(409).send({ error: `Cette catégorie est utilisée par ${usageCount[0].count} transaction(s) et ne peut pas être supprimée.` })
    }
    const deleted = await db.delete(expenseCategories)
      .where(and(eq(expenseCategories.id, id), eq(expenseCategories.householdId, (req.user as any).householdId)))
      .returning()
    if (!deleted.length) return reply.code(404).send({ error: 'Not found' })
    return reply.send({ ok: true })
  })
}
