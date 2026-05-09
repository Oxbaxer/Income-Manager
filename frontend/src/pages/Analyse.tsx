import { useEffect, useState, useCallback } from 'react'
import { api } from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageShell } from '@/components/layout/PageShell'
import type { Account } from '@/types'

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────
interface AnalysisTransaction {
  id: number
  date: string
  description: string
  amount: number
  subcategory?: string | null
  accountId?: number | null
}

interface CategoryResult {
  categoryId: number
  categoryName: string
  categoryColor: string
  categoryIcon: string
  total: number
  count: number
  transactions: AnalysisTransaction[]
}

// ────────────────────────────────────────────────────────────────────────────────
// Period helpers
// ────────────────────────────────────────────────────────────────────────────────
type PeriodKey = 'current-month' | '3m' | '6m' | '12m' | 'current-year' | 'custom'

function getPeriodDates(key: PeriodKey): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  switch (key) {
    case 'current-month': {
      const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
      return { from, to: today }
    }
    case '3m': {
      const d = new Date(now); d.setMonth(d.getMonth() - 3)
      return { from: d.toISOString().split('T')[0], to: today }
    }
    case '6m': {
      const d = new Date(now); d.setMonth(d.getMonth() - 6)
      return { from: d.toISOString().split('T')[0], to: today }
    }
    case '12m': {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1)
      return { from: d.toISOString().split('T')[0], to: today }
    }
    case 'current-year': {
      return { from: `${now.getFullYear()}-01-01`, to: today }
    }
    default:
      return { from: '', to: '' }
  }
}

const PERIOD_BUTTONS: { key: PeriodKey; label: string }[] = [
  { key: 'current-month', label: 'Mois en cours' },
  { key: '3m', label: '3 derniers mois' },
  { key: '6m', label: '6 derniers mois' },
  { key: '12m', label: '12 derniers mois' },
  { key: 'current-year', label: 'Année en cours' },
  { key: 'custom', label: 'Personnalisé' },
]

// ────────────────────────────────────────────────────────────────────────────────
// Category card
// ────────────────────────────────────────────────────────────────────────────────
function CategoryCard({ cat, grandTotal }: { cat: CategoryResult; grandTotal: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0

  return (
    <div className="glass border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: cat.categoryColor + '20', border: `1px solid ${cat.categoryColor}30` }}
        >
          {cat.categoryIcon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{cat.categoryName}</p>
            <p className="text-sm font-mono font-bold text-white ml-2 flex-shrink-0">
              {formatCurrency(cat.total)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: cat.categoryColor }}
              />
            </div>
            <span className="text-xs text-white/40 flex-shrink-0">{pct.toFixed(1)}%</span>
            <span className="text-xs text-white/30 flex-shrink-0">{cat.count} op.</span>
          </div>
        </div>

        <span className={`text-white/30 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border/50">
          {cat.transactions.map(tx => (
            <div
              key={tx.id}
              className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <div>
                <p className="text-xs text-white/80 leading-tight">{tx.description}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  {formatDate(tx.date)}
                  {tx.subcategory && ` · ${tx.subcategory}`}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-white/60 ml-4 flex-shrink-0">
                {formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// Analyse Page
// ────────────────────────────────────────────────────────────────────────────────
export function AnalysePage() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [period, setPeriod] = useState<PeriodKey>('current-month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [accountId, setAccountId] = useState<string>('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [data, setData] = useState<CategoryResult[]>([])
  const [loading, setLoading] = useState(false)

  // Load accounts for the filter
  useEffect(() => {
    api.get<Account[]>('/api/accounts').then(setAccounts).catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    const { from, to } = period === 'custom'
      ? { from: customFrom, to: customTo }
      : getPeriodDates(period)

    if (!from || !to) return

    setLoading(true)
    try {
      let url = `/api/analytics/categories?type=${tab}&from=${from}&to=${to}`
      if (accountId) url += `&accountId=${accountId}`
      const result = await api.get<CategoryResult[]>(url)
      setData(result)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [tab, period, customFrom, customTo, accountId])

  useEffect(() => { loadData() }, [loadData])

  const grandTotal = data.reduce((s, c) => s + c.total, 0)
  const totalCount = data.reduce((s, c) => s + c.count, 0)

  return (
    <PageShell title="Analyse">
      {/* Period selector */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {PERIOD_BUTTONS.map(pb => (
          <button
            key={pb.key}
            onClick={() => setPeriod(pb.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === pb.key
                ? 'bg-primary text-white shadow-glow'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {pb.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex items-center gap-3 mb-4">
          <div>
            <label className="block text-xs text-white/40 mb-1">Du</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Au</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-5">
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40">Compte :</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="">Tous les comptes</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        <button
          onClick={() => setTab('expense')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
            tab === 'expense'
              ? 'border-accent-red text-accent-red'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          Dépenses
        </button>
        <button
          onClick={() => setTab('income')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
            tab === 'income'
              ? 'border-accent-green text-accent-green'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          Revenus
        </button>
      </div>

      {/* Grand total bar */}
      {!loading && data.length > 0 && (
        <div className={`glass p-4 border mb-4 ${tab === 'expense' ? 'border-accent-red/20 bg-accent-red/5' : 'border-accent-green/20 bg-accent-green/5'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider">
                Total {tab === 'expense' ? 'dépenses' : 'revenus'}
              </p>
              <p className={`text-2xl font-bold font-mono tabular-nums mt-1 ${tab === 'expense' ? 'text-accent-red' : 'text-accent-green'}`}>
                {formatCurrency(grandTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">{totalCount} opération{totalCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-white/40 mt-1">{data.length} catégorie{data.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center text-white/30 py-16">Chargement…</div>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{tab === 'expense' ? '📉' : '📈'}</p>
          <p className="text-white/40 text-sm">Aucune donnée pour cette période</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map(cat => (
            <CategoryCard key={cat.categoryId} cat={cat} grandTotal={grandTotal} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
