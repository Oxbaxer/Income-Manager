import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string
}

export function Badge({ color = '#6366f1', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
      {...props}
    >
      {children}
    </span>
  )
}
