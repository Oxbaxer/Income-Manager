import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import {
  incomeCategories, expenseCategories, recurringRules,
  incomeTransactions, payslipDetails, expenseTransactions,
  savingsGoals, savingsContributions, projectionScenarios,
} from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

export async function exportImportRoutes(fastify: FastifyInstance) {
  // Export full household data as JSON
  fastify.get('/api/export', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    const [
      iCats, eCats, recurring, income, expenses,
      goals, contributions, projections,
    ] = await Promise.all([
      db.select().from(incomeCategories).where(eq(incomeCategories.householdId, householdId)),
      db.select().from(expenseCategories).where(eq(expenseCategories.householdId, householdId)),
      db.select().from(recurringRules).where(eq(recurringRules.householdId, householdId)),
      db.select().from(incomeTransactions).where(eq(incomeTransactions.householdId, householdId)),
      db.select().from(expenseTransactions).where(eq(expenseTransactions.householdId, householdId)),
      db.select().from(savingsGoals).where(eq(savingsGoals.householdId, householdId)),
      db.select({
        id: savingsContributions.id,
        goalId: savingsContributions.goalId,
        userId: savingsContributions.userId,
        amount: savingsContributions.amount,
        date: savingsContributions.date,
        note: savingsContributions.note,
        isRecurring: savingsContributions.isRecurring,
        frequency: savingsContributions.frequency,
        nextDueDate: savingsContributions.nextDueDate,
        createdAt: savingsContributions.createdAt,
      }).from(savingsContributions)
        .innerJoin(savingsGoals, eq(savingsContributions.goalId, savingsGoals.id))
        .where(eq(savingsGoals.householdId, householdId)),
      db.select().from(projectionScenarios).where(eq(projectionScenarios.householdId, householdId)),
    ])

    // Include payslip details for income transactions
    const incomeTxIds = income.map(t => t.id)
    let payslips: any[] = []
    if (incomeTxIds.length > 0) {
      payslips = await db.select().from(payslipDetails)
        .where(sql`${payslipDetails.transactionId} IN (${sql.join(incomeTxIds.map(id => sql`${id}`), sql`, `)})`)
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      incomeCategories: iCats,
      expenseCategories: eCats,
      recurringRules: recurring,
      incomeTransactions: income,
      payslipDetails: payslips,
      expenseTransactions: expenses,
      savingsGoals: goals,
      savingsContributions: contributions,
      projectionScenarios: projections,
    }

    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', `attachment; filename="income-manager-export-${new Date().toISOString().split('T')[0]}.json"`)
    return reply.send(exportData)
  })
}
