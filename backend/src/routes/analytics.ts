import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { incomeTransactions, expenseTransactions, expenseCategories, incomeCategories } from '../db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

function getPeriodDates(period: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  const from = new Date(now)

  switch (period) {
    case '1m': from.setMonth(from.getMonth() - 1); break
    case '3m': from.setMonth(from.getMonth() - 3); break
    case '6m': from.setMonth(from.getMonth() - 6); break
    case '1y': from.setFullYear(from.getFullYear() - 1); break
    case '2y': from.setFullYear(from.getFullYear() - 2); break
    case '5y': from.setFullYear(from.getFullYear() - 5); break
    case 'all': return { from: '2000-01-01', to }
    default: from.setMonth(from.getMonth() - 1)
  }

  return { from: from.toISOString().split('T')[0], to }
}

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Summary: totals for the period
  fastify.get('/api/analytics/summary', { preHandler: [authenticate] }, async (req, reply) => {
    const { period = '1m' } = req.query as any
    const householdId = (req.user as any).householdId
    const { from, to } = getPeriodDates(period)

    const [incomeResult, expenseResult] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(incomeTransactions)
        .where(and(
          eq(incomeTransactions.householdId, householdId),
          gte(incomeTransactions.date, from),
          lte(incomeTransactions.date, to),
        )),
      db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(expenseTransactions)
        .where(and(
          eq(expenseTransactions.householdId, householdId),
          gte(expenseTransactions.date, from),
          lte(expenseTransactions.date, to),
        )),
    ])

    const totalIncome = Number(incomeResult[0].total)
    const totalExpenses = Number(expenseResult[0].total)

    return reply.send({
      period, from, to,
      totalIncome,
      totalExpenses,
      savings: totalIncome - totalExpenses,
    })
  })

  // Income vs expenses by month
  fastify.get('/api/analytics/income-vs-expenses', { preHandler: [authenticate] }, async (req, reply) => {
    const { period = '6m' } = req.query as any
    const householdId = (req.user as any).householdId
    const { from, to } = getPeriodDates(period)

    const [incomeRows, expenseRows] = await Promise.all([
      db.select({
        month: sql<string>`strftime('%Y-%m', date)`,
        total: sql<number>`SUM(amount)`,
      })
        .from(incomeTransactions)
        .where(and(
          eq(incomeTransactions.householdId, householdId),
          gte(incomeTransactions.date, from),
          lte(incomeTransactions.date, to),
        ))
        .groupBy(sql`strftime('%Y-%m', date)`)
        .orderBy(sql`strftime('%Y-%m', date)`),
      db.select({
        month: sql<string>`strftime('%Y-%m', date)`,
        total: sql<number>`SUM(amount)`,
      })
        .from(expenseTransactions)
        .where(and(
          eq(expenseTransactions.householdId, householdId),
          gte(expenseTransactions.date, from),
          lte(expenseTransactions.date, to),
        ))
        .groupBy(sql`strftime('%Y-%m', date)`)
        .orderBy(sql`strftime('%Y-%m', date)`),
    ])

    // Merge by month
    const months = new Set([...incomeRows.map(r => r.month), ...expenseRows.map(r => r.month)])
    const incomeMap = Object.fromEntries(incomeRows.map(r => [r.month, Number(r.total)]))
    const expenseMap = Object.fromEntries(expenseRows.map(r => [r.month, Number(r.total)]))

    const data = Array.from(months).sort().map(month => ({
      month,
      income: incomeMap[month] ?? 0,
      expenses: expenseMap[month] ?? 0,
      savings: (incomeMap[month] ?? 0) - (expenseMap[month] ?? 0),
    }))

    return reply.send(data)
  })

  // Expenses by category
  fastify.get('/api/analytics/expenses-by-category', { preHandler: [authenticate] }, async (req, reply) => {
    const { period = '1m' } = req.query as any
    const householdId = (req.user as any).householdId
    const { from, to } = getPeriodDates(period)

    const rows = await db.select({
      categoryId: expenseTransactions.categoryId,
      categoryName: expenseCategories.name,
      categoryIcon: expenseCategories.icon,
      categoryColor: expenseCategories.color,
      total: sql<number>`SUM(${expenseTransactions.amount})`,
    })
      .from(expenseTransactions)
      .leftJoin(expenseCategories, eq(expenseTransactions.categoryId, expenseCategories.id))
      .where(and(
        eq(expenseTransactions.householdId, householdId),
        gte(expenseTransactions.date, from),
        lte(expenseTransactions.date, to),
      ))
      .groupBy(expenseTransactions.categoryId)
      .orderBy(sql`SUM(${expenseTransactions.amount}) DESC`)

    return reply.send(rows.map(r => ({ ...r, total: Number(r.total) })))
  })

  // Savings evolution: cumulative (income - expenses) month by month
  fastify.get('/api/analytics/savings-evolution', { preHandler: [authenticate] }, async (req, reply) => {
    const { period = '6m' } = req.query as any
    const householdId = (req.user as any).householdId
    const { from, to } = getPeriodDates(period)

    const [incomeRows, expenseRows] = await Promise.all([
      db.select({
        month: sql<string>`strftime('%Y-%m', date)`,
        total: sql<number>`SUM(amount)`,
      })
        .from(incomeTransactions)
        .where(and(eq(incomeTransactions.householdId, householdId), gte(incomeTransactions.date, from), lte(incomeTransactions.date, to)))
        .groupBy(sql`strftime('%Y-%m', date)`)
        .orderBy(sql`strftime('%Y-%m', date)`),
      db.select({
        month: sql<string>`strftime('%Y-%m', date)`,
        total: sql<number>`SUM(amount)`,
      })
        .from(expenseTransactions)
        .where(and(eq(expenseTransactions.householdId, householdId), gte(expenseTransactions.date, from), lte(expenseTransactions.date, to)))
        .groupBy(sql`strftime('%Y-%m', date)`)
        .orderBy(sql`strftime('%Y-%m', date)`),
    ])

    const months = Array.from(new Set([...incomeRows.map(r => r.month), ...expenseRows.map(r => r.month)])).sort()
    const incomeMap = Object.fromEntries(incomeRows.map(r => [r.month, Number(r.total)]))
    const expenseMap = Object.fromEntries(expenseRows.map(r => [r.month, Number(r.total)]))

    let cumulative = 0
    const data = months.map(month => {
      const monthSavings = (incomeMap[month] ?? 0) - (expenseMap[month] ?? 0)
      cumulative += monthSavings
      return { month, income: incomeMap[month] ?? 0, expenses: expenseMap[month] ?? 0, savings: monthSavings, cumulative }
    })

    return reply.send(data)
  })

  // Cumulative income over time
  fastify.get('/api/analytics/income-cumulative', { preHandler: [authenticate] }, async (req, reply) => {
    const { period = '6m' } = req.query as any
    const householdId = (req.user as any).householdId
    const { from, to } = getPeriodDates(period)

    const [incomeRows, payslipRows] = await Promise.all([
      db.select({
        month: sql<string>`strftime('%Y-%m', date)`,
        netTotal: sql<number>`SUM(amount)`,
      })
        .from(incomeTransactions)
        .where(and(eq(incomeTransactions.householdId, householdId), gte(incomeTransactions.date, from), lte(incomeTransactions.date, to)))
        .groupBy(sql`strftime('%Y-%m', date)`)
        .orderBy(sql`strftime('%Y-%m', date)`),
      db.select({
        month: sql<string>`strftime('%Y-%m', ${incomeTransactions.date})`,
        grossTotal: sql<number>`SUM(pd.gross_amount)`,
      })
        .from(incomeTransactions)
        .innerJoin(sql`payslip_details pd`, sql`pd.transaction_id = ${incomeTransactions.id}`)
        .where(and(eq(incomeTransactions.householdId, householdId), gte(incomeTransactions.date, from), lte(incomeTransactions.date, to)))
        .groupBy(sql`strftime('%Y-%m', ${incomeTransactions.date})`)
        .orderBy(sql`strftime('%Y-%m', ${incomeTransactions.date})`),
    ])

    const months = Array.from(new Set(incomeRows.map(r => r.month))).sort()
    const netMap = Object.fromEntries(incomeRows.map(r => [r.month, Number(r.netTotal)]))
    const grossMap = Object.fromEntries(payslipRows.map(r => [r.month, Number(r.grossTotal)]))

    let cumulativeNet = 0
    let cumulativeGross = 0
    const data = months.map(month => {
      cumulativeNet += netMap[month] ?? 0
      cumulativeGross += grossMap[month] ?? netMap[month] ?? 0
      return {
        month,
        net: netMap[month] ?? 0,
        gross: grossMap[month] ?? netMap[month] ?? 0,
        cumulativeNet,
        cumulativeGross,
      }
    })

    return reply.send(data)
  })

  // Categories breakdown with transactions
  fastify.get('/api/analytics/categories', { preHandler: [authenticate] }, async (req, reply) => {
    const { type, from, to, accountId } = req.query as any
    const householdId = (req.user as any).householdId

    if (!type || (type !== 'income' && type !== 'expense')) {
      return reply.code(400).send({ error: 'type must be income or expense' })
    }

    if (type === 'expense') {
      const conditions: any[] = [eq(expenseTransactions.householdId, householdId)]
      if (from) conditions.push(gte(expenseTransactions.date, from))
      if (to) conditions.push(lte(expenseTransactions.date, to))
      if (accountId) conditions.push(eq(expenseTransactions.accountId, parseInt(accountId)))

      const txRows = await db.select({
        id: expenseTransactions.id,
        date: expenseTransactions.date,
        description: expenseTransactions.description,
        amount: expenseTransactions.amount,
        subcategory: expenseTransactions.subcategory,
        accountId: expenseTransactions.accountId,
        categoryId: expenseTransactions.categoryId,
        categoryName: expenseCategories.name,
        categoryColor: expenseCategories.color,
        categoryIcon: expenseCategories.icon,
      })
        .from(expenseTransactions)
        .leftJoin(expenseCategories, eq(expenseTransactions.categoryId, expenseCategories.id))
        .where(and(...conditions))
        .orderBy(expenseTransactions.date)

      // Group by category
      const catMap = new Map<number, {
        categoryId: number
        categoryName: string
        categoryColor: string
        categoryIcon: string
        total: number
        count: number
        transactions: any[]
      }>()

      for (const row of txRows) {
        const catId = row.categoryId
        if (!catMap.has(catId)) {
          catMap.set(catId, {
            categoryId: catId,
            categoryName: row.categoryName ?? 'Inconnu',
            categoryColor: row.categoryColor ?? '#6366f1',
            categoryIcon: row.categoryIcon ?? '💰',
            total: 0,
            count: 0,
            transactions: [],
          })
        }
        const entry = catMap.get(catId)!
        entry.total += row.amount
        entry.count += 1
        entry.transactions.push({
          id: row.id,
          date: row.date,
          description: row.description,
          amount: row.amount,
          subcategory: row.subcategory,
          accountId: row.accountId,
        })
      }

      const result = Array.from(catMap.values()).sort((a, b) => b.total - a.total)
      return reply.send(result)
    } else {
      // income
      const conditions: any[] = [eq(incomeTransactions.householdId, householdId)]
      if (from) conditions.push(gte(incomeTransactions.date, from))
      if (to) conditions.push(lte(incomeTransactions.date, to))
      if (accountId) conditions.push(eq(incomeTransactions.accountId, parseInt(accountId)))

      const txRows = await db.select({
        id: incomeTransactions.id,
        date: incomeTransactions.date,
        description: incomeTransactions.description,
        amount: incomeTransactions.amount,
        subcategory: incomeTransactions.subcategory,
        accountId: incomeTransactions.accountId,
        categoryId: incomeTransactions.categoryId,
        categoryName: incomeCategories.name,
      })
        .from(incomeTransactions)
        .leftJoin(incomeCategories, eq(incomeTransactions.categoryId, incomeCategories.id))
        .where(and(...conditions))
        .orderBy(incomeTransactions.date)

      const catMap = new Map<number, {
        categoryId: number
        categoryName: string
        categoryColor: string
        categoryIcon: string
        total: number
        count: number
        transactions: any[]
      }>()

      for (const row of txRows) {
        const catId = row.categoryId
        if (!catMap.has(catId)) {
          catMap.set(catId, {
            categoryId: catId,
            categoryName: row.categoryName ?? 'Inconnu',
            categoryColor: '#22c55e',
            categoryIcon: '💶',
            total: 0,
            count: 0,
            transactions: [],
          })
        }
        const entry = catMap.get(catId)!
        entry.total += row.amount
        entry.count += 1
        entry.transactions.push({
          id: row.id,
          date: row.date,
          description: row.description,
          amount: row.amount,
          subcategory: row.subcategory,
          accountId: row.accountId,
        })
      }

      const result = Array.from(catMap.values()).sort((a, b) => b.total - a.total)
      return reply.send(result)
    }
  })

  // Recent transactions (combined)
  fastify.get('/api/analytics/recent', { preHandler: [authenticate] }, async (req, reply) => {
    const { limit = '10' } = req.query as any
    const householdId = (req.user as any).householdId
    const n = parseInt(limit)

    const [income, expenses] = await Promise.all([
      db.select({
        id: incomeTransactions.id,
        type: sql<string>`'income'`,
        amount: incomeTransactions.amount,
        date: incomeTransactions.date,
        description: incomeTransactions.description,
        categoryName: sql<string>`(SELECT name FROM income_categories WHERE id = ${incomeTransactions.categoryId})`,
      })
        .from(incomeTransactions)
        .where(eq(incomeTransactions.householdId, householdId))
        .orderBy(sql`date DESC, id DESC`)
        .limit(n),
      db.select({
        id: expenseTransactions.id,
        type: sql<string>`'expense'`,
        amount: expenseTransactions.amount,
        date: expenseTransactions.date,
        description: expenseTransactions.description,
        categoryName: expenseCategories.name,
      })
        .from(expenseTransactions)
        .leftJoin(expenseCategories, eq(expenseTransactions.categoryId, expenseCategories.id))
        .where(eq(expenseTransactions.householdId, householdId))
        .orderBy(sql`${expenseTransactions.date} DESC, ${expenseTransactions.id} DESC`)
        .limit(n),
    ])

    const combined = [...income, ...expenses]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      .slice(0, n)

    return reply.send(combined)
  })
}
