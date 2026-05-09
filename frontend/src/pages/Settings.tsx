import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import type { User, ExpenseCategory, IncomeCategory, Account } from '@/types'

// ────────────────────────────────────────────────────────────────────────────────
// CSV types
// ────────────────────────────────────────────────────────────────────────────────
interface CsvRow {
  date: string
  libelleSimple: string
  libelleOperation: string
  reference: string
  typeOperation: string
  categorie: string
  sousCategorie: string
  debit: string
  credit: string
}

interface PreviewRow {
  date: string
  libelle: string
  type: string
  categorie: string
  sousCategorie: string
  montant: number
  isCredit: boolean
}

// Normalize a string: lowercase + strip accents (so "Catégorie" matches "categorie")
function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Parse latin-1 encoded CSV text
function parseCsvText(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 2) return []

  // Detect header line
  const headerLine = lines[0]
  const cols = headerLine.split(';').map(c => c.replace(/"/g, '').trim())
  const colsNorm = cols.map(norm)

  const idxDate = colsNorm.findIndex(c => c.includes('date'))
  const idxLibSimple = colsNorm.findIndex(c => c.includes('libelle simplifie') || c.includes('libelle simplifi'))
  const idxLibOp = colsNorm.findIndex(c => c.includes('libelle operation') || (c.includes('libelle') && !c.includes('simplifi')))
  const idxRef = colsNorm.findIndex(c => c.includes('reference'))
  const idxInfo = colsNorm.findIndex(c => c.includes('information'))
  const idxType = colsNorm.findIndex(c => c.includes('type'))
  const idxCat = colsNorm.findIndex(c => c.includes('categorie') && !c.includes('sous'))
  const idxSousCat = colsNorm.findIndex(c => c.includes('sous'))
  const idxDebit = colsNorm.findIndex(c => c.includes('debit'))
  const idxCredit = colsNorm.findIndex(c => c.includes('credit'))

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(';').map(c => c.replace(/^"|"$/g, '').trim())
    if (cells.length < 2) continue
    rows.push({
      date: idxDate >= 0 ? (cells[idxDate] ?? '') : '',
      libelleSimple: idxLibSimple >= 0 ? (cells[idxLibSimple] ?? '') : '',
      libelleOperation: idxLibOp >= 0 ? (cells[idxLibOp] ?? '') : '',
      reference: idxRef >= 0 ? (cells[idxRef] ?? '') : (idxInfo >= 0 ? (cells[idxInfo] ?? '') : ''),
      typeOperation: idxType >= 0 ? (cells[idxType] ?? '') : '',
      categorie: idxCat >= 0 ? (cells[idxCat] ?? '') : '',
      sousCategorie: idxSousCat >= 0 ? (cells[idxSousCat] ?? '') : '',
      debit: idxDebit >= 0 ? (cells[idxDebit] ?? '') : '',
      credit: idxCredit >= 0 ? (cells[idxCredit] ?? '') : '',
    })
  }
  return rows
}

function parseAmount(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  return parseFloat(raw.replace(/\s/g, '').replace('+', '').replace('-', '').replace(',', '.')) || 0
}

function formatDisplayDate(raw: string): string {
  const parts = raw.trim().split('/')
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`
  return raw
}

// ────────────────────────────────────────────────────────────────────────────────
// ImportCsvModal
// ────────────────────────────────────────────────────────────────────────────────
function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({}) // csvCat -> 'CREATE' or 'existing name'
  const [result, setResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
    skippedDetails?: { date: string; description: string; amount: number; reason: string }[]
    skippedCounts?: Record<string, number>
  } | null>(null)
  const [showSkippedDetails, setShowSkippedDetails] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing categories on mount
  useEffect(() => {
    Promise.all([
      api.get<ExpenseCategory[]>('/api/expenses/categories'),
      api.get<IncomeCategory[]>('/api/income/categories'),
      api.get<Account[]>('/api/accounts').catch(() => [] as Account[]),
    ]).then(([ec, ic, accs]) => {
      setExpenseCategories(ec)
      setIncomeCategories(ic)
      setAccounts(accs)
    }).catch(() => {})
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const buf = ev.target?.result as ArrayBuffer
      const bytes = new Uint8Array(buf)
      // Auto-detect encoding: UTF-8 BOM (EF BB BF) → UTF-8, otherwise ISO-8859-1
      // Note: TextDecoder('utf-8') strips the BOM automatically, so do NOT slice.
      let text: string
      if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        text = new TextDecoder('utf-8').decode(buf)
      } else {
        text = new TextDecoder('iso-8859-1').decode(buf)
      }
      // Defensive: strip any remaining leading BOM in case decoder didn't.
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      const parsed = parseCsvText(text)
      if (parsed.length === 0) {
        setFileError('Aucune ligne trouvée dans le fichier CSV.')
        return
      }
      setRows(parsed)

      // Build preview rows
      const preview: PreviewRow[] = parsed
        .map(r => {
          const credit = parseAmount(r.credit)
          const debit = parseAmount(r.debit)
          return {
            date: formatDisplayDate(r.date),
            libelle: r.libelleSimple || r.libelleOperation,
            type: r.typeOperation,
            categorie: r.categorie,
            sousCategorie: r.sousCategorie,
            montant: credit > 0 ? credit : debit,
            isCredit: credit > 0,
          }
        })
      setPreviewRows(preview)
      setStep(2)
    }
    reader.readAsArrayBuffer(file)
  }

  function goToMapping() {
    // Find unknown categories
    const allKnownExpense = new Set(expenseCategories.map(c => c.name.toLowerCase()))
    const allKnownIncome = new Set(incomeCategories.map(c => c.name.toLowerCase()))

    const unknownCats = new Set<string>()
    for (const r of rows) {
      const cat = r.categorie.trim()
      if (!cat) continue
      const credit = parseAmount(r.credit)
      const isCredit = credit > 0
      const knownSet = isCredit ? allKnownIncome : allKnownExpense
      if (!knownSet.has(cat.toLowerCase())) {
        unknownCats.add(cat)
      }
    }

    if (unknownCats.size === 0) {
      setStep(4)
      return
    }

    // Pre-populate with CREATE
    const mapping: Record<string, string> = {}
    for (const cat of unknownCats) {
      mapping[cat] = 'CREATE'
    }
    setCategoryMapping(mapping)
    setStep(3)
  }

  async function doImport() {
    setImporting(true)
    try {
      // Apply category mapping: replace categorie in rows before sending
      const mappedRows: CsvRow[] = rows.map(r => {
        const cat = r.categorie.trim()
        if (cat && categoryMapping[cat] && categoryMapping[cat] !== 'CREATE') {
          return { ...r, categorie: categoryMapping[cat] }
        }
        return r
      })

      const res = await api.post<{ imported: number; skipped: number; errors: string[] }>('/api/import/csv', {
        rows: mappedRows,
        accountId: selectedAccountId ? parseInt(selectedAccountId) : undefined,
      })
      setResult(res)
    } catch (e: any) {
      setResult({ imported: 0, skipped: 0, errors: [e?.message || 'Erreur inconnue'] })
    } finally {
      setImporting(false)
    }
  }

  const nonExcludedCount = rows.filter(r => r.date || r.libelleSimple).length

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Importer CSV bancaire</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {step === 1 && 'Étape 1 / 4 — Choisir le fichier'}
              {step === 2 && 'Étape 2 / 4 — Prévisualisation'}
              {step === 3 && 'Étape 3 / 4 — Mapping des catégories'}
              {step === 4 && (result ? 'Terminé' : 'Étape 4 / 4 — Confirmation')}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        {/* Step 1 — File upload */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Sélectionnez un fichier CSV exporté depuis votre banque. Le fichier doit être séparé par <code className="bg-surface-2 px-1 rounded text-primary">;</code> et encodé en latin-1.
            </p>
            {accounts.length > 0 && (
              <div>
                <label className="block text-xs text-white/50 mb-1">Importer dans le compte (optionnel)</label>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">— Aucun compte —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm text-white/60">Cliquer pour choisir un fichier <strong>.csv</strong></p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {fileError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{fileError}</p>}
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Preview */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              <span className="text-white font-medium">{previewRows.length}</span> transactions à importer
              {rows.length > previewRows.length && (
                <span className="text-white/40"> ({rows.length - previewRows.length} exclues)</span>
              )}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left px-3 py-2 text-white/40 font-medium">Date</th>
                    <th className="text-left px-3 py-2 text-white/40 font-medium">Libellé</th>
                    <th className="text-left px-3 py-2 text-white/40 font-medium">Type</th>
                    <th className="text-left px-3 py-2 text-white/40 font-medium">Catégorie</th>
                    <th className="text-left px-3 py-2 text-white/40 font-medium">Sous-cat.</th>
                    <th className="text-right px-3 py-2 text-white/40 font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-white/2">
                      <td className="px-3 py-2 text-white/60 font-mono">{r.date}</td>
                      <td className="px-3 py-2 text-white/80 max-w-[180px] truncate">{r.libelle}</td>
                      <td className="px-3 py-2 text-white/50">{r.type}</td>
                      <td className="px-3 py-2 text-white/60">{r.categorie}</td>
                      <td className="px-3 py-2 text-white/40">{r.sousCategorie}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${r.isCredit ? 'text-accent-green' : 'text-accent-red'}`}>
                        {r.isCredit ? '+' : '−'}{r.montant.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 10 && (
                <p className="text-xs text-white/30 text-center py-2">… et {previewRows.length - 10} autres lignes</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors">
                Retour
              </button>
              <button onClick={goToMapping} className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-all">
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Category mapping */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Ces catégories du CSV n'existent pas encore dans l'application. Choisissez comment les mapper.
            </p>
            <div className="space-y-3">
              {Object.keys(categoryMapping).map(csvCat => (
                <div key={csvCat} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white font-medium block truncate">{csvCat}</span>
                    <span className="text-xs text-white/40">Catégorie du CSV</span>
                  </div>
                  <div className="text-white/30 text-lg">→</div>
                  <select
                    value={categoryMapping[csvCat]}
                    onChange={e => setCategoryMapping(prev => ({ ...prev, [csvCat]: e.target.value }))}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="CREATE">✨ Créer la catégorie "{csvCat}"</option>
                    <optgroup label="Catégories dépenses">
                      {expenseCategories.map(c => (
                        <option key={`e-${c.id}`} value={c.name}>{c.icon} {c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Catégories revenus">
                      {incomeCategories.map(c => (
                        <option key={`i-${c.id}`} value={c.name}>{c.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors">
                Retour
              </button>
              <button onClick={() => setStep(4)} className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-all">
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Confirmation / Result */}
        {step === 4 && (
          <div className="space-y-4">
            {!result ? (
              <>
                <div className="p-4 bg-surface-2 rounded-lg border border-border">
                  <p className="text-sm text-white mb-2">Prêt à importer</p>
                  <p className="text-sm text-white/60">
                    <span className="font-semibold text-white">{nonExcludedCount}</span> transactions seront importées
                    {rows.length - nonExcludedCount > 0 && (
                      <span className="text-white/40"> ({rows.length - nonExcludedCount} lignes exclues ignorées)</span>
                    )}
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setStep(Object.keys(categoryMapping).length > 0 ? 3 : 2)} className="px-4 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors">
                    Retour
                  </button>
                  <button
                    onClick={doImport}
                    disabled={importing}
                    className="px-5 py-2 rounded-lg bg-accent-green/20 text-accent-green border border-accent-green/30 text-sm font-medium hover:bg-accent-green/30 transition-all disabled:opacity-50"
                  >
                    {importing ? '⏳ Import en cours...' : `📥 Importer ${nonExcludedCount} transactions`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`p-4 rounded-lg border ${result.errors.length > 0 ? 'bg-yellow-400/10 border-yellow-400/30' : 'bg-accent-green/10 border-accent-green/30'}`}>
                  <p className="text-sm font-semibold text-white mb-2">Import terminé</p>
                  <p className="text-sm text-white/70">
                    ✅ <span className="font-medium text-accent-green">{result.imported}</span> transaction(s) importée(s)
                  </p>
                  <p className="text-sm text-white/50">
                    ⏭ {result.skipped} ignorée(s)
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-400">⚠ {e}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skipped recap */}
                {result.skipped > 0 && result.skippedCounts && (
                  <div className="p-4 rounded-lg border border-border bg-surface-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">Récap des transactions ignorées</p>
                      <button
                        onClick={() => setShowSkippedDetails(v => !v)}
                        className="text-xs text-primary hover:text-primary-light"
                      >
                        {showSkippedDetails ? 'Masquer le détail' : 'Voir le détail'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(result.skippedCounts).map(([reason, count]) => (
                        <div key={reason} className="flex items-center justify-between text-xs">
                          <span className="text-white/60">{reason}</span>
                          <span className="text-white/40 font-mono">{count}</span>
                        </div>
                      ))}
                    </div>

                    {showSkippedDetails && result.skippedDetails && result.skippedDetails.length > 0 && (
                      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border/50">
                        <table className="w-full text-xs">
                          <thead className="bg-surface sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Date</th>
                              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Libellé</th>
                              <th className="text-right px-2 py-1.5 text-white/40 font-medium">Montant</th>
                              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Raison</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.skippedDetails.map((s, i) => (
                              <tr key={i} className="border-t border-border/30">
                                <td className="px-2 py-1.5 text-white/60 font-mono">{s.date || '—'}</td>
                                <td className="px-2 py-1.5 text-white/70 max-w-[180px] truncate" title={s.description}>{s.description || '—'}</td>
                                <td className="px-2 py-1.5 text-right text-white/60 font-mono">{s.amount > 0 ? s.amount.toFixed(2) : '—'}</td>
                                <td className="px-2 py-1.5 text-white/50">{s.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <button onClick={onClose} className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-all">
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

interface InviteForm {
  name: string
  email: string
  password: string
  role: 'admin' | 'member'
}

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<InviteForm>({
    defaultValues: { role: 'member' },
  })
  const [serverError, setServerError] = useState('')

  const onSubmit = async (data: InviteForm) => {
    setServerError('')
    try {
      await api.post('/api/users', data)
      onCreated()
      onClose()
    } catch (e: any) {
      setServerError(e?.error?.message || e?.message || 'Erreur lors de la création')
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">Inviter un membre</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Nom</label>
            <input
              {...register('name', { required: true })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
              placeholder="Prénom Nom"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">Requis</p>}
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Email</label>
            <input
              {...register('email', { required: true })}
              type="email"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
              placeholder="email@exemple.fr"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">Email invalide</p>}
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Mot de passe</label>
            <input
              {...register('password', { required: true, minLength: 8 })}
              type="password"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
              placeholder="8 caractères minimum"
            />
            {errors.password && <p className="text-xs text-red-400 mt-1">8 caractères minimum</p>}
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Rôle</label>
            <select
              {...register('role')}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            >
              <option value="member">Membre</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          {serverError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{serverError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-white/50 hover:text-white transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-all disabled:opacity-50">
              {isSubmitting ? 'Création...' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// CategoriesSection
// ────────────────────────────────────────────────────────────────────────────────

const PRESET_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6']

function CategoriesSection() {
  const [tab, setTab] = useState<'expenses' | 'income'>('expenses')
  const [expenseCats, setExpenseCats] = useState<ExpenseCategory[]>([])
  const [incomeCats, setIncomeCats] = useState<IncomeCategory[]>([])
  const [loading, setLoading] = useState(true)

  // New category form state
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [newExpenseName, setNewExpenseName] = useState('')
  const [newExpenseIcon, setNewExpenseIcon] = useState('💰')
  const [newExpenseColor, setNewExpenseColor] = useState('#6366f1')
  const [savingExpense, setSavingExpense] = useState(false)

  const [showNewIncome, setShowNewIncome] = useState(false)
  const [newIncomeName, setNewIncomeName] = useState('')
  const [savingIncome, setSavingIncome] = useState(false)

  // Rename state
  const [renamingExpenseId, setRenamingExpenseId] = useState<number | null>(null)
  const [renameExpenseValue, setRenameExpenseValue] = useState('')
  const [renameExpenseIcon, setRenameExpenseIcon] = useState('')
  const [renameExpenseColor, setRenameExpenseColor] = useState('')

  const [renamingIncomeId, setRenamingIncomeId] = useState<number | null>(null)
  const [renameIncomeValue, setRenameIncomeValue] = useState('')

  // Error messages
  const [deleteError, setDeleteError] = useState('')

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const [ec, ic] = await Promise.all([
        api.get<ExpenseCategory[]>('/api/expenses/categories'),
        api.get<IncomeCategory[]>('/api/income/categories'),
      ])
      setExpenseCats(ec)
      setIncomeCats(ic)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // ── Expense handlers ──

  const handleCreateExpense = async () => {
    if (!newExpenseName.trim()) return
    setSavingExpense(true)
    try {
      await api.post('/api/expenses/categories', { name: newExpenseName.trim(), icon: newExpenseIcon, color: newExpenseColor })
      setNewExpenseName('')
      setNewExpenseIcon('💰')
      setNewExpenseColor('#6366f1')
      setShowNewExpense(false)
      await fetchCategories()
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Erreur lors de la création')
    } finally {
      setSavingExpense(false)
    }
  }

  const startRenameExpense = (cat: ExpenseCategory) => {
    setRenamingExpenseId(cat.id)
    setRenameExpenseValue(cat.name)
    setRenameExpenseIcon(cat.icon ?? '💰')
    setRenameExpenseColor(cat.color ?? '#6366f1')
    setDeleteError('')
  }

  const handleRenameExpense = async (id: number) => {
    if (!renameExpenseValue.trim()) return
    try {
      await api.patch(`/api/expenses/categories/${id}`, { name: renameExpenseValue.trim(), icon: renameExpenseIcon, color: renameExpenseColor })
      setRenamingExpenseId(null)
      await fetchCategories()
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Erreur lors du renommage')
    }
  }

  const handleDeleteExpense = async (id: number) => {
    setDeleteError('')
    if (!confirm('Supprimer cette catégorie ?')) return
    try {
      await api.delete(`/api/expenses/categories/${id}`)
      await fetchCategories()
    } catch (e: any) {
      setDeleteError(e?.error || e?.message || 'Impossible de supprimer cette catégorie')
    }
  }

  // ── Income handlers ──

  const handleCreateIncome = async () => {
    if (!newIncomeName.trim()) return
    setSavingIncome(true)
    try {
      await api.post('/api/income/categories', { name: newIncomeName.trim() })
      setNewIncomeName('')
      setShowNewIncome(false)
      await fetchCategories()
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Erreur lors de la création')
    } finally {
      setSavingIncome(false)
    }
  }

  const startRenameIncome = (cat: IncomeCategory) => {
    setRenamingIncomeId(cat.id)
    setRenameIncomeValue(cat.name)
    setDeleteError('')
  }

  const handleRenameIncome = async (id: number) => {
    if (!renameIncomeValue.trim()) return
    try {
      await api.patch(`/api/income/categories/${id}`, { name: renameIncomeValue.trim() })
      setRenamingIncomeId(null)
      await fetchCategories()
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Erreur lors du renommage')
    }
  }

  const handleDeleteIncome = async (id: number) => {
    setDeleteError('')
    if (!confirm('Supprimer cette catégorie ?')) return
    try {
      await api.delete(`/api/income/categories/${id}`)
      await fetchCategories()
    } catch (e: any) {
      setDeleteError(e?.error || e?.message || 'Impossible de supprimer cette catégorie')
    }
  }

  if (loading) return <div className="text-sm text-white/40 py-4 text-center">Chargement...</div>

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
        <button
          onClick={() => { setTab('expenses'); setDeleteError('') }}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'expenses' ? 'bg-surface text-white shadow' : 'text-white/40 hover:text-white'}`}
        >
          Dépenses
        </button>
        <button
          onClick={() => { setTab('income'); setDeleteError('') }}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'income' ? 'bg-surface text-white shadow' : 'text-white/40 hover:text-white'}`}
        >
          Revenus
        </button>
      </div>

      {deleteError && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2.5">{deleteError}</p>
      )}

      {/* Expense categories */}
      {tab === 'expenses' && (
        <div className="space-y-2">
          {expenseCats.length === 0 && (
            <p className="text-sm text-white/40 text-center py-2">Aucune catégorie de dépense</p>
          )}
          {expenseCats.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 p-3 bg-surface-2 rounded-lg border border-border">
              {renamingExpenseId === cat.id ? (
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {/* Emoji icon */}
                  <input
                    value={renameExpenseIcon}
                    onChange={e => setRenameExpenseIcon(e.target.value)}
                    className="w-12 bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-primary/50"
                    maxLength={4}
                  />
                  {/* Name */}
                  <input
                    autoFocus
                    value={renameExpenseValue}
                    onChange={e => setRenameExpenseValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameExpense(cat.id); if (e.key === 'Escape') setRenamingExpenseId(null) }}
                    className="flex-1 min-w-[100px] bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                  />
                  {/* Color swatches */}
                  <div className="flex gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setRenameExpenseColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${renameExpenseColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleRenameExpense(cat.id)} className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/30 transition-all">
                      ✓
                    </button>
                    <button onClick={() => setRenamingExpenseId(null)} className="px-2.5 py-1 rounded-lg border border-border text-xs text-white/40 hover:text-white transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${cat.color}22` }}
                  >
                    {cat.icon}
                  </span>
                  <span className="flex-1 text-sm text-white font-medium truncate">{cat.name}</span>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startRenameExpense(cat)}
                      className="p-1.5 rounded-lg border border-border text-white/40 hover:text-primary hover:border-primary/30 transition-all text-xs"
                      title="Renommer"
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(cat.id)}
                      className="p-1.5 rounded-lg border border-border text-white/40 hover:text-red-400 hover:border-red-400/30 transition-all text-xs"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* New expense category form */}
          {showNewExpense ? (
            <div className="p-3 bg-surface-2 rounded-lg border border-primary/20 space-y-3">
              <div className="flex gap-2">
                <input
                  value={newExpenseIcon}
                  onChange={e => setNewExpenseIcon(e.target.value)}
                  className="w-12 bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-primary/50"
                  maxLength={4}
                  placeholder="💰"
                />
                <input
                  autoFocus
                  value={newExpenseName}
                  onChange={e => setNewExpenseName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateExpense(); if (e.key === 'Escape') setShowNewExpense(false) }}
                  placeholder="Nom de la catégorie"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Couleur :</span>
                <div className="flex gap-1.5 flex-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewExpenseColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${newExpenseColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowNewExpense(false); setNewExpenseName('') }} className="px-3 py-1.5 rounded-lg border border-border text-xs text-white/40 hover:text-white transition-colors">
                  Annuler
                </button>
                <button onClick={handleCreateExpense} disabled={savingExpense || !newExpenseName.trim()} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/30 transition-all disabled:opacity-50">
                  {savingExpense ? '...' : 'Créer'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewExpense(true)}
              className="w-full py-2 rounded-lg border border-dashed border-border text-sm text-white/40 hover:text-white hover:border-primary/40 transition-all"
            >
              + Nouvelle catégorie
            </button>
          )}
        </div>
      )}

      {/* Income categories */}
      {tab === 'income' && (
        <div className="space-y-2">
          {incomeCats.length === 0 && (
            <p className="text-sm text-white/40 text-center py-2">Aucune catégorie de revenu</p>
          )}
          {incomeCats.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 p-3 bg-surface-2 rounded-lg border border-border">
              {renamingIncomeId === cat.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    value={renameIncomeValue}
                    onChange={e => setRenameIncomeValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameIncome(cat.id); if (e.key === 'Escape') setRenamingIncomeId(null) }}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                  />
                  <div className="flex gap-1.5">
                    <button onClick={() => handleRenameIncome(cat.id)} className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/30 transition-all">
                      ✓
                    </button>
                    <button onClick={() => setRenamingIncomeId(null)} className="px-2.5 py-1 rounded-lg border border-border text-xs text-white/40 hover:text-white transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center text-accent-green text-sm flex-shrink-0">💵</span>
                  <span className="flex-1 text-sm text-white font-medium truncate">{cat.name}</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startRenameIncome(cat)}
                      className="p-1.5 rounded-lg border border-border text-white/40 hover:text-primary hover:border-primary/30 transition-all text-xs"
                      title="Renommer"
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => handleDeleteIncome(cat.id)}
                      className="p-1.5 rounded-lg border border-border text-white/40 hover:text-red-400 hover:border-red-400/30 transition-all text-xs"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* New income category form */}
          {showNewIncome ? (
            <div className="p-3 bg-surface-2 rounded-lg border border-primary/20 space-y-2">
              <input
                autoFocus
                value={newIncomeName}
                onChange={e => setNewIncomeName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateIncome(); if (e.key === 'Escape') setShowNewIncome(false) }}
                placeholder="Nom de la catégorie"
                className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowNewIncome(false); setNewIncomeName('') }} className="px-3 py-1.5 rounded-lg border border-border text-xs text-white/40 hover:text-white transition-colors">
                  Annuler
                </button>
                <button onClick={handleCreateIncome} disabled={savingIncome || !newIncomeName.trim()} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/30 transition-all disabled:opacity-50">
                  {savingIncome ? '...' : 'Créer'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewIncome(true)}
              className="w-full py-2 rounded-lg border border-dashed border-border text-sm text-white/40 hover:text-white hover:border-primary/40 transition-all"
            >
              + Nouvelle catégorie
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function MembersSection() {
  const { user: me } = useAuthStore()
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<User[]>('/api/users')
      setMembers(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce membre ? Cette action est irréversible.')) return
    setDeletingId(id)
    try {
      await api.delete(`/api/users/${id}`)
      setMembers(m => m.filter(u => u.id !== id))
    } catch (e: any) {
      alert(e?.error || 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleRole = async (member: User) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    setTogglingId(member.id)
    try {
      await api.patch(`/api/users/${member.id}/role`, { role: newRole })
      setMembers(m => m.map(u => u.id === member.id ? { ...u, role: newRole } : u))
    } catch (e: any) {
      alert(e?.error || 'Erreur lors du changement de rôle')
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) return <div className="text-sm text-white/40 py-4 text-center">Chargement...</div>

  return (
    <>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={fetchMembers} />}
      <div className="space-y-2">
        {members.map(member => (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">{member.name}</span>
                {member.id === me?.id && <span className="text-xs text-white/30">(vous)</span>}
              </div>
              <span className="text-xs text-white/40 truncate block">{member.email}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
              member.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface-3 text-white/50'
            }`}>
              {member.role === 'admin' ? 'Admin' : 'Membre'}
            </span>
            {member.id !== me?.id && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleToggleRole(member)}
                  disabled={togglingId === member.id}
                  title={member.role === 'admin' ? 'Rétrograder en membre' : 'Promouvoir admin'}
                  className="p-1.5 rounded-lg border border-border text-white/40 hover:text-primary hover:border-primary/30 transition-all disabled:opacity-40 text-xs"
                >
                  {togglingId === member.id ? '⏳' : member.role === 'admin' ? '↓' : '↑'}
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  disabled={deletingId === member.id}
                  title="Supprimer ce membre"
                  className="p-1.5 rounded-lg border border-border text-white/40 hover:text-red-400 hover:border-red-400/30 transition-all disabled:opacity-40 text-xs"
                >
                  {deletingId === member.id ? '⏳' : '✕'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => setShowInvite(true)}
        className="mt-3 w-full py-2 rounded-lg border border-dashed border-border text-sm text-white/40 hover:text-white hover:border-primary/40 transition-all"
      >
        + Inviter un membre
      </button>
    </>
  )
}

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [exporting, setExporting] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [showImportCsv, setShowImportCsv] = useState(false)
  const [exportAccounts, setExportAccounts] = useState<Account[]>([])
  const [exportAccountId, setExportAccountId] = useState<string>('')
  const [resetAccountId, setResetAccountId] = useState<number | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<string>('')
  const [wipeAllOpen, setWipeAllOpen] = useState(false)
  const [wipeAllConfirm, setWipeAllConfirm] = useState('')

  useEffect(() => {
    api.get<Account[]>('/api/accounts').then(setExportAccounts).catch(() => {})
  }, [])

  const handleResetAccount = async () => {
    if (!resetAccountId) return
    setResetting(true)
    setResetResult('')
    try {
      const res = await api.post<{ deletedIncome: number; deletedExpenses: number }>(`/api/accounts/${resetAccountId}/reset`, {})
      setResetResult(`✅ ${res.deletedIncome} revenu(s) et ${res.deletedExpenses} dépense(s) supprimés.`)
      // Refresh accounts list (balances changed)
      api.get<Account[]>('/api/accounts').then(setExportAccounts).catch(() => {})
    } catch (e: any) {
      setResetResult(`❌ ${e?.error || e?.message || 'Erreur lors de la réinitialisation'}`)
    } finally {
      setResetting(false)
    }
  }

  const closeResetModal = () => {
    setResetAccountId(null)
    setResetResult('')
  }

  const handleWipeAll = async () => {
    setResetting(true)
    setResetResult('')
    try {
      const res = await api.post<{ deletedIncome: number; deletedExpenses: number }>('/api/accounts/reset-all-transactions', {})
      setResetResult(`✅ ${res.deletedIncome} revenu(s) et ${res.deletedExpenses} dépense(s) supprimés (toutes transactions confondues, y compris celles sans compte).`)
      setWipeAllConfirm('')
    } catch (e: any) {
      setResetResult(`❌ ${e?.error || e?.message || 'Erreur'}`)
    } finally {
      setResetting(false)
    }
  }

  const closeWipeAll = () => {
    setWipeAllOpen(false)
    setWipeAllConfirm('')
    setResetResult('')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const tokens = api.getTokens()
      const accountParam = exportAccountId ? `?accountId=${exportAccountId}` : ''
      const res = await fetch(`/api/export${accountParam}`, {
        headers: { Authorization: `Bearer ${tokens?.access}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `income-manager-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  const handleExportCsv = async () => {
    setExportingCsv(true)
    try {
      const tokens = api.getTokens()
      const accountParam = exportAccountId ? `?accountId=${exportAccountId}` : ''
      const res = await fetch(`/api/export/csv${accountParam}`, {
        headers: { Authorization: `Bearer ${tokens?.access}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `income-manager-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setExportingCsv(false)
    }
  }

  const switchLocale = async (locale: 'fr' | 'en') => {
    i18n.changeLanguage(locale)
    localStorage.setItem('locale', locale)
    if (user) {
      await api.patch(`/api/users/${user.id}/locale`, { locale }).catch(() => {})
    }
  }

  return (
    <PageShell title={t('settings.title')}>
      {showImportCsv && <ImportCsvModal onClose={() => setShowImportCsv(false)} />}
      <div className="max-w-2xl space-y-5">
        {/* Langue */}
        <Card>
          <CardTitle className="mb-4">Langue / Language</CardTitle>
          <div className="flex gap-3">
            {(['fr', 'en'] as const).map(locale => (
              <button
                key={locale}
                onClick={() => switchLocale(locale)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  i18n.language === locale
                    ? 'bg-primary/20 text-primary border-primary/40 shadow-glow'
                    : 'border-border text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                {locale === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </Card>

        {/* Gestion des membres (admin seulement) */}
        {user?.role === 'admin' && (
          <Card>
            <CardTitle className="mb-4">Membres du foyer</CardTitle>
            <MembersSection />
          </Card>
        )}

        {/* Catégories */}
        <Card>
          <CardTitle className="mb-4">Catégories</CardTitle>
          <CategoriesSection />
        </Card>

        {/* Export / Import */}
        <Card>
          <CardTitle className="mb-4">Export / Import</CardTitle>
          <div className="space-y-4">
            {exportAccounts.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                <span className="text-xs text-white/50 flex-shrink-0">Filtrer l'export par compte :</span>
                <select
                  value={exportAccountId}
                  onChange={e => setExportAccountId(e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="">Tous les comptes</option>
                  {exportAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-start justify-between gap-4 p-4 bg-surface-2 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-white mb-1">Exporter les données (JSON)</p>
                <p className="text-xs text-white/40">Télécharge toutes vos transactions, objectifs et scénarios au format JSON (sauvegarde complète).</p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-shrink-0 px-4 py-2 bg-accent-green/20 text-accent-green border border-accent-green/30 rounded-lg text-sm font-medium hover:bg-accent-green/30 transition-all disabled:opacity-50"
              >
                {exporting ? '⏳ Export...' : '⬇ Exporter JSON'}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 bg-surface-2 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-white mb-1">Exporter les transactions (CSV)</p>
                <p className="text-xs text-white/40">Télécharge revenus + dépenses au format CSV réimportable (compatible avec l'import CSV de l'application).</p>
              </div>
              <button
                onClick={handleExportCsv}
                disabled={exportingCsv}
                className="flex-shrink-0 px-4 py-2 bg-accent-green/20 text-accent-green border border-accent-green/30 rounded-lg text-sm font-medium hover:bg-accent-green/30 transition-all disabled:opacity-50"
              >
                {exportingCsv ? '⏳ Export...' : '⬇ Exporter CSV'}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 bg-surface-2 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-white mb-1">Importer un CSV</p>
                <p className="text-xs text-white/40">Importez des transactions depuis un fichier CSV bancaire ou un CSV exporté depuis cette application.</p>
              </div>
              <button
                onClick={() => setShowImportCsv(true)}
                className="flex-shrink-0 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm font-medium hover:bg-primary/30 transition-all"
              >
                📥 Importer CSV
              </button>
            </div>
          </div>
        </Card>

        {/* Zone de danger */}
        <Card className="border-accent-red/20">
          <CardTitle className="mb-2 text-accent-red">⚠ Zone de danger</CardTitle>

          {/* Per-account reset */}
          {exportAccounts.length > 0 && (
            <>
              <p className="text-xs text-white/40 mb-3">
                Supprime <strong>toutes les transactions</strong> (revenus + dépenses) liées à un compte spécifique.
                Le compte et son solde de départ sont conservés.
              </p>
              <div className="space-y-2 mb-5">
                {exportAccounts.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{a.icon}</span>
                      <span className="text-sm text-white font-medium truncate">{a.name}</span>
                    </div>
                    <button
                      onClick={() => setResetAccountId(a.id)}
                      className="flex-shrink-0 px-3 py-1.5 bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-lg text-xs font-medium hover:bg-accent-red/20 transition-all"
                    >
                      🗑 Réinitialiser
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Global wipe */}
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs text-white/40 mb-3">
              <strong className="text-white/70">Tout réinitialiser</strong> — supprime <strong>absolument toutes les transactions</strong> (revenus + dépenses), y compris celles non liées à un compte (importées avant que la notion de compte n'existe). Les comptes et catégories restent.
            </p>
            <button
              onClick={() => setWipeAllOpen(true)}
              className="px-4 py-2 bg-accent-red/15 text-accent-red border border-accent-red/40 rounded-lg text-sm font-medium hover:bg-accent-red/25 transition-all"
            >
              🔥 Tout réinitialiser (toutes transactions)
            </button>
          </div>
        </Card>

        {/* Account info */}
        <Card>
          <CardTitle className="mb-4">Compte</CardTitle>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-white/50">Nom</span>
              <span className="text-sm text-white font-medium">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-white/50">Email</span>
              <span className="text-sm text-white font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-white/50">Rôle</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                user?.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface-3 text-white/50'
              }`}>
                {user?.role === 'admin' ? 'Administrateur' : 'Membre'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Global wipe confirmation modal */}
      <Modal
        open={wipeAllOpen}
        onClose={closeWipeAll}
        title="⚠ Tout réinitialiser"
      >
        <div className="space-y-4">
          {!resetResult ? (
            <>
              <p className="text-white/80">
                Vous êtes sur le point de supprimer <strong className="text-accent-red">absolument toutes les transactions</strong>
                {' '}(revenus + dépenses), y compris celles sans compte associé.
              </p>
              <p className="text-sm text-white/50">
                Les comptes, catégories et objectifs sont conservés. Cette action est <strong>irréversible</strong>.
              </p>
              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Pour confirmer, tapez <code className="bg-surface-2 px-1.5 py-0.5 rounded text-accent-red">SUPPRIMER</code> ci-dessous :
                </label>
                <input
                  type="text"
                  value={wipeAllConfirm}
                  onChange={e => setWipeAllConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-red"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={closeWipeAll} disabled={resetting}>Annuler</Button>
                <Button
                  variant="danger"
                  onClick={handleWipeAll}
                  loading={resetting}
                  disabled={wipeAllConfirm !== 'SUPPRIMER'}
                >
                  Tout supprimer
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-white/80">{resetResult}</p>
              <div className="flex justify-end pt-2">
                <Button onClick={closeWipeAll}>Fermer</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Reset account confirmation modal */}
      <Modal
        open={resetAccountId !== null}
        onClose={closeResetModal}
        title="Réinitialiser le compte"
      >
        {(() => {
          const acc = exportAccounts.find(a => a.id === resetAccountId)
          if (!acc) return null
          return (
            <div className="space-y-4">
              {!resetResult ? (
                <>
                  <p className="text-white/80">
                    Vous êtes sur le point de supprimer <strong className="text-accent-red">toutes les transactions</strong>
                    {' '}(revenus + dépenses) liées au compte <strong className="text-white">{acc.icon} {acc.name}</strong>.
                  </p>
                  <p className="text-sm text-white/50">
                    Le compte et son solde de départ resteront. Cette action est <strong>irréversible</strong>.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={closeResetModal} disabled={resetting}>Annuler</Button>
                    <Button variant="danger" onClick={handleResetAccount} loading={resetting}>
                      Tout supprimer
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/80">{resetResult}</p>
                  <div className="flex justify-end pt-2">
                    <Button onClick={closeResetModal}>Fermer</Button>
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </Modal>
    </PageShell>
  )
}
