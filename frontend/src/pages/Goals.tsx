import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { api } from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import type { SavingsGoal } from '@/types'

interface GoalCardProps {
  goal: SavingsGoal
  onDelete: (id: number) => void
  onContribute: (goal: SavingsGoal) => void
}

function GoalCard({ goal, onDelete, onContribute }: GoalCardProps) {
  const percent = Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0)
  const remaining = goal.targetAmount - goal.currentAmount
  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="glass p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white text-lg">{goal.name}</h3>
          {goal.targetDate && (
            <p className="text-xs text-white/40 mt-0.5">
              {daysLeft !== null && daysLeft > 0
                ? `${daysLeft} jours restants · `
                : daysLeft !== null && daysLeft <= 0
                ? `Échéance dépassée · `
                : ''}
              Objectif: {formatDate(goal.targetDate)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onContribute(goal)}
            className="px-3 py-1.5 text-xs font-medium bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-all"
          >
            + Contribuer
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="px-2 py-1.5 text-xs text-white/30 hover:text-accent-red transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="font-mono text-accent-green font-semibold">{formatCurrency(goal.currentAmount)}</span>
          <span className="text-white/40">sur {formatCurrency(goal.targetAmount)}</span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: percent >= 100
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #6366f1, #818cf8)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={`font-semibold ${percent >= 100 ? 'text-accent-green' : 'text-primary-light'}`}>
            {percent.toFixed(1)}%
          </span>
          {remaining > 0 && (
            <span className="text-white/40">encore {formatCurrency(remaining)}</span>
          )}
          {remaining <= 0 && (
            <span className="text-accent-green font-semibold">✓ Objectif atteint !</span>
          )}
        </div>
      </div>
    </div>
  )
}

interface ContributeModalProps {
  goal: SavingsGoal
  onClose: () => void
  onSuccess: () => void
}

function ContributeModal({ goal, onClose, onSuccess }: ContributeModalProps) {
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { amount: '', date: new Date().toISOString().split('T')[0], note: '', isRecurring: false, frequency: 'monthly' },
  })
  const isRecurring = watch('isRecurring')

  const onSubmit = async (data: any) => {
    await api.post(`/api/goals/${goal.id}/contributions`, {
      amount: Number(data.amount),
      date: data.date,
      note: data.note || undefined,
      isRecurring: data.isRecurring,
      frequency: data.isRecurring ? data.frequency : undefined,
    })
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Contribuer — {goal.name}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Montant (€)</label>
              <input
                type="number" step="0.01" min="0.01"
                {...register('amount', { required: true, min: 0.01 })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                placeholder="500.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                {...register('date', { required: true })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Note (optionnel)</label>
            <input
              type="text"
              {...register('note')}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              placeholder="Prime, virement..."
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border">
            <input
              type="checkbox" id="isRecurring"
              {...register('isRecurring')}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="isRecurring" className="text-sm text-white/70 cursor-pointer">Contribution récurrente</label>
          </div>

          {isRecurring && (
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Fréquence</label>
              <select
                {...register('frequency')}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
                <option value="yearly">Annuelle</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-white/60 hover:text-white hover:border-white/20 text-sm transition-all">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-all shadow-glow disabled:opacity-50">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CreateGoalModalProps {
  onClose: () => void
  onSuccess: () => void
}

function CreateGoalModal({ onClose, onSuccess }: CreateGoalModalProps) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { name: '', targetAmount: '', targetDate: '' },
  })

  const onSubmit = async (data: any) => {
    await api.post('/api/goals', {
      name: data.name,
      targetAmount: Number(data.targetAmount),
      targetDate: data.targetDate || undefined,
    })
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nouvel objectif d'épargne</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Nom de l'objectif</label>
            <input
              type="text"
              {...register('name', { required: true })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              placeholder="Vacances, voiture, apport..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Montant cible (€)</label>
              <input
                type="number" step="0.01" min="1"
                {...register('targetAmount', { required: true, min: 1 })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Date cible (optionnel)</label>
              <input
                type="date"
                {...register('targetDate')}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-white/60 hover:text-white hover:border-white/20 text-sm transition-all">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-all shadow-glow disabled:opacity-50">
              {isSubmitting ? 'Création...' : 'Créer l\'objectif'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GoalsPage() {
  const { t } = useTranslation()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [contributeTarget, setContributeTarget] = useState<SavingsGoal | null>(null)

  const load = () => {
    api.get<SavingsGoal[]>('/api/goals').then(setGoals).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet objectif et toutes ses contributions ?')) return
    await api.delete(`/api/goals/${id}`)
    load()
  }

  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)

  return (
    <PageShell title={t('goals.title')}>
      {/* Summary banner */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="glass p-4 border border-primary/20 bg-primary/5">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Objectifs actifs</p>
            <p className="text-2xl font-bold text-primary-light font-mono">{goals.length}</p>
          </div>
          <div className="glass p-4 border border-accent-green/20 bg-accent-green/5">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total épargné</p>
            <p className="text-2xl font-bold text-accent-green font-mono tabular-nums">{formatCurrency(totalSaved)}</p>
          </div>
          <div className="glass p-4 border border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Progression globale</p>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">
              {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-lg transition-all shadow-glow"
        >
          + Nouvel objectif
        </button>
      </div>

      {/* Goals grid */}
      {goals.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-white/30 text-sm mb-4">Aucun objectif d'épargne pour l'instant.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 text-sm font-medium rounded-lg hover:bg-primary/30 transition-all"
          >
            Créer mon premier objectif
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={handleDelete}
              onContribute={setContributeTarget}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGoalModal onClose={() => setShowCreate(false)} onSuccess={load} />
      )}
      {contributeTarget && (
        <ContributeModal
          goal={contributeTarget}
          onClose={() => setContributeTarget(null)}
          onSuccess={load}
        />
      )}
    </PageShell>
  )
}
