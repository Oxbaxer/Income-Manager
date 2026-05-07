import { useTranslation } from 'react-i18next'
import { PageShell } from '@/components/layout/PageShell'

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <PageShell title={t(titleKey)}>
      <div className="flex flex-col items-center justify-center h-64 text-white/20">
        <p className="text-4xl mb-3">🚧</p>
        <p className="text-sm">Phase 2 — bientôt disponible</p>
      </div>
    </PageShell>
  )
}
