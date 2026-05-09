export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'member'
  locale: 'fr' | 'en'
}

export interface IncomeCategory {
  id: number
  householdId: number
  name: string
  isDefault: boolean
  sortOrder: number
}

export interface ExpenseCategory {
  id: number
  householdId: number
  name: string
  parentId: number | null
  isDefault: boolean
  icon: string
  color: string
  sortOrder: number
}

export interface Account {
  id: number
  name: string
  type: 'checking' | 'savings' | 'investment' | 'cash'
  startingBalance: number
  balance: number
  color: string
  icon: string
  sortOrder: number
}

export interface Transfer {
  id: number
  fromAccountId: number
  fromAccountName: string
  toAccountId: number
  toAccountName: string
  amount: number
  date: string
  description: string | null
}

export interface IncomeTransaction {
  id: number
  amount: number
  date: string
  categoryId: number
  categoryName?: string
  description: string
  notes?: string
  isPayslip: boolean
  operationType?: string
  subcategory?: string
  bankReference?: string
  bankLabel?: string
  accountId?: number
  accountName?: string
  createdAt: string
}

export interface PayslipDetails {
  grossAmount: number
  netAmount: number
  contributions: number
  bonuses: number
  employerName?: string
  periodLabel?: string
}

export interface ExpenseTransaction {
  id: number
  amount: number
  date: string
  categoryId: number
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  description: string
  notes?: string
  recurringId?: number
  operationType?: string
  subcategory?: string
  bankReference?: string
  bankLabel?: string
  accountId?: number
  accountName?: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface AnalyticsSummary {
  period: string
  from: string
  to: string
  totalIncome: number
  totalExpenses: number
  savings: number
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}

export interface CategoryBreakdown {
  categoryId: number
  categoryName: string
  categoryIcon: string
  categoryColor: string
  total: number
}

export interface RecentTransaction {
  id: number
  type: 'income' | 'expense'
  amount: number
  date: string
  description: string
  categoryName: string
}

export type Period = '1m' | '3m' | '6m' | '1y' | '2y' | '5y' | 'all'

export interface RecurringRule {
  id: number
  type: 'income' | 'expense'
  amount: number
  categoryId: number
  categoryName?: string
  description: string
  frequency: 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate?: string
  nextDueDate: string
  isActive: boolean
  createdAt: string
}

export interface SavingsGoal {
  id: number
  householdId: number
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectionScenario {
  id: number
  householdId: number
  name: string
  initialAmount: number
  monthlyContribution: number
  annualRatePercent: number
  startDate: string
  durationYears: number
  createdAt: string
  updatedAt: string
}

export interface SavingsContribution {
  id: number
  goalId: number
  userId: number
  amount: number
  date: string
  note?: string
  isRecurring: boolean
  frequency?: 'weekly' | 'monthly' | 'yearly'
  nextDueDate?: string
  createdAt: string
}
