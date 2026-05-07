import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { recurringRules, incomeCategories, expenseCategories } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

function nextDueDate(current: string, frequency: string): string {
  const d = new Date(current)
  switch (frequency) {
    case 'weekly':  d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

export async function recurringRoutes(fastify: FastifyInstance) {
  // List all recurring rules
  fastify.get('/api/recurring', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    const rules = await db.select({
      id: recurringRules.id,
      type: recurringRules.type,
      amount: recurringRules.amount,
      categoryId: recurringRules.categoryId,
      description: recurringRules.description,
      frequency: recurringRules.frequency,
      startDate: recurringRules.startDate,
      endDate: recurringRules.endDate,
      nextDueDate: recurringRules.nextDueDate,
      isActive: recurringRules.isActive,
      createdAt: recurringRules.createdAt,
      categoryName: sql<string>`COALESCE(
        (SELECT name FROM income_categories WHERE id = ${recurringRules.categoryId} AND household_id = ${householdId}),
        (SELECT name FROM expense_categories WHERE id = ${recurringRules.categoryId} AND household_id = ${householdId})
      )`,
    })
      .from(recurringRules)
      .where(eq(recurringRules.householdId, householdId))
      .orderBy(sql`${recurringRules.createdAt} DESC`)

    return reply.send(rules)
  })

  // Create recurring rule
  fastify.post('/api/recurring', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const userId = (req.user as any).sub
    const { type, amount, categoryId, description, frequency, startDate, endDate } = req.body as any

    const [rule] = await db.insert(recurringRules).values({
      householdId,
      userId,
      type,
      amount: Number(amount),
      categoryId: Number(categoryId),
      description,
      frequency,
      startDate,
      endDate: endDate || null,
      nextDueDate: startDate,
      isActive: true,
    }).returning()

    return reply.status(201).send(rule)
  })

  // Update recurring rule
  fastify.patch('/api/recurring/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const id = Number((req.params as any).id)
    const { amount, categoryId, description, frequency, endDate, isActive } = req.body as any

    const updates: any = {}
    if (amount !== undefined) updates.amount = Number(amount)
    if (categoryId !== undefined) updates.categoryId = Number(categoryId)
    if (description !== undefined) updates.description = description
    if (frequency !== undefined) updates.frequency = frequency
    if (endDate !== undefined) updates.endDate = endDate
    if (isActive !== undefined) updates.isActive = isActive

    const [updated] = await db.update(recurringRules)
      .set(updates)
      .where(and(eq(recurringRules.id, id), eq(recurringRules.householdId, householdId)))
      .returning()

    if (!updated) return reply.status(404).send({ error: 'Not found' })
    return reply.send(updated)
  })

  // Delete recurring rule
  fastify.delete('/api/recurring/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const id = Number((req.params as any).id)

    await db.delete(recurringRules)
      .where(and(eq(recurringRules.id, id), eq(recurringRules.householdId, householdId)))

    return reply.status(204).send()
  })
}

export { nextDueDate }
