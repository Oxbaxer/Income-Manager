import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { savingsGoals, savingsContributions } from '../db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'
import { nextDueDate } from './recurring'

export async function goalsRoutes(fastify: FastifyInstance) {
  // List goals with contribution history
  fastify.get('/api/goals', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    const goals = await db.select().from(savingsGoals)
      .where(eq(savingsGoals.householdId, householdId))
      .orderBy(desc(savingsGoals.createdAt))

    return reply.send(goals)
  })

  // Create goal
  fastify.post('/api/goals', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const { name, targetAmount, targetDate } = req.body as any

    const [goal] = await db.insert(savingsGoals).values({
      householdId,
      name,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      targetDate: targetDate || null,
    }).returning()

    return reply.status(201).send(goal)
  })

  // Update goal
  fastify.patch('/api/goals/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const id = Number((req.params as any).id)
    const { name, targetAmount, targetDate } = req.body as any

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (targetAmount !== undefined) updates.targetAmount = Number(targetAmount)
    if (targetDate !== undefined) updates.targetDate = targetDate

    const [updated] = await db.update(savingsGoals)
      .set(updates)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.householdId, householdId)))
      .returning()

    if (!updated) return reply.status(404).send({ error: 'Not found' })
    return reply.send(updated)
  })

  // Delete goal
  fastify.delete('/api/goals/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const id = Number((req.params as any).id)

    await db.delete(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.householdId, householdId)))

    return reply.status(204).send()
  })

  // Get contributions for a goal
  fastify.get('/api/goals/:id/contributions', { preHandler: [authenticate] }, async (req, reply) => {
    const id = Number((req.params as any).id)

    const contributions = await db.select().from(savingsContributions)
      .where(eq(savingsContributions.goalId, id))
      .orderBy(desc(savingsContributions.date))

    return reply.send(contributions)
  })

  // Add contribution
  fastify.post('/api/goals/:id/contributions', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const userId = (req.user as any).sub
    const goalId = Number((req.params as any).id)
    const { amount, date, note, isRecurring, frequency } = req.body as any

    // Verify goal belongs to household
    const goal = await db.query.savingsGoals.findFirst({
      where: and(eq(savingsGoals.id, goalId), eq(savingsGoals.householdId, householdId)),
    })
    if (!goal) return reply.status(404).send({ error: 'Goal not found' })

    const contrib = await db.insert(savingsContributions).values({
      goalId,
      userId,
      amount: Number(amount),
      date,
      note: note || null,
      isRecurring: isRecurring ? true : false,
      frequency: isRecurring ? frequency : null,
      nextDueDate: isRecurring ? nextDueDate(date, frequency) : null,
    }).returning()

    // Update current amount
    await db.update(savingsGoals)
      .set({ currentAmount: sql`current_amount + ${Number(amount)}` })
      .where(eq(savingsGoals.id, goalId))

    return reply.status(201).send(contrib[0])
  })

  // Delete contribution
  fastify.delete('/api/goals/:id/contributions/:cid', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const goalId = Number((req.params as any).id)
    const cid = Number((req.params as any).cid)

    const contrib = await db.query.savingsContributions.findFirst({
      where: eq(savingsContributions.id, cid),
    })
    if (!contrib || contrib.goalId !== goalId) return reply.status(404).send({ error: 'Not found' })

    await db.delete(savingsContributions).where(eq(savingsContributions.id, cid))

    // Subtract from current amount
    await db.update(savingsGoals)
      .set({ currentAmount: sql`MAX(0, current_amount - ${contrib.amount})` })
      .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.householdId, householdId)))

    return reply.status(204).send()
  })
}
