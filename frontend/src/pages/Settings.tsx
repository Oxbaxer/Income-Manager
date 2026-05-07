import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardTitle } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'

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
