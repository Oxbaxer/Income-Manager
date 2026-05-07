import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '@/api/client'
import { formatMonth, formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { Period } from '@/types'

interface CumulativePoint {
  month: string
  net: number
  gross: number
  cumulativeNet: number
  cumulativeGross: number
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

export function IncomeCumulativeChart({ period }: { period: Period }) {
  const { i18n, t } = useTranslation()
  const [data, setData] = useState<CumulativePoint[]>([])
  const [view, setView] = useState<'cumulative' | 'monthly'>('cumulative')

  useEffect(() => {
    api.get<CumulativePoint[]>(`/api/analytics/income-cumulative?period=${period}`)
      .then(setData).catch(() => {})
  }, [period])

  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US'
  const chartData = data.map(d => ({ ...d, month: formatMonth(d.month, locale) }))

  if (!chartData.length) return (
    <div className="flex items-center justify-center h-52 text-white/30 text-sm">{t('common.noData')}</div>
  )

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(['cumulative', 'monthly'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${view === v ? 'bg-primary/20 text-primary border border-primary/30' : 'text-white/40 hover:text-white'}`}>
            {v === 'cumulative' ? 'Cumulé' : 'Mensuel'}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
          {view === 'cumulative' ? (
            <>
              <Area type="monotone" dataKey="cumulativeGross" name="Brut cumulé" stroke="#f59e0b"
                strokeWidth={2} fill="url(#gradGross)" dot={false} />
              <Area type="monotone" dataKey="cumulativeNet" name="Net cumulé" stroke="#22d3ee"
                strokeWidth={2} fill="url(#gradNet)" dot={false} />
            </>
          ) : (
            <>
              <Area type="monotone" dataKey="gross" name="Brut mensuel" stroke="#f59e0b"
                strokeWidth={2} fill="url(#gradGross)" dot={false} />
              <Area type="monotone" dataKey="net" name="Net mensuel" stroke="#22d3ee"
                strokeWidth={2} fill="url(#gradNet)" dot={false} />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
