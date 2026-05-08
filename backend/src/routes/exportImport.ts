import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import {
  incomeCategories, expenseCategories, recurringRules,
  incomeTransactions, payslipDetails, expenseTransactions,
  savingsGoals, savingsContributions, projectionScenarios,
} from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

function formatDateToDDMMYYYY(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return isoDate
}

function escapeCsvField(val: string | null | undefined): string {
  if (val == null || val === '') return ''
  const s = String(val)
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function exportImportRoutes(fastify: FastifyInstance) {
  // ── Export full household data as JSON ──────────────────────────────────────
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

  // ── Export transactions as CSV (re-importable format) ───────────────────────
  fastify.get('/api/export/csv', { preHandler: [authenticate] }, async (req, reply) => {
    const householdId = (req.user as any).householdId

    const [income, expenses, iCats, eCats] = await Promise.all([
      db.select().from(incomeTransactions).where(eq(incomeTransactions.householdId, householdId)),
      db.select().from(expenseTransactions).where(eq(expenseTransactions.householdId, householdId)),
      db.select().from(incomeCategories).where(eq(incomeCategories.householdId, householdId)),
      db.select().from(expenseCategories).where(eq(expenseCategories.householdId, householdId)),
    ])

    const iCatMap = new Map(iCats.map(c => [c.id, c.name]))
    const eCatMap = new Map(eCats.map(c => [c.id, c.name]))

    const header = 'Date;Libellé simplifié;Libellé opération;Référence;Type opération;Catégorie;Sous-catégorie;Débit;Crédit'
    const rows: string[] = [header]

    // Income transactions → Crédit column
    for (const tx of income) {
      rows.push([
        formatDateToDDMMYYYY(tx.date),
        escapeCsvField(tx.description),
        escapeCsvField((tx as any).bankLabel),
        escapeCsvField((tx as any).bankReference),
        escapeCsvField((tx as any).operationType),
        escapeCsvField(iCatMap.get(tx.categoryId)),
        escapeCsvField((tx as any).subcategory),
        '',                          // Débit vide
        tx.amount.toFixed(2),        // Crédit
      ].join(';'))
    }

    // Expense transactions → Débit column
    for (const tx of expenses) {
      rows.push([
        formatDateToDDMMYYYY(tx.date),
        escapeCsvField(tx.description),
        escapeCsvField((tx as any).bankLabel),
        escapeCsvField((tx as any).bankReference),
        escapeCsvField((tx as any).operationType),
        escapeCsvField(eCatMap.get(tx.categoryId)),
        escapeCsvField((tx as any).subcategory),
        tx.amount.toFixed(2),        // Débit
        '',                          // Crédit vide
      ].join(';'))
    }

    // UTF-8 BOM so Excel/LibreOffice open correctly, Windows line endings
    const csvContent = '﻿' + rows.join('\r\n')

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="income-manager-export-${new Date().toISOString().split('T')[0]}.csv"`)
    return reply.send(csvContent)
  })
}
