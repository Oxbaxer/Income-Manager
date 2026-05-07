export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(date: string, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatMonth(yearMonth: string, locale = 'fr-FR'): string {
  const [year, month] = yearMonth.split('-')
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(+year, +month - 1))
}
