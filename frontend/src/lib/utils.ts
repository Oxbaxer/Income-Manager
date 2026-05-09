export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(date: string, locale = 'fr-FR'): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

export function formatMonth(yearMonth: string, locale = 'fr-FR'): string {
  if (!yearMonth) return '—'
  const [year, month] = yearMonth.split('-')
  if (!year || !month) return '—'
  const d = new Date(+year, +month - 1)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d)
}
