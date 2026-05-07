import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/api/client'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { CategoryBreakdown, Period } from '@/types'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="glass px-3 py-2 text-sm">
      <p className="font-medium text-white">{d.categoryIcon} {d.categoryName}</p>
      <p className="font-mono text-white/70">{formatCurrency(d.total)}</p>
      <p className="text-xs text-white/40">{d.percent?.toFixed(1)}%</p>
    </div>
  )
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="rgba(255,255,255,0.85)" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export function ExpensesByCategoryChart({ period }: { period: Period }) {
  const { t } = useTranslation()
  const [data, setData] = useState<CategoryBreakdown[]>([])

  useEffect(() => {
    api.get<CategoryBreakdown[]>(`/api/analytics/expenses-by-category?period=${period}`)
      .then(setData).catch(() => {})
  }, [period])

  if (!data.length) return (
    <div className="flex items-center justify-center h-52 text-white/30 text-sm">{t('common.noData')}</div>
  )

  const total = data.reduce((s, d) => s + d.total, 0)
  const enriched = data.map(d => ({ ...d, percent: d.total / total * 100 }))

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div style={{ width: 200, height: 200, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={enriched} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
              dataKey="total" labelLine={false} label={<CustomLabel />}>
              {enriched.map((entry, i) => (
                <Cell key={i} fill={entry.categoryColor ?? '#6366f1'}
                  stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2 min-w-0">
        {enriched.slice(0, 8).map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.categoryColor ?? '#6366f1' }} />
              <span className="text-xs text-white/70 truncate">{d.categoryIcon} {d.categoryName}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${d.percent}%`, backgroundColor: d.categoryColor ?? '#6366f1' }} />
              </div>
              <span className="text-xs font-mono text-white/60 w-16 text-right">{formatCurrency(d.total)}</span>
            </div>
          </div>
        ))}
        {enriched.length > 8 && (
          <p className="text-xs text-white/30">+{enriched.length - 8} autres</p>
        )}
        <div className="pt-2 border-t border-border flex justify-between text-xs">
          <span className="text-white/40">{t('common.total')}</span>
          <span className="font-mono font-semibold text-accent-red">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
