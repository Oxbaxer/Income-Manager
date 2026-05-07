import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardTitle } from '@/components/ui/Card'
import { PageShell } from '@/components/layout/PageShell'
import { IncomeExpensesChart } from '@/components/charts/IncomeExpensesChart'
import { SavingsEvolutionChart } from '@/components/charts/SavingsEvolutionChart'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { IncomeCumulativeChart } from '@/components/charts/IncomeCumulativeChart'
import type { AnalyticsSummary, RecentTransaction, Period } from '@/types'

const PERIODS: Period[] = ['1m', '3m', '6m', '1y', '2y', '5y', 'all']

type ChartTab = 'compare' | 'savings' | 'categories' | 'income'

const CHART_TABS: { id: ChartTab; label: string }[] = [
  { id: 'compare', label: 'Revenus vs Dépenses' },
  { id: 'savings', label: 'Évolution épargne' },
  { id: 'categories', label: 'Dépenses par catégorie' },
  { id: 'income', label: 'Revenus cumulés' },
]

function KpiCard({
  label, value, delta, color,
}: {
  label: string
  value: number
  delta?: number
  color: 'green' | 'red' | 'blue'
}) {
  const colors = {
    green: { text: 'text-accent-green', border: 'border-accent-green/20', bg: 'bg-accent-green/5' },
    red:   { text: 'text-accent-red',   border: 'border-accent-red/20',   bg: 'bg-accent-red/5' },
    blue:  { text: 'text-primary-light', border: 'border-primary/20',     bg: 'bg-primary/5' },
  }
  const c = colors[color]

  return (
    <div className={`glass p-5 border ${c.border} ${c.bg} animate-fade-in`}>
      <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">{label}</p>
      <p className={`text-2xl font-bold font-mono tabular-nums ${c.text}`}>
        {formatCurrency(value)}
      </p>
      {delta !== undefined && (
        <p className={`text-xs mt-1 ${delta >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {delta >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(delta))} vs mois préc.
        </p>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('6m')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [recent, setRecent] = useState<RecentTransaction[]>([])
  const [activeChart, setActiveChart] = useState<ChartTab>('compare')

  useEffect(() => {
    api.get<AnalyticsSummary>(`/api/analytics/summary?period=${period}`)
      .then(setSummary).catch(() => {})
  }, [period])

  useEffect(() => {
    api.get<RecentTransaction[]>('/api/analytics/recent?limit=8')
      .then(setRecent).catch(() => {})
  }, [])

  return (
    <PageShell title={t('dashboard.title')}>
      {/* Period selector */}
      <div className="flex items-center gap-1 mb-5 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === p
                ? 'bg-primary text-white shadow-glow'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {t(`common.period.${p}`)}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <KpiCard label={t('dashboard.totalIncome')} value={summary?.totalIncome ?? 0} color="green" />
        <KpiCard label={t('dashboard.totalExpenses')} value={summary?.totalExpenses ?? 0} color="red" />
        <KpiCard label={t('dashboard.savings')} value={summary?.savings ?? 0} color="blue" />
      </div>

      {/* Charts */}
      <Card className="mb-5 p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto">
          {CHART_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeChart === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeChart === 'compare' && <IncomeExpensesChart period={period} />}
          {activeChart === 'savings' && <SavingsEvolutionChart period={period} />}
          {activeChart === 'categories' && <ExpensesByCategoryChart period={period} />}
          {activeChart === 'income' && <IncomeCumulativeChart period={period} />}
        </div>
      </Card>

      {/* Recent transactions */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
          <Link to="/income" className="text-xs text-primary hover:text-primary-light transition-colors">
            {t('dashboard.seeAll')} →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-10">{t('dashboard.noTransactions')}</p>
        ) : (
          <div>
            {recent.map(tx => (
              <div
                key={`${tx.type}-${tx.id}`}
                className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    tx.type === 'income'
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'bg-accent-red/10 text-accent-red'
                  }`}>
                    {tx.type === 'income' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white leading-tight">{tx.description}</p>
                    <p className="text-xs text-white/40 mt-0.5">{tx.categoryName} · {formatDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-mono font-semibold tabular-nums ${
                  tx.type === 'income' ? 'text-accent-green' : 'text-accent-red'
                }`}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  )
}
