import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { incomeTransactions, incomeCategories, expenseTransactions, expenseCategories } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

const csvRowSchema = z.object({
  date: z.string(),
  libelleSimple: z.string(),
  libelleOperation: z.string(),
  reference: z.string(),
  typeOperation: z.string(),
  categorie: z.string(),
  sousCategorie: z.string(),
  debit: z.string(),
  credit: z.string(),
})

const importBodySchema = z.object({
  rows: z.array(csvRowSchema),
})

function parseAmount(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  // Remove + sign, replace comma with dot, strip spaces
  return parseFloat(raw.replace(/\s/g, '').replace('+', '').replace('-', '').replace(',', '.'))
}

function parseDate(raw: string): string {
  // dd/MM/yyyy -> yyyy-MM-dd
  const parts = raw.trim().split('/')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return raw
}

export async function importCsvRoutes(fastify: FastifyInstance) {
  fastify.post('/api/import/csv', { preHandler: [authenticate] }, async (req, reply) => {
    const body = importBodySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const householdId = (req.user as any).householdId
    const userId = (req.user as any).sub

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of body.data.rows) {
      try {
        // Skip only truly empty rows
        if (!row.date && !row.libelleSimple) {
          skipped++
          continue
        }

        const creditAmount = parseAmount(row.credit)
        const debitAmount = parseAmount(row.debit)
        const date = parseDate(row.date)
        const categoryName = row.categorie.trim() || 'Divers'

        if (creditAmount > 0) {
          // Income
          let cat = await db.query.incomeCategories.findFirst({
            where: (c, { eq, and }) => and(eq(c.householdId, householdId), eq(c.name, categoryName)),
          })
          if (!cat) {
            const [created] = await db.insert(incomeCategories).values({
              householdId,
              name: categoryName,
              isDefault: false,
              sortOrder: 0,
            }).returning()
            cat = created
          }

          await db.insert(incomeTransactions).values({
            householdId,
            userId,
            amount: creditAmount,
            date,
            categoryId: cat.id,
            description: row.libelleSimple.trim() || row.libelleOperation.trim() || 'Import CSV',
            notes: null,
            isPayslip: false,
            operationType: row.typeOperation.trim() || null,
            subcategory: row.sousCategorie.trim() || null,
            bankReference: row.reference.trim() || null,
            bankLabel: row.libelleOperation.trim() || null,
          })
          imported++
        } else if (debitAmount > 0) {
          // Expense
          let cat = await db.query.expenseCategories.findFirst({
            where: (c, { eq, and }) => and(eq(c.householdId, householdId), eq(c.name, categoryName)),
          })
          if (!cat) {
            const [created] = await db.insert(expenseCategories).values({
              householdId,
              name: categoryName,
              isDefault: false,
              sortOrder: 0,
            }).returning()
            cat = created
          }

          await db.insert(expenseTransactions).values({
            householdId,
            userId,
            amount: debitAmount,
            date,
            categoryId: cat.id,
            description: row.libelleSimple.trim() || row.libelleOperation.trim() || 'Import CSV',
            notes: null,
            operationType: row.typeOperation.trim() || null,
            subcategory: row.sousCategorie.trim() || null,
            bankReference: row.reference.trim() || null,
            bankLabel: row.libelleOperation.trim() || null,
          })
          imported++
        } else {
          skipped++
        }
      } catch (e: any) {
        errors.push(`Ligne "${row.libelleSimple}": ${e?.message ?? String(e)}`)
      }
    }

    return reply.send({ imported, skipped, errors })
  })
}
