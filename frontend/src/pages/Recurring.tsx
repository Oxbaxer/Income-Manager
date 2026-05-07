import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { api } from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardTitle } from '@/components/ui/Card'
import type { RecurringRule, IncomeCategory, ExpenseCategory } from '@/types'

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuelle',
  yearly: 'Annuelle',
}

interface RuleModalProps {
  rule?: RecurringRule | null
  incomeCategories: IncomeCategory[]
  expenseCategories: ExpenseCategory[]
  onClose: () => void
  onSuccess: () => void
}

function RuleModal({ rule, incomeCategories, expenseCategories, onClose, onSuccess }: RuleModalProps) {
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      type: rule?.type ?? 'expense',
      amount: rule?.amount?.toString() ?? '',
      categoryId: rule?.categoryId?.toString() ?? '',
      description: rule?.description ?? '',
      frequency: rule?.frequency ?? 'monthly',
      startDate: rule?.startDate ?? new Date().toISOString().split('T')[0],
      endDate: rule?.endDate ?? '',
    },
  })
  const type = watch('type')
  const categories = type === 'income' ? incomeCategories : expenseCategories

  const onSubmit = async (data: any) => {
    const payload = {
      type: data.type,
      amount: Number(data.amount),
      categoryId: Number(data.categoryId),
      description: data.description,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
    }
    if (rule) {
      await api.patch(`/api/recurring/${rule.id}`, payload)
    } else {
      await api.post('/api/recurring', payload)
    }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {rule ? 'Modifier la règle' : 'Nouvelle règle récurrente'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['income', 'expense'] as const).map(t => (
              <label key={t} className={`flex-1 text-center py-2 text-sm font-medium cursor-pointer transition-all ${
                watch('type') === t ? (t === 'income' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red') : 'text-white/40'
              }`}>
                <input type="radio" value={t} {...register('type')} className="sr-only" />
                {t === 'income' ? 'Revenu' : 'Dépense'}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Montant (€)</label>
              <input
                type="number" step="0.01" min="0.01"
                {...register('amount', { required: true, min: 0.01 })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
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
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Catégorie</label>
            <select
              {...register('categoryId', { required: true })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="">Sélectionner...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{('icon' in c) ? `${(c as ExpenseCategory).icon} ` : ''}{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Description</label>
            <input
              type="text"
              {...register('description', { required: true })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              placeholder="Loyer, abonnement Netflix..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Date de début</label>
              <input
                type="date"
                {...register('startDate', { required: true })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">Date de fin (optionnel)</label>
              <input
                type="date"
                {...register('endDate')}
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
              {isSubmitting ? 'Enregistrement...' : (rule ? 'Mettre à jour' : 'Créer la règle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RecurringPage() {
  const { t } = useTranslation()
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [editingRule, setEditingRule] = useState<RecurringRule | null | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)

  const load = () => {
    api.get<RecurringRule[]>('/api/recurring').then(setRules).catch(() => {})
  }

  useEffect(() => {
    load()
    api.get<IncomeCategory[]>('/api/income/categories').then(setIncomeCategories).catch(() => {})
    api.get<ExpenseCategory[]>('/api/expenses/categories').then(setExpenseCategories).catch(() => {})
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette règle récurrente ?')) return
    await api.delete(`/api/recurring/${id}`)
    load()
  }

  const handleToggle = async (rule: RecurringRule) => {
    await api.patch(`/api/recurring/${rule.id}`, { isActive: !rule.isActive })
    load()
  }

  const openCreate = () => { setEditingRule(null); setShowModal(true) }
  const openEdit = (rule: RecurringRule) => { setEditingRule(rule); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingRule(undefined) }

  const active = rules.filter(r => r.isActive)
  const inactive = rules.filter(r => !r.isActive)

  return (
    <PageShell title={t('recurring.title')}>
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-lg transition-all shadow-glow"
        >
          + Nouvelle règle
        </button>
      </div>

      {rules.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-white/30 text-sm mb-4">Aucune règle récurrente configurée.</p>
          <button onClick={openCreate} className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 text-sm rounded-lg hover:bg-primary/30 transition-all">
            Créer ma première règle
          </button>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <Card className="p-0 overflow-hidden mb-4">
              <div className="px-5 py-4 border-b border-border">
                <CardTitle>Actives ({active.length})</CardTitle>
              </div>
              <RuleList rules={active} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
            </Card>
          )}
          {inactive.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <CardTitle className="text-white/50">Inactives ({inactive.length})</CardTitle>
              </div>
              <RuleList rules={inactive} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
            </Card>
          )}
        </>
      )}

      {showModal && (
        <RuleModal
          rule={editingRule}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          onClose={closeModal}
          onSuccess={load}
        />
      )}
    </PageShell>
  )
}

function RuleList({ rules, onEdit, onDelete, onToggle }: {
  rules: RecurringRule[]
  onEdit: (r: RecurringRule) => void
  onDelete: (id: number) => void
  onToggle: (r: RecurringRule) => void
}) {
  return (
    <div>
      {rules.map(rule => (
        <div key={rule.id} className={`flex items-center justify-between px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors ${!rule.isActive ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              rule.type === 'income' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'
            }`}>
              {rule.type === 'income' ? '↑' : '↓'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{rule.description}</p>
              <p className="text-xs text-white/40 mt-0.5">
                {rule.categoryName} · {FREQ_LABELS[rule.frequency]} · Prochain: {formatDate(rule.nextDueDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono font-semibold tabular-nums ${rule.type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
              {rule.type === 'income' ? '+' : '−'}{formatCurrency(rule.amount)}
            </span>
            <button onClick={() => onToggle(rule)} title={rule.isActive ? 'Désactiver' : 'Activer'}
              className={`w-8 h-8 rounded-lg text-xs transition-all ${rule.isActive ? 'bg-accent-green/10 text-accent-green hover:bg-accent-red/10 hover:text-accent-red' : 'bg-surface-2 text-white/30 hover:bg-accent-green/10 hover:text-accent-green'}`}>
              {rule.isActive ? '●' : '○'}
            </button>
            <button onClick={() => onEdit(rule)} className="text-xs text-white/30 hover:text-primary transition-colors px-1">✎</button>
            <button onClick={() => onDelete(rule.id)} className="text-xs text-white/30 hover:text-accent-red transition-colors px-1">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
