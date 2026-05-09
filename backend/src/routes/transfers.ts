import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { transfers, accounts, incomeTransactions, expenseTransactions, incomeCategories, expenseCategories } from '../db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

const transferSchema = z.object({
  fromAccountId: z.number().int().positive(),
  toAccountId: z.number().int().positive(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
})

async function getOrCreateVirementCategory(householdId: number, type: 'income' | 'expense') {
  if (type === 'income') {
    let cat = await db.query.incomeCategories.findFirst({
      where: (c, { eq, and }) => and(eq(c.householdId, householdId), eq(c.name, 'Virements')),
    })
    if (!cat) {
      const [created] = await db.insert(incomeCategories).values({
        householdId,
        name: 'Virements',
        isDefault: false,
        sortOrder: 999,
      }).returning()
      cat = created
    }
    return cat.id
  } else {
    let cat = await db.query.expenseCategories.findFirst({
      where: (c, { eq, and }) => and(eq(c.householdId, householdId), eq(c.name, 'Virements')),
    })
    if (!cat) {
      const [created] = await db.insert(expenseCategories).values({
        householdId,
        name: 'Virements',
        isDefault: false,
        icon: '↔️',
        color: '#6366f1',
        sortOrder: 999,
      }).returning()
      cat = created
    }
    return cat.id
  }
}

export async function transfersRoutes(fastify: FastifyInstance) {
  // List transfers
  fastify.get('/api/transfers', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    const rows = await db.select({
      id: transfers.id,
      fromAccountId: transfers.fromAccountId,
      fromAccountName: sql<string>`(SELECT name FROM accounts WHERE id = ${transfers.fromAccountId})`,
      toAccountId: transfers.toAccountId,
      toAccountName: sql<string>`(SELECT name FROM accounts WHERE id = ${transfers.toAccountId})`,
      amount: transfers.amount,
      date: transfers.date,
      description: transfers.description,
      createdAt: transfers.createdAt,
    })
      .from(transfers)
      .where(eq(transfers.householdId, householdId))
      .orderBy(desc(transfers.date), desc(transfers.id))

    return reply.send(rows)
  })

  // Create transfer
  fastify.post('/api/transfers', { preHandler: [authenticate] }, async (req, reply) => {
    const body = transferSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const householdId = (req.user as any).householdId
    const userId = (req.user as any).sub
    const { fromAccountId, toAccountId, amount, date, description } = body.data

    if (fromAccountId === toAccountId) {
      return reply.code(400).send({ error: 'Les comptes source et destination doivent être différents.' })
    }

    // Verify accounts belong to household
    const [fromAcc, toAcc] = await Promise.all([
      db.query.accounts.findFirst({ where: (a, { eq, and }) => and(eq(a.id, fromAccountId), eq(a.householdId, householdId)) }),
      db.query.accounts.findFirst({ where: (a, { eq, and }) => and(eq(a.id, toAccountId), eq(a.householdId, householdId)) }),
    ])
    if (!fromAcc) return reply.code(404).send({ error: 'Compte source introuvable.' })
    if (!toAcc) return reply.code(404).send({ error: 'Compte destination introuvable.' })

    // Get or create Virements categories
    const [expenseCatId, incomeCatId] = await Promise.all([
      getOrCreateVirementCategory(householdId, 'expense'),
      getOrCreateVirementCategory(householdId, 'income'),
    ])

    // Create expense on fromAccount
    const [expenseTx] = await db.insert(expenseTransactions).values({
      householdId,
      userId,
      amount,
      date,
      categoryId: expenseCatId,
      description: description || `Virement vers ${toAcc.name}`,
      accountId: fromAccountId,
    }).returning()

    // Create income on toAccount
    const [incomeTx] = await db.insert(incomeTransactions).values({
      householdId,
      userId,
      amount,
      date,
      categoryId: incomeCatId,
      description: description || `Virement depuis ${fromAcc.name}`,
      isPayslip: false,
      accountId: toAccountId,
    }).returning()

    // Create the transfer record
    const [transfer] = await db.insert(transfers).values({
      householdId,
      fromAccountId,
      toAccountId,
      amount,
      date,
      description: description || null,
      expenseTransactionId: expenseTx.id,
      incomeTransactionId: incomeTx.id,
    }).returning()

    return reply.code(201).send({
      ...transfer,
      fromAccountName: fromAcc.name,
      toAccountName: toAcc.name,
    })
  })

  // Delete transfer
  fastify.delete('/api/transfers/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const id = parseInt((req.params as any).id, 10)
    const householdId = (req.user as any).householdId

    const transfer = await db.query.transfers.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.householdId, householdId)),
    })
    if (!transfer) return reply.code(404).send({ error: 'Not found' })

    // Delete linked transactions
    if (transfer.expenseTransactionId) {
      await db.delete(expenseTransactions).where(eq(expenseTransactions.id, transfer.expenseTransactionId))
    }
    if (transfer.incomeTransactionId) {
      await db.delete(incomeTransactions).where(eq(incomeTransactions.id, transfer.incomeTransactionId))
    }

    await db.delete(transfers).where(and(eq(transfers.id, id), eq(transfers.householdId, householdId)))
    return reply.send({ ok: true })
  })
}
