import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '@/api/client'
import { formatCurrency } from '@/lib/utils'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardTitle } from '@/components/ui/Card'
import type { ProjectionScenario } from '@/types'

interface ComputeResult {
  points: Array<{ month: string; value: number; contributions: number; interest: number }>
  summary: { finalValue: number; totalContributions: number; totalInterest: number; effectiveRate: number }
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

interface ScenarioFormProps {
  scenario?: ProjectionScenario | null
  onClose: () => void
  onSuccess: () => void
}

function ScenarioModal({ scenario, onClose, onSuccess }: ScenarioFormProps) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: scenario?.name ?? '',
      initialAmount: scenario?.initialAmount?.toString() ?? '0',
      monthlyContribution: scenario?.monthlyContribution?.toString() ?? '500',
      annualRatePercent: scenario?.annualRatePercent?.toString() ?? '5',
      startDate: scenario?.startDate ?? new Date().toISOString().split('T')[0],
      durationYears: scenario?.durationYears?.toString() ?? '10',
    },
  })

  const onSubmit = async (data: any) => {
    const payload = {
      name: data.name,
      initialAmount: Number(data.initialAmount),
      monthlyContribution: Number(data.monthlyContribution),
      annualRatePercent: Number(data.annualRatePercent),
      startDate: data.startDate,
      durationYears: Number(data.durationYears),
    }
    if (scenario) {
      await api.patch(`/api/projections/${scenario.id}`, payload)
    } else {
      await api.post('/api/projections', payload)
    }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {scenario ? 'Modifier le scénario' : 'Nouveau scénario'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Nom du scénario</label>
            <input type="text" {...register('name', { required: true })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              placeholder="Plan retraite, projet immobilier..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Capital initial (€)</label>
              <input type="number" step="100" min="0" {...register('initialAmount', { required: true })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Versement mensuel (€)</label>
              <input type="number" step="50" min="0" {...register('monthlyContribution', { required: true })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Taux annuel (%)</label>
              <input type="number" step="0.1" min="0" max="50" {...register('annualRatePercent', { required: true })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Durée (années)</label>
              <input type="number" step="1" min="1" max="50" {...register('durationYears', { required: true })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Date de début</label>
            <input type="date" {...register('startDate', { required: true })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-white/60 hover:text-white hover:border-white/20 text-sm transition-all">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-all shadow-glow disabled:opacity-50">
              {isSubmitting ? 'Enregistrement...' : (scenario ? 'Mettre à jour' : 'Créer le scénario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface SimulatorProps {
  initialScenario?: ProjectionScenario | null
}

function LiveSimulator({ initialScenario }: SimulatorProps) {
  const [params, setParams] = useState({
    initialAmount: initialScenario?.initialAmount ?? 0,
    monthlyContribution: initialScenario?.monthlyContribution ?? 500,
    annualRatePercent: initialScenario?.annualRatePercent ?? 5,
    durationYears: initialScenario?.durationYears ?? 20,
    startDate: initialScenario?.startDate ?? new Date().toISOString().split('T')[0],
  })
  const [result, setResult] = useState<ComputeResult | null>(null)
  const [, setLoading] = useState(false)

  const compute = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.post<ComputeResult>('/api/projections/compute', params)
      setResult(r)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    const timer = setTimeout(compute, 300)
    return () => clearTimeout(timer)
  }, [compute])

  const yearlyPoints = result?.points.filter((_, i) => i % 12 === 0) ?? []

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'initialAmount', label: 'Capital initial (€)', step: 1000, min: 0 },
          { key: 'monthlyContribution', label: 'Versement/mois (€)', step: 50, min: 0 },
          { key: 'annualRatePercent', label: 'Taux annuel (%)', step: 0.5, min: 0 },
          { key: 'durationYears', label: 'Durée (ans)', step: 1, min: 1 },
        ].map(({ key, label, step, min }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
            <input
              type="number" step={step} min={min}
              value={(params as any)[key]}
              onChange={e => setParams(p => ({ ...p, [key]: Number(e.target.value) }))}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        ))}
      </div>

      {/* Summary KPIs */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass p-4 border border-accent-green/20 bg-accent-green/5">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Capital final</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-accent-green">{formatCurrency(result.summary.finalValue)}</p>
          </div>
          <div className="glass p-4 border border-primary/20 bg-primary/5">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total versé</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-primary-light">{formatCurrency(result.summary.totalContributions)}</p>
          </div>
          <div className="glass p-4 border border-accent-amber/20 bg-accent-amber/5">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Intérêts générés</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-accent-amber">{formatCurrency(result.summary.totalInterest)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {result && yearlyPoints.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyPoints}>
              <defs>
                <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
              <Area type="monotone" dataKey="value" name="Capital total" stroke="#10b981" strokeWidth={2} fill="url(#gradValue)" dot={false} />
              <Area type="monotone" dataKey="contributions" name="Versements cumulés" stroke="#6366f1" strokeWidth={2} fill="url(#gradContrib)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function ProjectionsPage() {
  const { t } = useTranslation()
  const [scenarios, setScenarios] = useState<ProjectionScenario[]>([])
  const [activeScenario, setActiveScenario] = useState<ProjectionScenario | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingScenario, setEditingScenario] = useState<ProjectionScenario | null | undefined>(undefined)

  const load = () => {
    api.get<ProjectionScenario[]>('/api/projections').then(data => {
      setScenarios(data)
      if (data.length > 0 && !activeScenario) setActiveScenario(data[0])
    }).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce scénario ?')) return
    await api.delete(`/api/projections/${id}`)
    if (activeScenario?.id === id) setActiveScenario(null)
    load()
  }

  return (
    <PageShell title={t('projections.title')}>
      <div className="flex gap-5">
        {/* Sidebar: saved scenarios */}
        <div className="w-64 flex-shrink-0 space-y-2">
          <button
            onClick={() => { setEditingScenario(null); setShowModal(true) }}
            className="w-full px-4 py-2.5 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-lg transition-all shadow-glow"
          >
            + Nouveau scénario
          </button>

          {scenarios.length === 0 && (
            <p className="text-xs text-white/30 text-center py-4">Aucun scénario sauvegardé</p>
          )}

          {scenarios.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveScenario(s)}
              className={`glass-hover p-3 cursor-pointer rounded-xl border transition-all ${
                activeScenario?.id === s.id ? 'border-primary/40 bg-primary/10' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-white leading-tight flex-1 mr-2">{s.name}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); setEditingScenario(s); setShowModal(true) }}
                    className="text-white/30 hover:text-primary text-xs px-1 transition-colors">✎</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                    className="text-white/30 hover:text-accent-red text-xs px-1 transition-colors">✕</button>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-1">{s.annualRatePercent}% · {s.durationYears} ans</p>
              <p className="text-xs text-primary-light font-mono mt-0.5">{formatCurrency(s.monthlyContribution)}/mois</p>
            </div>
          ))}
        </div>

        {/* Main: live simulator */}
        <div className="flex-1">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <CardTitle>Simulateur interactif</CardTitle>
              {activeScenario && (
                <span className="text-xs text-primary-light bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
                  {activeScenario.name}
                </span>
              )}
            </div>
            <LiveSimulator initialScenario={activeScenario} key={activeScenario?.id ?? 'default'} />
          </Card>
        </div>
      </div>

      {showModal && (
        <ScenarioModal
          scenario={editingScenario}
          onClose={() => { setShowModal(false); setEditingScenario(undefined) }}
          onSuccess={load}
        />
      )}
    </PageShell>
  )
}
