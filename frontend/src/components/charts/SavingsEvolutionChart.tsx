import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { api } from '@/api/client'
import { formatMonth, formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { Period } from '@/types'

interface SavingsPoint {
  month: string
  income: number
  expenses: number
  savings: number
  cumulative: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-4 py-3 text-sm space-y-1">
      <p className="text-white/60 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-semibold">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function SavingsEvolutionChart({ period }: { period: Period }) {
  const { i18n, t } = useTranslation()
  const [data, setData] = useState<SavingsPoint[]>([])

  useEffect(() => {
    api.get<SavingsPoint[]>(`/api/analytics/savings-evolution?period=${period}`)
      .then(setData).catch(() => {})
  }, [period])

  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US'
  const chartData = data.map(d => ({ ...d, month: formatMonth(d.month, locale) }))

  if (!chartData.length) return (
    <div className="flex items-center justify-center h-52 text-white/30 text-sm">{t('common.noData')}</div>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSavings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="cumulative" name="Épargne cumulée" stroke="#10b981"
          strokeWidth={2} fill="url(#gradCumulative)" dot={false} />
        <Area type="monotone" dataKey="savings" name="Épargne mensuelle" stroke="#6366f1"
          strokeWidth={2} fill="url(#gradSavings)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
