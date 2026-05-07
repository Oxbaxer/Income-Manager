import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '@/api/client'
import { formatMonth, formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { MonthlyData, Period } from '@/types'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-4 py-3 text-sm">
      <p className="text-white/60 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

interface Props { period: Period }

export function IncomeExpensesChart({ period }: Props) {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<MonthlyData[]>([])

  useEffect(() => {
    api.get<MonthlyData[]>(`/api/analytics/income-vs-expenses?period=${period}`)
      .then(d => setData(d))
      .catch(() => {})
  }, [period])

  const chartData = data.map(d => ({
    ...d,
    month: formatMonth(d.month, i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
  }))

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barGap={4} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
        <Bar dataKey="income" name={t('dashboard.totalIncome')} fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name={t('dashboard.totalExpenses')} fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
