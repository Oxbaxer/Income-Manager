import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { IncomeTransaction, IncomeCategory, PaginatedResponse, Account } from '@/types'

const OPERATION_TYPES = ['Carte bancaire', 'Virement', 'Prelevement', "Retrait d'especes", 'Frais bancaires', 'Autre']

const schema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.coerce.number().int().positive(),
  description: z.string().min(1),
  notes: z.string().optional(),
  isPayslip: z.boolean().default(false),
  accountId: z.coerce.number().int().positive().optional().nullable(),
  grossAmount: z.coerce.number().optional(),
  netAmount: z.coerce.number().optional(),
  contributions: z.coerce.number().optional(),
  bonuses: z.coerce.number().optional(),
  employerName: z.string().optional(),
  periodLabel: z.string().optional(),
  operationType: z.string().optional(),
  operationTypeCustom: z.string().optional(),
  subcategory: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function IncomePage() {
  const { t } = useTranslation()
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([])
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filterAccountId, setFilterAccountId] = useState<string>('')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [recategorizeOpen, setRecategorizeOpen] = useState(false)
  const [recategorizeTargetId, setRecategorizeTargetId] = useState<string>('')
  const [recategorizing, setRecategorizing] = useState(false)
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editQueue, setEditQueue] = useState<number[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[] | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const LIMIT = 20

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const allVisible = transactions.map(t => t.id)
      const allSelected = allVisible.length > 0 && allVisible.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        for (const id of allVisible) next.delete(id)
      } else {
        for (const id of allVisible) next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  async function confirmDelete() {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return
    setBulkDeleting(true)
    try {
      await api.post('/api/income/bulk-delete', { ids: pendingDeleteIds })
      if (pendingDeleteIds.some(id => selectedIds.has(id))) {
        setSelectedIds(prev => {
          const next = new Set(prev)
          for (const id of pendingDeleteIds) next.delete(id)
          return next
        })
      }
      setPendingDeleteIds(null)
      setRefreshKey(k => k + 1)
    } finally {
      setBulkDeleting(false)
    }
  }

  function startSequentialEdit() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setEditQueue(ids)
    const firstId = ids[0]
    const tx = transactions.find(t => t.id === firstId)
    if (tx) openEdit(tx)
  }

  function buildFilterQuery(): string {
    const params = new URLSearchParams()
    if (filterAccountId) params.set('accountId', filterAccountId)
    if (filterCategoryId) params.set('categoryId', filterCategoryId)
    return params.toString()
  }

  async function selectAllFiltered() {
    setSelectingAllFiltered(true)
    try {
      const qs = buildFilterQuery()
      const res = await api.get<{ ids: number[] }>(`/api/income/all-ids${qs ? `?${qs}` : ''}`)
      setSelectedIds(new Set(res.ids))
    } finally {
      setSelectingAllFiltered(false)
    }
  }

  async function applyRecategorize() {
    if (!recategorizeTargetId || selectedIds.size === 0) return
    setRecategorizing(true)
    try {
      await api.post('/api/income/bulk-update', {
        ids: Array.from(selectedIds),
        data: { categoryId: parseInt(recategorizeTargetId) },
      })
      setRecategorizeOpen(false)
      setRecategorizeTargetId('')
      clearSelection()
      setRefreshKey(k => k + 1)
    } finally {
      setRecategorizing(false)
    }
  }

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0], isPayslip: false },
  })

  const isPayslip = watch('isPayslip')
  const operationType = watch('operationType')

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (filterAccountId) params.set('accountId', filterAccountId)
    if (filterCategoryId) params.set('categoryId', filterCategoryId)
    Promise.all([
      api.get<PaginatedResponse<IncomeTransaction>>(`/api/income?${params.toString()}`),
      api.get<IncomeCategory[]>('/api/income/categories'),
      api.get<Account[]>('/api/accounts').catch(() => [] as Account[]),
    ]).then(([res, cats, accs]) => {
      setTransactions(res.data)
      setTotal(res.total)
      setTotalPages(Math.ceil(res.total / LIMIT))
      setCategories(cats)
      setAccounts(accs)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterAccountId, filterCategoryId, refreshKey])

  function openCreate() { reset({ date: new Date().toISOString().split('T')[0], isPayslip: false }); setEditId(null); setModalOpen(true) }

  async function openEdit(tx: IncomeTransaction) {
    const isCustom = !!tx.operationType && !OPERATION_TYPES.includes(tx.operationType)
    reset({
      amount: tx.amount,
      date: tx.date,
      categoryId: tx.categoryId,
      description: tx.description,
      notes: tx.notes ?? '',
      isPayslip: tx.isPayslip,
      operationType: isCustom ? 'Personnaliser' : (tx.operationType ?? ''),
      operationTypeCustom: isCustom ? tx.operationType : '',
      subcategory: tx.subcategory ?? '',
      accountId: tx.accountId ?? null,
    })
    setEditId(tx.id)
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    const { grossAmount, netAmount, contributions, bonuses, employerName, periodLabel, isPayslip, operationTypeCustom, subcategory, accountId, ...rest } = data
    const finalOperationType = data.operationType === 'Personnaliser'
      ? operationTypeCustom
      : data.operationType
    const payload: any = {
      ...rest,
      isPayslip,
      subcategory: subcategory || undefined,
      operationType: finalOperationType || undefined,
      accountId: accountId || undefined,
    }
    if (isPayslip && grossAmount && netAmount) {
      payload.payslip = { grossAmount, netAmount, contributions: contributions ?? 0, bonuses: bonuses ?? 0, employerName, periodLabel }
    }
    if (editId) {
      await api.put(`/api/income/${editId}`, payload)
    } else {
      await api.post('/api/income', payload)
    }
    // Sequential edit: pop next from queue
    if (editQueue.length > 1) {
      const remaining = editQueue.slice(1)
      setEditQueue(remaining)
      const res = await api.get<PaginatedResponse<IncomeTransaction>>(`/api/income?page=${page}&limit=${LIMIT}${filterAccountId ? `&accountId=${filterAccountId}` : ''}`)
      setTransactions(res.data)
      const nextTx = res.data.find(t => t.id === remaining[0])
      if (nextTx) {
        openEdit(nextTx)
        return
      }
    }
    setEditQueue([])
    setModalOpen(false)
    setRefreshKey(k => k + 1)
  }

  return (
    <PageShell
      title={t('income.title')}
      action={<Button onClick={openCreate} size="sm">+ {t('income.add')}</Button>}
    >
      {/* Summary + filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <p className="text-sm text-white/50 flex-1">
          {total} {total > 1 ? 'transactions' : 'transaction'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Catégorie :</span>
          <select
            value={filterCategoryId}
            onChange={e => { setFilterCategoryId(e.target.value); setPage(1) }}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 max-w-[220px]"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Compte :</span>
            <select
              value={filterAccountId}
              onChange={e => { setFilterAccountId(e.target.value); setPage(1) }}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
            >
              <option value="">Tous les comptes</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              <option value="null">— Sans compte —</option>
            </select>
          </div>
        )}
      </div>

      {/* Select-all-filtered banner */}
      {(filterCategoryId || filterAccountId) && total > transactions.length && (
        <div className="mb-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-white/70">
            {selectedIds.size > 0 && transactions.every(t => selectedIds.has(t.id)) ? (
              <>Toutes les transactions visibles sont sélectionnées (<strong>{transactions.length}</strong>). Pour sélectionner les <strong>{total}</strong> transactions correspondant au filtre :</>
            ) : (
              <>Le filtre actuel correspond à <strong>{total}</strong> transactions, dont <strong>{transactions.length}</strong> sont visibles sur cette page.</>
            )}
          </p>
          <button
            onClick={selectAllFiltered}
            disabled={selectingAllFiltered}
            className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/30 transition-all disabled:opacity-50 flex-shrink-0"
          >
            {selectingAllFiltered ? '⏳ Sélection...' : `Sélectionner les ${total}`}
          </button>
        </div>
      )}

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                    checked={transactions.length > 0 && transactions.every(t => selectedIds.has(t.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.date')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.category')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.description')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.amount')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-white/30">{t('common.noData')}</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className={`border-b border-border/50 hover:bg-white/2 transition-colors ${selectedIds.has(tx.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-white/60 font-mono text-xs">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-accent-green/10 text-accent-green border border-accent-green/20">
                      {tx.categoryName}
                    </span>
                    {tx.isPayslip && <span className="ml-1 text-xs text-white/30">📄</span>}
                  </td>
                  <td className="px-4 py-3 text-white/80">{tx.description}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-accent-green">
                    +{formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(tx)}>✏️</Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-accent-red" onClick={() => setPendingDeleteIds([tx.id])}>🗑️</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</Button>
            <span className="text-sm text-white/50">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</Button>
          </div>
        )}
      </Card>

      {/* Floating action bar for multi-select */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface border border-border rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-sm text-white">
            <strong>{selectedIds.size}</strong> sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => setRecategorizeOpen(true)}>🏷️ Recatégoriser</Button>
          <Button variant="ghost" size="sm" onClick={startSequentialEdit}>✏️ Éditer</Button>
          <Button variant="danger" size="sm" onClick={() => setPendingDeleteIds(Array.from(selectedIds))}>🗑️ Supprimer</Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>Annuler</Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditQueue([]) }}
        title={editQueue.length > 1 ? `${t('income.edit')} (${editQueue.length} restantes)` : (editId ? t('income.edit') : t('income.add'))}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('income.amount')} type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
            <Input label={t('income.date')} type="date" error={errors.date?.message} {...register('date')} />
          </div>
          <Select label={t('income.category')} error={errors.categoryId?.message} {...register('categoryId')}>
            <option value="">—</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label={t('income.description')} placeholder="Salaire mai 2026" error={errors.description?.message} {...register('description')} />
          <Textarea label={t('income.notes')} placeholder="Notes optionnelles..." {...register('notes')} />
          <Select label="Type d'opération (optionnel)" {...register('operationType')}>
            <option value="">—</option>
            {OPERATION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="Personnaliser">Personnaliser...</option>
          </Select>
          {operationType === 'Personnaliser' && (
            <Input label="Type personnalisé" placeholder="Ex: Chèque" {...register('operationTypeCustom')} />
          )}
          <Input label="Sous-catégorie (optionnel)" placeholder="Ex: Salaire mensuel" {...register('subcategory')} />
          <div>
            <Select label="Compte (optionnel)" {...register('accountId')}>
              <option value="">— Aucun compte —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </Select>
            {accounts.length === 0 && (
              <p className="text-xs text-white/30 mt-1">
                Aucun compte créé.{' '}
                <a href="/comptes" className="text-primary hover:underline">Créer un compte →</a>
              </p>
            )}
          </div>

          {/* Payslip toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-primary" {...register('isPayslip')} />
            <span className="text-sm text-white/70">{t('income.isPayslip')}</span>
          </label>

          {isPayslip && (
            <div className="space-y-4 p-4 rounded-lg bg-surface-2 border border-border">
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('income.payslip.gross')} type="number" step="0.01" {...register('grossAmount')} />
                <Input label={t('income.payslip.net')} type="number" step="0.01" {...register('netAmount')} />
                <Input label={t('income.payslip.contributions')} type="number" step="0.01" {...register('contributions')} />
                <Input label={t('income.payslip.bonuses')} type="number" step="0.01" {...register('bonuses')} />
              </div>
              <Input label={t('income.payslip.employer')} {...register('employerName')} />
              <Input label={t('income.payslip.period')} placeholder="Mai 2026" {...register('periodLabel')} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={isSubmitting}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Recategorize modal */}
      <Modal
        open={recategorizeOpen}
        onClose={() => !recategorizing && setRecategorizeOpen(false)}
        title="Recatégoriser la sélection"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Affecter une nouvelle catégorie à <strong className="text-white">{selectedIds.size}</strong> transaction{selectedIds.size > 1 ? 's' : ''}.
          </p>
          <Select
            label="Nouvelle catégorie"
            value={recategorizeTargetId}
            onChange={e => setRecategorizeTargetId(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRecategorizeOpen(false)} disabled={recategorizing}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={applyRecategorize}
              loading={recategorizing}
              disabled={!recategorizeTargetId}
            >
              Appliquer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm (unifié — single + bulk) */}
      <Modal open={pendingDeleteIds !== null} onClose={() => !bulkDeleting && setPendingDeleteIds(null)} title={t('common.confirm')}>
        <p className="text-white/70 mb-6">
          {pendingDeleteIds && pendingDeleteIds.length === 1
            ? 'Supprimer cette transaction ?'
            : <>Supprimer <strong className="text-white">{pendingDeleteIds?.length}</strong> transactions ? Cette action est irréversible.</>}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setPendingDeleteIds(null)} disabled={bulkDeleting}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={confirmDelete} loading={bulkDeleting}>{t('common.delete')}</Button>
        </div>
      </Modal>
    </PageShell>
  )
}
