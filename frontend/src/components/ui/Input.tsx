import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-white/60 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30',
            'focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all',
            error && 'border-accent-red/50 focus:border-accent-red/70',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-accent-red">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-white/60 uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white',
            'focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all',
            error && 'border-accent-red/50',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-accent-red">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-white/60 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none',
            'focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all',
            error && 'border-accent-red/50',
            className
          )}
          rows={3}
          {...props}
        />
        {error && <p className="text-xs text-accent-red">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
