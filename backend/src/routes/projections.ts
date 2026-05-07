import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { projectionScenarios } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

function computeProjection(params: {
  initialAmount: number
  monthlyContribution: number
  annualRatePercent: number
  durationYears: number
  startDate: string
}) {
  const { initialAmount, monthlyContribution, annualRatePercent, durationYears, startDate } = params
  const monthlyRate = annualRatePercent / 100 / 12
  const totalMonths = durationYears * 12
  const points: Array<{ month: string; value: number; contributions: number; interest: number }> = []

  let value = initialAmount
  let totalContributions = initialAmount
  const start = new Date(startDate)

  for (let i = 0; i <= totalMonths; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    const month = d.toISOString().slice(0, 7)

    points.push({
      month,
      value: Math.round(value * 100) / 100,
      contributions: Math.round(totalContributions * 100) / 100,
      interest: Math.round((value - totalContributions) * 100) / 100,
    })

    if (i < totalMonths) {
      value = value * (1 + monthlyRate) + monthlyContribution
      totalContributions += monthlyContribution
    }
  }

  const final = points[points.length - 1]
  return {
    points,
    summary: {
      finalValue: final.value,
      totalContributions: final.contributions,
      totalInterest: final.interest,
      effectiveRate: annualRatePercent,
    },
  }
}

export async function projectionsRoutes(fastify: FastifyInstance) {
  // List scenarios
  fastify.get('/api/projections', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    const scenarios = await db.select().from(projectionScenarios)
      .where(eq(projectionScenarios.householdId, householdId))
      .orderBy(desc(projectionScenarios.createdAt))

    return reply.send(scenarios)
  })

  // Create scenario
  fastify.post('/api/projections', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const { name, initialAmount, monthlyContribution, annualRatePercent, startDate, durationYears } = req.body as any

    const [scenario] = await db.insert(projectionScenarios).values({
      householdId,
      name,
      initialAmount: Number(initialAmount),
      monthlyContribution: Number(monthlyContribution),
      annualRatePercent: Number(annualRatePercent),
      startDate,
      durationYears: Number(durationYears),
    }).returning()

    return reply.status(201).send(scenario)
  })

  // Update scenario
  fastify.patch('/api/projections/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const id = Number((req.params as any).id)
    const { name, initialAmount, monthlyContribution, annualRatePercent, startDate, durationYears } = req.body as any

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (initialAmount !== undefined) updates.initialAmount = Number(initialAmount)
    if (monthlyContribution !== undefined) updates.monthlyContribution = Number(monthlyContribution)
    if (annualRatePercent !== undefined) updates.annualRatePercent = Number(annualRatePercent)
    if (startDate !== undefined) updates.startDate = startDate
    if (durationYears !== undefined) updates.durationYears = Number(durationYears)

    const [updated] = await db.update(projectionScenarios)
      .set(updates)
      .where(and(eq(projectionScenarios.id, id), eq(projectionScenarios.householdId, householdId)))
      .returning()

    if (!updated) return reply.status(404).send({ error: 'Not found' })
    return reply.send(updated)
  })

  // Delete scenario
  fastify.delete('/api/projections/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const id = Number((req.params as any).id)

    await db.delete(projectionScenarios)
      .where(and(eq(projectionScenarios.id, id), eq(projectionScenarios.householdId, householdId)))

    return reply.status(204).send()
  })

  // Compute projection (without saving)
  fastify.post('/api/projections/compute', { preHandler: [authenticate] }, async (req, reply) => {
    const { initialAmount, monthlyContribution, annualRatePercent, startDate, durationYears } = req.body as any

    const result = computeProjection({
      initialAmount: Number(initialAmount),
      monthlyContribution: Number(monthlyContribution),
      annualRatePercent: Number(annualRatePercent),
      startDate: startDate ?? new Date().toISOString().split('T')[0],
      durationYears: Number(durationYears),
    })

    return reply.send(result)
  })

  // Compute saved scenario
  fastify.get('/api/projections/:id/compute', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId
    const id = Number((req.params as any).id)

    const scenario = await db.query.projectionScenarios.findFirst({
      where: and(eq(projectionScenarios.id, id), eq(projectionScenarios.householdId, householdId)),
    })
    if (!scenario) return reply.status(404).send({ error: 'Not found' })

    const result = computeProjection(scenario)
    return reply.send({ ...scenario, ...result })
  })
}
