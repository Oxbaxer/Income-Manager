import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const timestamps = {
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
}

export const households = sqliteTable('households', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  ...timestamps,
})

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  locale: text('locale', { enum: ['fr', 'en'] }).notNull().default('fr'),
  ...timestamps,
})

export const incomeCategories = sqliteTable('income_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
})

export const expenseCategories = sqliteTable('expense_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  icon: text('icon').default('💰'),
  color: text('color').default('#6366f1'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
})

export const recurringRules = sqliteTable('recurring_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: real('amount').notNull(),
  categoryId: integer('category_id').notNull(),
  description: text('description').notNull(),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  nextDueDate: text('next_due_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

export const incomeTransactions = sqliteTable('income_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  categoryId: integer('category_id').notNull().references(() => incomeCategories.id),
  description: text('description').notNull(),
  notes: text('notes'),
  isPayslip: integer('is_payslip', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
})

export const payslipDetails = sqliteTable('payslip_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transactionId: integer('transaction_id').notNull().references(() => incomeTransactions.id, { onDelete: 'cascade' }),
  grossAmount: real('gross_amount').notNull(),
  netAmount: real('net_amount').notNull(),
  contributions: real('contributions').notNull().default(0),
  bonuses: real('bonuses').notNull().default(0),
  employerName: text('employer_name'),
  periodLabel: text('period_label'),
})

export const expenseTransactions = sqliteTable('expense_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  categoryId: integer('category_id').notNull().references(() => expenseCategories.id),
  description: text('description').notNull(),
  notes: text('notes'),
  recurringId: integer('recurring_id').references(() => recurringRules.id),
  ...timestamps,
})

export const savingsGoals = sqliteTable('savings_goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  targetDate: text('target_date'),
  ...timestamps,
})

export const savingsContributions = sqliteTable('savings_contributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  goalId: integer('goal_id').notNull().references(() => savingsGoals.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  note: text('note'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'yearly'] }),
  nextDueDate: text('next_due_date'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
})

export const projectionScenarios = sqliteTable('projection_scenarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  initialAmount: real('initial_amount').notNull(),
  monthlyContribution: real('monthly_contribution').notNull(),
  annualRatePercent: real('annual_rate_percent').notNull(),
  startDate: text('start_date').notNull(),
  durationYears: integer('duration_years').notNull(),
  ...timestamps,
})
