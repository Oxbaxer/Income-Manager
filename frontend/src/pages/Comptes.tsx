import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Account, Transfer } from '@/types'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Courant' },
  { value: 'savings', label: 'Épargne' },
  { value: 'investment', label: 'Investissement' },
  { value: 'cash', label: 'Espèces' },
]

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4',
]

// ────────────────────────────────────────────────────────────────────────────────
// Account Modal
// ────────────────────────────────────────────────────────────────────────────────
function AccountModal({
  onClose,
  onSaved,
  existing,
}: {
  onClose: () => void
  onSaved: () => void
  existing?: Account | null
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<Account['type']>(existing?.type ?? 'checking')
  const [startingBalance, setStartingBalance] = useState(existing?.startingBalance?.toString() ?? '0')
  const [color, setColor] = useState(existing?.color ?? '#6366f1')
  const [icon, setIcon] = useState(existing?.icon ?? '🏦')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Le nom est requis.'); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        type,
        startingBalance: parseFloat(startingBalance) || 0,
        color,
        icon,
      }
      if (existing) {
        await api.patch(`/api/accounts/${existing.id}`, payload)
      } else {
        await api.post('/api/accounts', payload)
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {existing ? 'Modifier le compte' : 'Nouveau compte'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Nom</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
              placeholder="Mon compte courant"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as Account['type'])}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Solde de départ (€)</label>
            <input
              type="number"
              step="0.01"
              value={startingBalance}
              onChange={e => setStartingBalance(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Icône (emoji)</label>
            <input
              value={icon}
              onChange={e => setIcon(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
              placeholder="🏦"
              maxLength={4}
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-2">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_SWATCHES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : (existing ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// Transfer Modal
// ────────────────────────────────────────────────────────────────────────────────
function TransferModal({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: Account[]
  onClose: () => void
  onSaved: () => void
}) {
  const [fromAccountId, setFromAccountId] = useState<string>(accounts[0]?.id.toString() ?? '')
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id.toString() ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) { setError('Sélectionnez les comptes.'); return }
    if (fromAccountId === toAccountId) { setError('Les comptes doivent être différents.'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Montant invalide.'); return }
    setSaving(true)
    try {
      await api.post('/api/transfers', {
        fromAccountId: parseInt(fromAccountId),
        toAccountId: parseInt(toAccountId),
        amount: parseFloat(amount),
        date,
        description: description || undefined,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du virement.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nouveau virement</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Compte source</label>
            <select
              value={fromAccountId}
              onChange={e => setFromAccountId(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Compte destination</label>
            <select
              value={toAccountId}
              onChange={e => setToAccountId(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Montant (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Description (optionnel)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
              placeholder="Virement épargne mensuel"
            />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Envoi…' : 'Effectuer le virement'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// Account type labels
// ────────────────────────────────────────────────────────────────────────────────
function typeLabel(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type
}

// ────────────────────────────────────────────────────────────────────────────────
// Comptes Page
// ────────────────────────────────────────────────────────────────────────────────
export function ComptesPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [accountModal, setAccountModal] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [transferModal, setTransferModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Account | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [accs, trs] = await Promise.all([
        api.get<Account[]>('/api/accounts'),
        api.get<Transfer[]>('/api/transfers'),
      ])
      setAccounts(accs)
      setTransfers(trs)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDeleteAccount(acc: Account) {
    setDeleteError('')
    try {
      await api.delete(`/api/accounts/${acc.id}`)
      setDeleteConfirm(null)
      loadData()
    } catch (e: any) {
      setDeleteError(e?.message || 'Erreur lors de la suppression.')
    }
  }

  async function handleDeleteTransfer(id: number) {
    try {
      await api.delete(`/api/transfers/${id}`)
      loadData()
    } catch {}
  }

  const totalAssets = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <PageShell
      title="Mes Comptes"
      action={
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setEditAccount(null); setAccountModal(true) }}>+ Compte</Button>
          {accounts.length >= 2 && (
            <Button size="sm" onClick={() => setTransferModal(true)}>↔ Virement</Button>
          )}
        </div>
      }
    >
      {/* Total assets hero */}
      <div className="glass p-5 border border-primary/20 bg-primary/5 mb-5 animate-fade-in">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Patrimoine total</p>
        <p className={`text-3xl font-bold font-mono tabular-nums ${totalAssets >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {formatCurrency(totalAssets)}
        </p>
        <p className="text-xs text-white/40 mt-1">{accounts.length} compte{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="text-center text-white/30 py-16">Chargement…</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏦</p>
          <p className="text-white/40 text-sm mb-4">Aucun compte configuré</p>
          <Button size="sm" onClick={() => { setEditAccount(null); setAccountModal(true) }}>+ Créer un compte</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {accounts.map(acc => (
            <div
              key={acc.id}
              className="glass p-5 border border-border hover:border-white/10 transition-all"
              style={{ borderLeft: `3px solid ${acc.color}` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{acc.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{acc.name}</p>
                    <p className="text-xs text-white/40">{typeLabel(acc.type)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditAccount(acc); setAccountModal(true) }}
                    className="text-white/30 hover:text-white/70 transition-colors p-1 text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(acc); setDeleteError('') }}
                    className="text-white/30 hover:text-accent-red transition-colors p-1 text-xs"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className={`text-2xl font-bold font-mono tabular-nums ${acc.balance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {formatCurrency(acc.balance)}
              </p>
              <p className="text-xs text-white/30 mt-1">Solde de départ : {formatCurrency(acc.startingBalance)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent transfers */}
      {transfers.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-white">Virements récents</h3>
          </div>
          <div>
            {transfers.slice(0, 10).map(tr => (
              <div
                key={tr.id}
                className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">↔</div>
                  <div>
                    <p className="text-sm font-medium text-white leading-tight">
                      {tr.fromAccountName} → {tr.toAccountName}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {tr.description ?? 'Virement'} · {formatDate(tr.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-semibold tabular-nums text-primary">
                    {formatCurrency(tr.amount)}
                  </span>
                  <button
                    onClick={() => handleDeleteTransfer(tr.id)}
                    className="text-white/20 hover:text-accent-red transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Account create/edit modal */}
      {accountModal && (
        <AccountModal
          existing={editAccount}
          onClose={() => { setAccountModal(false); setEditAccount(null) }}
          onSaved={loadData}
        />
      )}

      {/* Transfer modal */}
      {transferModal && (
        <TransferModal
          accounts={accounts}
          onClose={() => setTransferModal(false)}
          onSaved={loadData}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Supprimer le compte</h3>
            <p className="text-sm text-white/60 mb-4">
              Supprimer <strong>{deleteConfirm.name}</strong> ? Cette action est irréversible.
            </p>
            {deleteError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded mb-3">{deleteError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError('') }}
                className="px-4 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteAccount(deleteConfirm)}
                className="px-4 py-2 rounded-lg bg-accent-red/80 text-white text-sm font-medium hover:bg-accent-red transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageShell>
  )
}
