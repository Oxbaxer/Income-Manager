import { db } from '../db/client'
import { recurringRules, incomeTransactions, expenseTransactions, savingsContributions, savingsGoals } from '../db/schema'
import { and, eq, lte, sql } from 'drizzle-orm'
import { nextDueDate } from '../routes/recurring'

async function processRecurringRules() {
  const today = new Date().toISOString().split('T')[0]

  const dueRules = await db.select().from(recurringRules)
    .where(and(
      eq(recurringRules.isActive, true),
      lte(recurringRules.nextDueDate, today),
    ))

  for (const rule of dueRules) {
    if (rule.endDate && rule.nextDueDate > rule.endDate) {
      await db.update(recurringRules).set({ isActive: false }).where(eq(recurringRules.id, rule.id))
      continue
    }

    if (rule.type === 'income') {
      await db.insert(incomeTransactions).values({
        householdId: rule.householdId,
        userId: rule.userId,
        amount: rule.amount,
        date: rule.nextDueDate,
        categoryId: rule.categoryId,
        description: rule.description,
        isPayslip: false,
      })
    } else {
      await db.insert(expenseTransactions).values({
        householdId: rule.householdId,
        userId: rule.userId,
        amount: rule.amount,
        date: rule.nextDueDate,
        categoryId: rule.categoryId,
        description: rule.description,
        recurringId: rule.id,
      })
    }

    const next = nextDueDate(rule.nextDueDate, rule.frequency)
    await db.update(recurringRules)
      .set({ nextDueDate: next })
      .where(eq(recurringRules.id, rule.id))
  }

  if (dueRules.length > 0) {
    console.log(`[cron] Processed ${dueRules.length} recurring rule(s)`)
  }
}

async function processRecurringContributions() {
  const today = new Date().toISOString().split('T')[0]

  const dueContribs = await db.select().from(savingsContributions)
    .where(and(
      eq(savingsContributions.isRecurring, true),
      lte(savingsContributions.nextDueDate as any, today),
    ))

  for (const contrib of dueContribs) {
    await db.insert(savingsContributions).values({
      goalId: contrib.goalId,
      userId: contrib.userId,
      amount: contrib.amount,
      date: contrib.nextDueDate!,
      note: contrib.note,
      isRecurring: false,
    })

    await db.update(savingsGoals)
      .set({ currentAmount: sql`current_amount + ${contrib.amount}` })
      .where(eq(savingsGoals.id, contrib.goalId))

    const next = nextDueDate(contrib.nextDueDate!, contrib.frequency!)
    await db.update(savingsContributions)
      .set({ nextDueDate: next })
      .where(eq(savingsContributions.id, contrib.id))
  }

  if (dueContribs.length > 0) {
    console.log(`[cron] Processed ${dueContribs.length} recurring contribution(s)`)
  }
}

export function startCron() {
  const INTERVAL_MS = 60 * 60 * 1000 // every hour

  async function run() {
    try {
      await processRecurringRules()
      await processRecurringContributions()
    } catch (err) {
      console.error('[cron] Error:', err)
    }
  }

  // Run once at startup, then on interval
  run()
  setInterval(run, INTERVAL_MS)
  console.log('[cron] Scheduler started (hourly)')
}
