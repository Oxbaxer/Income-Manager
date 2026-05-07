import { ReactNode } from 'react'
import i18n from '@/i18n'

interface PageShellProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function PageShell({ title, action, children }: PageShellProps) {

  function toggleLocale() {
    const next = i18n.language === 'fr' ? 'en' : 'fr'
    i18n.changeLanguage(next)
    localStorage.setItem('locale', next)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-1/50 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLocale}
            className="text-xs font-medium text-white/40 hover:text-white transition-colors px-2 py-1 rounded border border-border hover:border-border-hover"
          >
            {i18n.language === 'fr' ? 'EN' : 'FR'}
          </button>
          {action}
        </div>
      </header>
      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
