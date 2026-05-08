import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardTitle } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import type { User } from '@/types'

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

  const handleExport = async () => {
    setExporting(true)
    try {
      const tokens = api.getTokens()
      const res = await fetch('/api/export', {
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

  const switchLocale = async (locale: 'fr' | 'en') => {
    i18n.changeLanguage(locale)
    localStorage.setItem('locale', locale)
    if (user) {
      await api.patch(`/api/users/${user.id}/locale`, { locale }).catch(() => {})
    }
  }

  return (
    <PageShell title={t('settings.title')}>
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

        {/* Export / Import */}
        <Card>
          <CardTitle className="mb-4">Export / Import</CardTitle>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 bg-surface-2 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-white mb-1">Exporter les données</p>
                <p className="text-xs text-white/40">Télécharge toutes vos transactions, objectifs et scénarios au format JSON.</p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-shrink-0 px-4 py-2 bg-accent-green/20 text-accent-green border border-accent-green/30 rounded-lg text-sm font-medium hover:bg-accent-green/30 transition-all disabled:opacity-50"
              >
                {exporting ? '⏳ Export...' : '⬇ Exporter JSON'}
              </button>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg border border-border">
              <p className="text-xs text-white/30 leading-relaxed">
                L'import de données n'est pas encore disponible dans cette version. Vous pouvez exporter vos données pour les sauvegarder.
              </p>
            </div>
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
    </PageShell>
  )
}
