import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { incomeTransactions, payslipDetails, incomeCategories } from '../db/schema'
import { eq, and, gte, lte, desc, sql, isNull } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

const transactionSchema = z.object({
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.number().int().positive(),
  description: z.string().min(1).max(255),
  notes: z.string().max(1000).optional(),
  isPayslip: z.boolean().default(false),
  accountId: z.number().int().positive().optional().nullable(),
  payslip: z.object({
    grossAmount: z.number().positive(),
    netAmount: z.number().positive(),
    contributions: z.number().min(0).default(0),
    bonuses: z.number().min(0).default(0),
    employerName: z.string().max(255).optional(),
    periodLabel: z.string().max(100).optional(),
  }).optional(),
})

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
})

export async function incomeRoutes(fastify: FastifyInstance) {
  // List transactions
  fastify.get('/api/income', { preHandler: [authenticate] }, async (req, reply) => {
    const { page = '1', limit = '20', categoryId, from, to, accountId } = req.query as any
    const householdId = (req.user as any).householdId
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const conditions = [eq(incomeTransactions.householdId, householdId)]
    if (categoryId) conditions.push(eq(incomeTransactions.categoryId, parseInt(categoryId)))
    if (from) conditions.push(gte(incomeTransactions.date, from))
    if (to) conditions.push(lte(incomeTransactions.date, to))
    if (accountId === 'null' || accountId === 'none') {
      conditions.push(isNull(incomeTransactions.accountId))
    } else if (accountId) {
      conditions.push(eq(incomeTransactions.accountId, parseInt(accountId)))
    }

    const [rows, countRow] = await Promise.all([
      db.select({
        id: incomeTransactions.id,
        amount: incomeTransactions.amount,
        date: incomeTransactions.date,
        categoryId: incomeTransactions.categoryId,
        categoryName: incomeCategories.name,
        description: incomeTransactions.description,
        notes: incomeTransactions.notes,
        isPayslip: incomeTransactions.isPayslip,
        accountId: incomeTransactions.accountId,
        createdAt: incomeTransactions.createdAt,
      })
        .from(incomeTransactions)
        .leftJoin(incomeCategories, eq(incomeTransactions.categoryId, incomeCategories.id))
        .where(and(...conditions))
        .orderBy(desc(incomeTransactions.date), desc(incomeTransactions.id))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(incomeTransactions)
        .where(and(...conditions)),
    ])

    return reply.send({ data: rows, total: countRow[0].count, page: parseInt(page), limit: parseInt(limit) })
  })

  // Create
  fastify.post('/api/income', { preHandler: [authenticate] }, async (req, reply) => {
    const body = transactionSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { payslip, ...txData } = body.data
    const [tx] = await db.insert(incomeTransactions).values({
      householdId: (req.user as any).householdId,
      userId: (req.user as any).sub,
      ...txData,
    }).returning()

    if (txData.isPayslip && payslip) {
      await db.insert(payslipDetails).values({ transactionId: tx.id, ...payslip })
    }

    return reply.code(201).send(tx)
  })

  // Get one
  fastify.get('/api/income/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const tx = await db.query.incomeTransactions.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.householdId, (req.user as any).householdId)),
    })
    if (!tx) return reply.code(404).send({ error: 'Not found' })
    return reply.send(tx)
  })

  // Update
  fastify.put('/api/income/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const body = transactionSchema.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { payslip, ...txData } = body.data as any
    const existing = await db.query.incomeTransactions.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.householdId, (req.user as any).householdId)),
    })
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    const [updated] = await db.update(incomeTransactions)
      .set({ ...txData, updatedAt: new Date().toISOString() })
      .where(eq(incomeTransactions.id, id))
      .returning()

    if (payslip) {
      const existingPayslip = await db.query.payslipDetails.findFirst({
        where: (p, { eq }) => eq(p.transactionId, id),
      })
      if (existingPayslip) {
        await db.update(payslipDetails).set(payslip).where(eq(payslipDetails.transactionId, id))
      } else {
        await db.insert(payslipDetails).values({ transactionId: id, ...payslip })
      }
    }

    return reply.send(updated)
  })

  // Delete
  fastify.delete('/api/income/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const existing = await db.query.incomeTransactions.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.householdId, (req.user as any).householdId)),
    })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    await db.delete(incomeTransactions).where(eq(incomeTransactions.id, id))
    return reply.send({ ok: true })
  })

  // Bulk delete
  fastify.post('/api/income/bulk-delete', { preHandler: [authenticate] }, async (req, reply) => {
    const body = z.object({ ids: z.array(z.number().int().positive()).min(1) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const householdId = (req.user as any).householdId
    const result = await db.delete(incomeTransactions)
      .where(and(
        eq(incomeTransactions.householdId, householdId),
        sql`${incomeTransactions.id} IN (${sql.join(body.data.ids.map(id => sql`${id}`), sql`, `)})`,
      ))
      .returning({ id: incomeTransactions.id })
    return reply.send({ deleted: result.length })
  })

  // List ALL ids matching current filters (no pagination)
  fastify.get('/api/income/all-ids', { preHandler: [authenticate] }, async (req, reply) => {
    const { categoryId, from, to, accountId } = req.query as any
    const householdId = (req.user as any).householdId

    const conditions = [eq(incomeTransactions.householdId, householdId)]
    if (categoryId) conditions.push(eq(incomeTransactions.categoryId, parseInt(categoryId)))
    if (from) conditions.push(gte(incomeTransactions.date, from))
    if (to) conditions.push(lte(incomeTransactions.date, to))
    if (accountId === 'null' || accountId === 'none') {
      conditions.push(isNull(incomeTransactions.accountId))
    } else if (accountId) {
      conditions.push(eq(incomeTransactions.accountId, parseInt(accountId)))
    }

    const rows = await db.select({ id: incomeTransactions.id })
      .from(incomeTransactions)
      .where(and(...conditions))

    return reply.send({ ids: rows.map(r => r.id) })
  })

  // Bulk update (re-categorize, reassign account)
  fastify.post('/api/income/bulk-update', { preHandler: [authenticate] }, async (req, reply) => {
    const body = z.object({
      ids: z.array(z.number().int().positive()).min(1),
      data: z.object({
        categoryId: z.number().int().positive().optional(),
        accountId: z.number().int().positive().nullable().optional(),
      }),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const householdId = (req.user as any).householdId

    const updateData: any = { updatedAt: new Date().toISOString() }
    if (body.data.data.categoryId !== undefined) updateData.categoryId = body.data.data.categoryId
    if (body.data.data.accountId !== undefined) updateData.accountId = body.data.data.accountId

    const CHUNK = 500
    let updated = 0
    for (let i = 0; i < body.data.ids.length; i += CHUNK) {
      const chunk = body.data.ids.slice(i, i + CHUNK)
      const result = await db.update(incomeTransactions)
        .set(updateData)
        .where(and(
          eq(incomeTransactions.householdId, householdId),
          sql`${incomeTransactions.id} IN (${sql.join(chunk.map(id => sql`${id}`), sql`, `)})`,
        ))
        .returning({ id: incomeTransactions.id })
      updated += result.length
    }
    return reply.send({ updated })
  })

  // Categories
  fastify.get('/api/income/categories', { preHandler: [authenticate] }, async (req, reply) => {
    const cats = await db.select().from(incomeCategories)
      .where(eq(incomeCategories.householdId, (req.user as any).householdId))
      .orderBy(incomeCategories.sortOrder)
    return reply.send(cats)
  })

  fastify.post('/api/income/categories', { preHandler: [authenticate] }, async (req, reply) => {
    const body = categorySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [cat] = await db.insert(incomeCategories).values({
      householdId: (req.user as any).householdId, ...body.data,
    }).returning()
    return reply.code(201).send(cat)
  })

  fastify.put('/api/income/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const body = categorySchema.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [updated] = await db.update(incomeCategories).set(body.data)
      .where(and(eq(incomeCategories.id, id), eq(incomeCategories.householdId, (req.user as any).householdId)))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'Not found' })
    return reply.send(updated)
  })

  fastify.patch('/api/income/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const patchSchema = z.object({
      name: z.string().min(1).max(100),
    })
    const body = patchSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [updated] = await db.update(incomeCategories).set(body.data)
      .where(and(eq(incomeCategories.id, id), eq(incomeCategories.householdId, (req.user as any).householdId)))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'Not found' })
    return reply.send(updated)
  })

  fastify.delete('/api/income/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    // Check if any transactions use this category
    const usageCount = await db.select({ count: sql<number>`count(*)` })
      .from(incomeTransactions)
      .where(and(eq(incomeTransactions.categoryId, id), eq(incomeTransactions.householdId, (req.user as any).householdId)))
    if (Number(usageCount[0].count) > 0) {
      return reply.code(409).send({ error: `Cette catégorie est utilisée par ${usageCount[0].count} transaction(s) et ne peut pas être supprimée.` })
    }
    const deleted = await db.delete(incomeCategories)
      .where(and(eq(incomeCategories.id, id), eq(incomeCategories.householdId, (req.user as any).householdId)))
      .returning()
    if (!deleted.length) return reply.code(404).send({ error: 'Not found' })
    return reply.send({ ok: true })
  })
}
