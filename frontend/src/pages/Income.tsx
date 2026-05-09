import { useEffect, useState, useCallback } from 'react'
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
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const LIMIT = 20

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0], isPayslip: false },
  })

  const isPayslip = watch('isPayslip')
  const operationType = watch('operationType')

  const loadData = useCallback(async () => {
    const [res, cats, accs] = await Promise.all([
      api.get<PaginatedResponse<IncomeTransaction>>(`/api/income?page=${page}&limit=${LIMIT}`),
      api.get<IncomeCategory[]>('/api/income/categories'),
      api.get<Account[]>('/api/accounts').catch(() => [] as Account[]),
    ])
    setTransactions(res.data)
    setTotal(res.total)
    setTotalPages(Math.ceil(res.total / LIMIT))
    setCategories(cats)
    setAccounts(accs)
  }, [page])

  useEffect(() => { loadData() }, [loadData])

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
    setModalOpen(false)
    loadData()
  }

  async function onDelete() {
    if (!deleteId) return
    await api.delete(`/api/income/${deleteId}`)
    setDeleteId(null)
    loadData()
  }

  return (
    <PageShell
      title={t('income.title')}
      action={<Button onClick={openCreate} size="sm">+ {t('income.add')}</Button>}
    >
      {/* Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">
          {total} {total > 1 ? 'transactions' : 'transaction'}
        </p>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.date')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.category')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.description')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">{t('income.amount')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-white/30">{t('common.noData')}</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="border-b border-border/50 hover:bg-white/2 transition-colors">
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
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-accent-red" onClick={() => setDeleteId(tx.id)}>🗑️</Button>
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

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? t('income.edit') : t('income.add')}
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
          {accounts.length > 0 && (
            <Select label="Compte (optionnel)" {...register('accountId')}>
              <option value="">— Aucun compte —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </Select>
          )}

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

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('common.confirm')}>
        <p className="text-white/70 mb-6">Supprimer cette transaction ?</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onDelete}>{t('common.delete')}</Button>
        </div>
      </Modal>
    </PageShell>
  )
}
