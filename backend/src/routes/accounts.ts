import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { accounts, incomeTransactions, expenseTransactions } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

const accountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'investment', 'cash']).default('checking'),
  startingBalance: z.number().default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  icon: z.string().default('🏦'),
  sortOrder: z.number().int().default(0),
})

export async function accountsRoutes(fastify: FastifyInstance) {
  // List accounts with computed balance
  fastify.get('/api/accounts', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    const accs = await db.select().from(accounts)
      .where(eq(accounts.householdId, householdId))
      .orderBy(accounts.sortOrder, accounts.id)

    const result = await Promise.all(accs.map(async (acc) => {
      const [incomeRow] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(incomeTransactions)
        .where(and(eq(incomeTransactions.householdId, householdId), eq(incomeTransactions.accountId, acc.id)))
      const [expenseRow] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(expenseTransactions)
        .where(and(eq(expenseTransactions.householdId, householdId), eq(expenseTransactions.accountId, acc.id)))
      const balance = acc.startingBalance + Number(incomeRow.total) - Number(expenseRow.total)
      return { ...acc, balance }
    }))

    return reply.send(result)
  })

  // Create account
  fastify.post('/api/accounts', { preHandler: [authenticate] }, async (req, reply) => {
    const body = accountSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const [acc] = await db.insert(accounts).values({
      householdId: (req.user as any).householdId,
      ...body.data,
    }).returning()

    return reply.code(201).send({ ...acc, balance: acc.startingBalance })
  })

  // Update account
  fastify.patch('/api/accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const body = accountSchema.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const existing = await db.query.accounts.findFirst({
      where: (a, { eq, and }) => and(eq(a.id, id), eq(a.householdId, (req.user as any).householdId)),
    })
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    const [updated] = await db.update(accounts).set(body.data)
      .where(and(eq(accounts.id, id), eq(accounts.householdId, (req.user as any).householdId)))
      .returning()

    return reply.send(updated)
  })

  // Delete account
  fastify.delete('/api/accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const householdId = (req.user as any).householdId

    const existing = await db.query.accounts.findFirst({
      where: (a, { eq, and }) => and(eq(a.id, id), eq(a.householdId, householdId)),
    })
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    // Check for linked transactions
    const [incomeCount] = await db.select({ count: sql<number>`count(*)` })
      .from(incomeTransactions)
      .where(and(eq(incomeTransactions.accountId, id), eq(incomeTransactions.householdId, householdId)))
    const [expenseCount] = await db.select({ count: sql<number>`count(*)` })
      .from(expenseTransactions)
      .where(and(eq(expenseTransactions.accountId, id), eq(expenseTransactions.householdId, householdId)))

    const total = Number(incomeCount.count) + Number(expenseCount.count)
    if (total > 0) {
      return reply.code(409).send({ error: `Ce compte est utilisé par ${total} transaction(s) et ne peut pas être supprimé.` })
    }

    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)))
    return reply.send({ ok: true })
  })

  // Deduplicate transactions: keep oldest (lowest id) per (date, description, amount, category)
  fastify.post('/api/accounts/deduplicate', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    // Helper: find duplicate ids in JS, then delete in bulk via Drizzle
    async function findAndDeleteDuplicates<T extends { id: number; date: string; description: string; amount: number; categoryId: number }>(
      rows: T[],
      deleteByIds: (ids: number[]) => Promise<any>,
    ): Promise<number> {
      const seen = new Map<string, number>() // key → minId
      const idsToDelete: number[] = []
      for (const r of rows) {
        const key = `${r.date}|${r.description}|${r.amount}|${r.categoryId}`
        const prev = seen.get(key)
        if (prev === undefined) {
          seen.set(key, r.id)
        } else if (r.id > prev) {
          idsToDelete.push(r.id)
        } else {
          // current is older — replace and mark previous for deletion
          idsToDelete.push(prev)
          seen.set(key, r.id)
        }
      }
      if (idsToDelete.length === 0) return 0
      // Delete in chunks to avoid SQL parameter limits
      const CHUNK = 500
      let deleted = 0
      for (let i = 0; i < idsToDelete.length; i += CHUNK) {
        const chunk = idsToDelete.slice(i, i + CHUNK)
        await deleteByIds(chunk)
        deleted += chunk.length
      }
      return deleted
    }

    const expenseRows = await db.select({
      id: expenseTransactions.id,
      date: expenseTransactions.date,
      description: expenseTransactions.description,
      amount: expenseTransactions.amount,
      categoryId: expenseTransactions.categoryId,
    })
      .from(expenseTransactions)
      .where(eq(expenseTransactions.householdId, householdId))

    const incomeRows = await db.select({
      id: incomeTransactions.id,
      date: incomeTransactions.date,
      description: incomeTransactions.description,
      amount: incomeTransactions.amount,
      categoryId: incomeTransactions.categoryId,
    })
      .from(incomeTransactions)
      .where(eq(incomeTransactions.householdId, householdId))

    const deletedExpenses = await findAndDeleteDuplicates(
      expenseRows,
      async (ids) => {
        await db.delete(expenseTransactions).where(and(
          eq(expenseTransactions.householdId, householdId),
          sql`${expenseTransactions.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`,
        ))
      },
    )

    const deletedIncome = await findAndDeleteDuplicates(
      incomeRows,
      async (ids) => {
        await db.delete(incomeTransactions).where(and(
          eq(incomeTransactions.householdId, householdId),
          sql`${incomeTransactions.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`,
        ))
      },
    )

    return reply.send({ deletedExpenses, deletedIncome })
  })

  // Wipe ALL transactions (linked or unlinked) for the household — total reset
  fastify.post('/api/accounts/reset-all-transactions', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const incomeDel = await db.delete(incomeTransactions)
      .where(eq(incomeTransactions.householdId, householdId))
      .returning({ id: incomeTransactions.id })
    const expenseDel = await db.delete(expenseTransactions)
      .where(eq(expenseTransactions.householdId, householdId))
      .returning({ id: expenseTransactions.id })
    return reply.send({ deletedIncome: incomeDel.length, deletedExpenses: expenseDel.length })
  })

  // Reset account: delete all income + expense transactions linked to this account
  fastify.post('/api/accounts/:id/reset', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const householdId = (req.user as any).householdId

    const existing = await db.query.accounts.findFirst({
      where: (a, { eq, and }) => and(eq(a.id, id), eq(a.householdId, householdId)),
    })
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    const incomeDel = await db.delete(incomeTransactions)
      .where(and(eq(incomeTransactions.householdId, householdId), eq(incomeTransactions.accountId, id)))
      .returning({ id: incomeTransactions.id })
    const expenseDel = await db.delete(expenseTransactions)
      .where(and(eq(expenseTransactions.householdId, householdId), eq(expenseTransactions.accountId, id)))
      .returning({ id: expenseTransactions.id })

    return reply.send({ deletedIncome: incomeDel.length, deletedExpenses: expenseDel.length })
  })
}
